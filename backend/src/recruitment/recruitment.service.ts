import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Role, Prisma } from '@prisma/client';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import {
  UPLOADS_ROOT,
  PRIVATE_UPLOADS_ROOT,
} from '../common/config/upload.config.js';
import { CreateCandidateProfileDto } from './dto/create-candidate-profile.dto.js';
import { CreateEmployerRequestDto } from './dto/create-employer-request.dto.js';
import { CreateEmployerPostingDto } from './dto/create-employer-posting.dto.js';
import { CreateJobApplicationDto } from './dto/create-job-application.dto.js';
import { CreateJobPostingDto } from './dto/create-job-posting.dto.js';
import { UpdateJobPostingDto } from './dto/update-job-posting.dto.js';
import { CreateCandidateIntroductionRequestDto } from './dto/create-candidate-introduction-request.dto.js';
import { ReviewCandidateIntroductionRequestDto } from './dto/review-candidate-introduction-request.dto.js';

/** Trạng thái CandidateIntroductionRequest coi là "đã được duyệt xem thông tin liên hệ ứng viên". */
const APPROVED_INTRODUCTION_STATUS = 'APPROVED';
/** TTL cache Redis cho các danh sách công khai — xem giải thích chung ở RedisService.getOrSet. */
const LISTING_CACHE_TTL_SECONDS = 60;

@Injectable()
export class RecruitmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // `cvUrl` (nếu có) phải là path thật do chính server tạo ra qua POST candidates/cv-upload —
  // không tin path client tự khai (mới sửa cùng đợt với applyJob's cvUrl để tránh khai path tùy ý).
  private assertValidCvPath(cvUrl?: string) {
    if (!cvUrl) return;
    const cvsDir = join(PRIVATE_UPLOADS_ROOT, 'cvs');
    if (!cvUrl.startsWith(cvsDir) || !fs.existsSync(cvUrl)) {
      throw new BadRequestException(
        'cvUrl không hợp lệ — vui lòng tải CV qua bước upload trước.',
      );
    }
  }

  // 1. Candidate Profiles (Tạo hồ sơ ứng viên từng bước) — userId lấy từ JWT của người
  // đăng nhập (route yêu cầu @Roles(Role.MEMBER)), không tin dữ liệu userId từ client.
  async createCandidateProfile(dto: CreateCandidateProfileDto, userId: string) {
    // Trước đây không kiểm tra trùng — mỗi lần user bấm "sửa" (thực chất là submit lại wizard)
    // lại tạo thêm 1 CandidateProfile mới, để lại rác không có cách xóa/hợp nhất. Giờ chặn tạo
    // mới nếu đã có hồ sơ, hướng dẫn dùng PATCH candidates/me để sửa hồ sơ hiện có.
    const existing = await this.prisma.candidateProfile.findFirst({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException(
        'Bạn đã có hồ sơ ứng viên — vui lòng sửa hồ sơ hiện có thay vì tạo mới.',
      );
    }
    this.assertValidCvPath(dto.cvUrl);

    const { experiences, educations, references, ...profileData } = dto;

    // findFirst-rồi-create ở trên không atomic — 2 request gần như đồng thời (double-click) có
    // thể cùng vượt qua check trước khi request kia kịp insert. Ràng buộc @@unique([userId]) ở
    // schema chặn triệt để ở tầng DB; bắt P2002 ở đây để trả về đúng thông báo thân thiện thay vì
    // lỗi 500 thô khi race thực sự xảy ra.
    try {
      return await this.prisma.candidateProfile.create({
        data: {
          ...profileData,
          userId,
          experiences:
            experiences && experiences.length > 0
              ? {
                  create: experiences.map((exp) => ({
                    company: exp.company,
                    position: exp.position,
                    startDate: exp.startDate ? new Date(exp.startDate) : null,
                    endDate: exp.endDate ? new Date(exp.endDate) : null,
                    salary: exp.salary,
                    description: exp.description,
                  })),
                }
              : undefined,
          educations:
            educations && educations.length > 0
              ? {
                  create: educations.map((edu) => ({
                    degree: edu.degree,
                    school: edu.school,
                    major: edu.major,
                    grade: edu.grade,
                    gradYear: edu.gradYear,
                  })),
                }
              : undefined,
          references:
            references && references.length > 0
              ? {
                  create: references.map((ref) => ({
                    fullName: ref.fullName,
                    company: ref.company,
                    position: ref.position,
                    phone: ref.phone,
                  })),
                }
              : undefined,
        },
        include: {
          experiences: true,
          educations: true,
          references: true,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          'Bạn đã có hồ sơ ứng viên — vui lòng sửa hồ sơ hiện có thay vì tạo mới.',
        );
      }
      throw err;
    }
  }

  // Sửa hồ sơ hiện có — thay các mảng lồng nhau (experiences/educations/references) bằng
  // delete-rồi-tạo-lại trong 1 transaction, đơn giản hơn nhiều so với diff từng phần tử.
  async updateCandidateProfile(dto: CreateCandidateProfileDto, userId: string) {
    const existing = await this.prisma.candidateProfile.findFirst({
      where: { userId },
    });
    if (!existing) {
      throw new NotFoundException(
        'Bạn chưa có hồ sơ ứng viên — vui lòng tạo hồ sơ trước.',
      );
    }
    this.assertValidCvPath(dto.cvUrl);

    const { experiences, educations, references, ...profileData } = dto;

    return this.prisma.$transaction(async (tx) => {
      await tx.candidateExperience.deleteMany({
        where: { profileId: existing.id },
      });
      await tx.candidateEducation.deleteMany({
        where: { profileId: existing.id },
      });
      await tx.candidateReference.deleteMany({
        where: { profileId: existing.id },
      });

      return tx.candidateProfile.update({
        where: { id: existing.id },
        data: {
          ...profileData,
          experiences:
            experiences && experiences.length > 0
              ? {
                  create: experiences.map((exp) => ({
                    company: exp.company,
                    position: exp.position,
                    startDate: exp.startDate ? new Date(exp.startDate) : null,
                    endDate: exp.endDate ? new Date(exp.endDate) : null,
                    salary: exp.salary,
                    description: exp.description,
                  })),
                }
              : undefined,
          educations:
            educations && educations.length > 0
              ? {
                  create: educations.map((edu) => ({
                    degree: edu.degree,
                    school: edu.school,
                    major: edu.major,
                    grade: edu.grade,
                    gradYear: edu.gradYear,
                  })),
                }
              : undefined,
          references:
            references && references.length > 0
              ? {
                  create: references.map((ref) => ({
                    fullName: ref.fullName,
                    company: ref.company,
                    position: ref.position,
                    phone: ref.phone,
                  })),
                }
              : undefined,
        },
        include: { experiences: true, educations: true, references: true },
      });
    });
  }

  // `viewerRole`/`viewerCompanyId` = null khi gọi nội bộ (không cần che PII, VD script/seed) —
  // nhưng 2 route thật sự expose ra ngoài (RecruitmentController) LUÔN truyền giá trị thật từ JWT.
  async getAllCandidateProfiles(
    search?: string,
    location?: string,
    viewerRole?: Role,
    viewerCompanyId?: string | null,
  ) {
    const whereCondition: any = {};
    if (location && location !== 'ALL') {
      whereCondition.location = { contains: location, mode: 'insensitive' };
    }
    if (search) {
      whereCondition.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { desiredPosition: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
    }

    const profiles = await this.prisma.candidateProfile.findMany({
      where: whereCondition,
      include: {
        experiences: true,
        educations: true,
        references: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (viewerRole !== Role.BUSINESS) return profiles;

    const introMap = await this.getIntroductionStatusMap(viewerCompanyId);
    return profiles.map((p) =>
      this.maskCandidateContact(p, introMap.get(p.id)),
    );
  }

  async getCandidateProfileById(
    id: string,
    viewerRole?: Role,
    viewerCompanyId?: string | null,
  ) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { id },
      include: {
        experiences: true,
        educations: true,
        references: true,
      },
    });
    if (!profile) throw new NotFoundException('Hồ sơ ứng viên không tồn tại.');

    if (viewerRole !== Role.BUSINESS) return profile;

    const introMap = await this.getIntroductionStatusMap(viewerCompanyId);
    return this.maskCandidateContact(profile, introMap.get(id));
  }

  /** Map candidateProfileId -> status của yêu cầu (nếu công ty này đã từng gửi) cho 1 company. */
  private async getIntroductionStatusMap(
    companyId?: string | null,
  ): Promise<Map<string, string>> {
    if (!companyId) return new Map();
    const requests = await this.prisma.candidateIntroductionRequest.findMany({
      where: { companyId },
      select: { candidateProfileId: true, status: true },
    });
    return new Map(requests.map((r) => [r.candidateProfileId, r.status]));
  }

  /** Che SĐT/email/CV của ứng viên trừ khi công ty xem đã được duyệt (APPROVED) — kèm
   * `introductionStatus` để frontend biết hiện nút "Gửi yêu cầu" hay "Đang chờ duyệt". Trước đây
   * chỉ che 3 field cấp cao (phone/email/cvUrl) nhưng BỎ SÓT `references` — mỗi CandidateReference
   * cũng có SĐT riêng của người tham chiếu (bên thứ 3, không phải ứng viên), nên phải che luôn,
   * nếu không company chưa được duyệt vẫn lấy được SĐT người tham chiếu qua field lồng nhau này. */
  private maskCandidateContact<
    T extends {
      phone: string;
      email: string;
      cvUrl: string | null;
      references: { phone: string | null }[];
    },
  >(profile: T, introStatus: string | undefined) {
    const introductionStatus = introStatus ?? 'NONE';
    if (introductionStatus === APPROVED_INTRODUCTION_STATUS) {
      return { ...profile, introductionStatus };
    }
    return {
      ...profile,
      phone: null,
      email: null,
      cvUrl: null,
      references: profile.references.map((r) => ({ ...r, phone: null })),
      introductionStatus,
    };
  }

  // ── Yêu cầu xem liên hệ ứng viên (BUSINESS) ─────────────────────────────
  async requestCandidateIntroduction(
    candidateProfileId: string,
    companyId: string | null,
    userId: string,
    dto: CreateCandidateIntroductionRequestDto,
  ) {
    if (!companyId) {
      throw new BadRequestException(
        'Tài khoản của bạn chưa liên kết công ty nào. Vui lòng liên kết công ty trước khi gửi yêu cầu.',
      );
    }
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { id: candidateProfileId },
    });
    if (!profile) throw new NotFoundException('Hồ sơ ứng viên không tồn tại.');

    try {
      return await this.prisma.candidateIntroductionRequest.create({
        data: {
          candidateProfileId,
          companyId,
          requestedById: userId,
          note: dto.note || null,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          'Công ty bạn đã gửi yêu cầu xem thông tin liên hệ hồ sơ này rồi.',
        );
      }
      throw err;
    }
  }

  async getMyIntroductionRequests(companyId: string | null) {
    if (!companyId) return [];
    return this.prisma.candidateIntroductionRequest.findMany({
      where: { companyId },
      include: {
        candidateProfile: {
          select: {
            id: true,
            fullName: true,
            desiredPosition: true,
            location: true,
            industry: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Admin: duyệt yêu cầu xem liên hệ ứng viên ───────────────────────────
  async getAllIntroductionRequests(status?: string) {
    return this.prisma.candidateIntroductionRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        candidateProfile: {
          select: {
            id: true,
            fullName: true,
            desiredPosition: true,
            location: true,
            phone: true,
            email: true,
          },
        },
        company: { select: { id: true, name: true, taxCode: true } },
        requestedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewIntroductionRequest(
    id: string,
    dto: ReviewCandidateIntroductionRequestDto,
  ) {
    const request = await this.prisma.candidateIntroductionRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Yêu cầu không tồn tại.');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Yêu cầu này đã được xử lý trước đó.');
    }
    return this.prisma.candidateIntroductionRequest.update({
      where: { id },
      data: { status: dto.status, reviewNote: dto.reviewNote || null },
    });
  }

  // Hồ sơ ứng viên của tôi (role MEMBER) — xem lại hồ sơ ATS đã tạo.
  async getMyCandidateProfiles(userId: string) {
    return this.prisma.candidateProfile.findMany({
      where: { userId },
      include: { experiences: true, educations: true, references: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Đơn ứng tuyển của tôi (role MEMBER) — xem trạng thái CV đã nộp (NEW/REVIEWING/INTERVIEW/HIRED/REJECTED).
  async getMyApplications(userId: string) {
    return this.prisma.jobApplication.findMany({
      where: { userId },
      include: {
        job: {
          select: { id: true, title: true, department: true, location: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 2. Employer Requests & Detailed B2B Postings
  async createEmployerRequest(dto: CreateEmployerRequestDto) {
    return this.prisma.employerRequest.create({
      data: dto,
    });
  }

  /** Ghép các field rời của form đăng tin B2B thành đúng shape lưu trên EmployerRequest — dùng
   * chung cho cả tạo mới VÀ sửa (updateEmployerPosting), tránh 2 nơi build chuỗi lệch nhau. */
  private composeEmployerPostingData(dto: CreateEmployerPostingDto) {
    return {
      companyName: dto.companyName,
      contactName: dto.companyName,
      phone: dto.phone,
      email: dto.email,
      position: dto.title,
      expectedSalary: `${dto.minSalary || ''} - ${dto.maxSalary || ''} ${dto.currency || 'VND'}`,
      jobDescription: `Mô tả: ${dto.description}\nYêu cầu: ${dto.requirements}\nNgành nghề: ${dto.industry}\nĐịa điểm: ${dto.location}\nHình thức: ${dto.workType}\nGiới tính: ${dto.gender || 'Không yêu cầu'}\nKinh nghiệm: ${dto.experience}\nCấp bậc: ${dto.level}\nBằng cấp: ${dto.education}\nPhúc lợi: ${dto.benefits && dto.benefits.length > 0 ? dto.benefits.join(', ') : 'Theo quy định'}\nĐịa chỉ trụ sở: ${dto.address}\nQuy mô công ty: ${dto.companySize || 'Chưa cung cấp'}\nGiới thiệu công ty: ${dto.companyDesc || 'Chưa cung cấp'}`,
    };
  }

  // Doanh nghiệp (role BUSINESS) gửi yêu cầu đăng tin — vào hàng đợi PENDING, Admin duyệt
  // và tự tay xuất bản thành JobPosting thật (POST /admin/jobs) sau khi biên tập + thêm ảnh.
  async createEmployerPosting(dto: CreateEmployerPostingDto, userId: string) {
    return this.prisma.employerRequest.create({
      data: {
        ...this.composeEmployerPostingData(dto),
        status: 'PENDING',
        userId,
      },
    });
  }

  /** Chủ sở hữu (BUSINESS) tự sửa yêu cầu — chỉ khi còn PENDING (Admin chưa xử lý/xuất bản),
   * tránh sửa "chui" sau khi Admin đã liên hệ/đăng tin dựa trên nội dung cũ. */
  async updateEmployerPosting(
    id: string,
    dto: CreateEmployerPostingDto,
    userId: string,
  ) {
    const request = await this.prisma.employerRequest.findUnique({
      where: { id },
    });
    if (!request)
      throw new NotFoundException('Yêu cầu đăng tin không tồn tại.');
    if (request.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền sửa yêu cầu này.');
    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        'Yêu cầu đã được Admin xử lý, không thể tự sửa — vui lòng liên hệ CPA HCM.',
      );
    }
    return this.prisma.employerRequest.update({
      where: { id },
      data: this.composeEmployerPostingData(dto),
    });
  }

  /** Chủ sở hữu (BUSINESS) tự xóa yêu cầu — chỉ khi còn PENDING, cùng nguyên tắc với sửa. */
  async deleteEmployerPosting(id: string, userId: string) {
    const request = await this.prisma.employerRequest.findUnique({
      where: { id },
    });
    if (!request)
      throw new NotFoundException('Yêu cầu đăng tin không tồn tại.');
    if (request.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền xóa yêu cầu này.');
    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        'Yêu cầu đã được Admin xử lý, không thể tự xóa — vui lòng liên hệ CPA HCM.',
      );
    }
    return this.prisma.employerRequest.delete({ where: { id } });
  }

  async getAllEmployerRequests() {
    return this.prisma.employerRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // Yêu cầu đăng tin của tôi (role BUSINESS) — xem trạng thái các tin đã gửi chờ Admin duyệt
  // (PENDING/CONTACTED/IN_PROGRESS/CLOSED). Chỉ trả về các request có userId (gửi qua
  // employer-postings khi đã đăng nhập) — không lẫn lead B2B ẩn danh từ employer-requests.
  async getMyEmployerRequests(userId: string) {
    return this.prisma.employerRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Job Applications & Job Postings — userId lấy từ JWT (route yêu cầu Role.MEMBER).
  // cvUrl LUÔN lấy từ file thật đã upload (file.path) — không còn tin chuỗi cvUrl do client tự khai.
  async applyJob(
    dto: CreateJobApplicationDto,
    userId: string,
    cvFilePath: string,
  ) {
    const job = await this.prisma.jobPosting.findUnique({
      where: { id: dto.jobId },
    });
    if (!job || !job.isActive) {
      throw new NotFoundException(
        'Vị trí tuyển dụng không tồn tại hoặc đã đóng.',
      );
    }

    // Trước đây không hề kiểm tra trùng — user có thể nộp CV vào cùng 1 vị trí không giới hạn
    // số lần, làm rác hàng đợi ATS. Chặn khi còn hồ sơ đang xử lý (chưa REJECTED) cho cùng
    // job+user; vẫn cho nộp lại nếu hồ sơ trước đó đã bị từ chối (REJECTED), giống rule
    // "học lại sau khi bị huỷ" đã áp dụng cho CourseEnrollment.
    //
    // Check + create nằm trong 1 transaction Serializable — giống enroll() ở CoursesService —
    // để 2 request nộp hồ sơ gần như đồng thời (double-click nút Nộp) không cùng vượt qua
    // findFirst rồi tạo 2 bản ghi trùng nhau (không thể chặn bằng unique constraint đơn thuần
    // vì nghiệp vụ cho nộp lại sau khi bị REJECTED).
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.jobApplication.findFirst({
            where: { jobId: dto.jobId, userId, status: { not: 'REJECTED' } },
          });
          if (existing) {
            throw new ConflictException(
              'Bạn đã nộp hồ sơ ứng tuyển vị trí này rồi.',
            );
          }
          return tx.jobApplication.create({
            data: {
              jobId: dto.jobId,
              fullName: dto.fullName,
              phone: dto.phone,
              email: dto.email,
              cvUrl: cvFilePath,
              status: 'NEW',
              userId,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err: any) {
      if (err instanceof ConflictException) throw err;
      if (err?.code === 'P2034') {
        throw new ConflictException(
          'Bạn đã nộp hồ sơ ứng tuyển vị trí này rồi.',
        );
      }
      throw err;
    }
  }

  /** Trả về JobApplication nếu tìm thấy VÀ (đúng chủ sở hữu HOẶC là ADMIN) — chống IDOR khi tải CV. */
  async getApplicationForCvAccess(id: string, userId: string, role: Role) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id },
    });
    if (!application)
      throw new NotFoundException('Hồ sơ ứng tuyển không tồn tại.');
    if (role !== Role.ADMIN && application.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập CV này.');
    }
    return application;
  }

  async getJobById(id: string) {
    const job = await this.prisma.jobPosting.findUnique({ where: { id } });
    if (!job || !job.isActive) {
      throw new NotFoundException(
        'Vị trí tuyển dụng không tồn tại hoặc đã đóng.',
      );
    }
    return job;
  }

  // Việc làm liên quan: ưu tiên cùng phòng ban, sau đó cùng địa điểm, loại trừ chính nó.
  async getRelatedJobs(id: string, limit = 4) {
    return this.redis.getOrSet(
      `jobs:related:${id}:${limit}`,
      LISTING_CACHE_TTL_SECONDS,
      async () => {
        const job = await this.prisma.jobPosting.findUnique({ where: { id } });
        if (!job) return [];

        const sameDepartment = await this.prisma.jobPosting.findMany({
          where: {
            isActive: true,
            id: { not: id },
            department: job.department,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
        if (sameDepartment.length >= limit) return sameDepartment;

        const remaining = limit - sameDepartment.length;
        const excludeIds = [id, ...sameDepartment.map((j) => j.id)];
        const fallback = await this.prisma.jobPosting.findMany({
          where: {
            isActive: true,
            id: { notIn: excludeIds },
            location: job.location,
          },
          orderBy: { createdAt: 'desc' },
          take: remaining,
        });

        return [...sameDepartment, ...fallback];
      },
    );
  }

  async getActiveJobs() {
    return this.redis.getOrSet(
      'jobs:list',
      LISTING_CACHE_TTL_SECONDS,
      async () => {
        const jobs = await this.prisma.jobPosting.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        });

        if (jobs.length === 0) {
          // Nhiều request cùng cache-miss lúc bảng rỗng (VD: mới deploy) có thể cùng chạy nhánh này
          // — giữ 1 lock ngắn hạn để chỉ request đầu tiên thực sự seed, tránh tạo trùng dữ liệu mẫu.
          const acquiredLock = await this.redis.setNX(
            'jobs:seed-lock',
            '1',
            30,
          );
          if (acquiredLock) {
            await this.seedSampleJobs();
          }
          return this.prisma.jobPosting.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
          });
        }

        return jobs;
      },
    );
  }

  // ── Admin CRUD (xuất bản tin tuyển dụng thật — chỉ Admin) ──────────────
  async getAllJobPostings() {
    return this.prisma.jobPosting.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createJobPosting(dto: CreateJobPostingDto, imagePath: string | null) {
    const job = await this.prisma.jobPosting.create({
      data: {
        title: dto.title,
        department: dto.department,
        description: dto.description,
        requirements: dto.requirements ?? null,
        benefits: dto.benefits ?? null,
        imageUrl: imagePath,
        salary: dto.salary ?? null,
        location: dto.location ?? null,
        type: dto.type ?? 'Toàn thời gian',
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        isActive: dto.isActive ?? true,
      },
    });

    // Nếu tin này được xuất bản từ 1 EmployerRequest (BUSINESS tự gửi), liên kết ngược lại +
    // đóng yêu cầu — để BUSINESS thấy được kết quả thật thay vì PENDING treo mãi mãi.
    if (dto.employerRequestId) {
      await this.prisma.employerRequest.update({
        where: { id: dto.employerRequestId },
        data: { publishedJobId: job.id, status: 'CLOSED' },
      });
    }

    return job;
  }

  async updateJobPosting(
    id: string,
    dto: UpdateJobPostingDto,
    imagePath: string | null,
  ) {
    const job = await this.prisma.jobPosting.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Tin tuyển dụng không tồn tại');

    // Ảnh mới thay ảnh cũ — xóa file cũ trên đĩa để tránh rác tích lũy.
    if (imagePath && job.imageUrl) {
      this.deleteUploadedFile(job.imageUrl);
    }

    return this.prisma.jobPosting.update({
      where: { id },
      data: {
        title: dto.title ?? job.title,
        department: dto.department ?? job.department,
        description: dto.description ?? job.description,
        requirements: dto.requirements ?? job.requirements,
        benefits: dto.benefits ?? job.benefits,
        imageUrl: imagePath ?? job.imageUrl,
        salary: dto.salary ?? job.salary,
        location: dto.location ?? job.location,
        type: dto.type ?? job.type,
        deadline: dto.deadline ? new Date(dto.deadline) : job.deadline,
        isActive: dto.isActive ?? job.isActive,
      },
    });
  }

  async deleteJobPosting(id: string) {
    const job = await this.prisma.jobPosting.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Tin tuyển dụng không tồn tại');
    if (job.imageUrl) this.deleteUploadedFile(job.imageUrl);
    return this.prisma.jobPosting.delete({ where: { id } });
  }

  /** Xóa file vật lý tương ứng với 1 public path dạng /uploads/jobs/xxx.jpg. */
  private deleteUploadedFile(publicPath: string): void {
    if (!publicPath.startsWith('/uploads/')) return;
    const absolutePath = join(
      UPLOADS_ROOT,
      publicPath.replace('/uploads/', ''),
    );
    fs.unlink(absolutePath, () => {
      // Bỏ qua lỗi (file có thể đã bị xóa thủ công) — không chặn luồng chính vì việc này.
    });
  }

  private async seedSampleJobs() {
    await this.prisma.jobPosting.createMany({
      data: [
        {
          title: 'Trưởng nhóm Kiểm toán (Audit Team Leader)',
          department: 'Kiểm toán',
          description:
            'Lập kế hoạch kiểm toán, soát xét giấy tờ làm việc của trợ lý, phát hành báo cáo kiểm toán độc lập.',
          requirements: 'Tốt nghiệp ĐH Kế kiểm, 3-5 năm kinh nghiệm.',
          salary: '20 - 30 triệu',
          location: 'TP. HCM',
          type: 'Toàn thời gian',
        },
        {
          title: 'Chuyên viên Tư vấn Thuế Cao cấp (Senior Tax Consultant)',
          department: 'Thuế',
          description:
            'Phụ trách soát xét rủi ro thuế, lập hồ sơ giao dịch liên kết (Transfer Pricing).',
          requirements: 'Có kinh nghiệm 2 năm tư vấn thuế, chứng chỉ CPT.',
          salary: '15 - 25 triệu',
          location: 'TP. HCM',
          type: 'Toàn thời gian',
        },
        {
          title: 'Kiểm toán viên Xây dựng (Construction Auditor)',
          department: 'Kiểm toán XDCB',
          description:
            'Kiểm toán quyết toán dự án hoàn thành, kiểm tra dự toán công trình.',
          requirements:
            'Tốt nghiệp ngành Kế toán xây dựng hoặc Kỹ sư kinh tế xây dựng.',
          salary: '18 - 28 triệu',
          location: 'Hà Nội',
          type: 'Toàn thời gian',
        },
      ],
    });
  }
}
