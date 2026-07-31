import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { CreateLinkRequestDto } from './dto/create-link-request.dto.js';
import { ReviewLinkRequestDto } from './dto/review-link-request.dto.js';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllCompanies() {
    return this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, documents: true } } },
    });
  }

  async createCompany(dto: CreateCompanyDto) {
    const existing = await this.prisma.company.findUnique({
      where: { taxCode: dto.taxCode },
    });
    if (existing) {
      throw new BadRequestException(
        'Mã số thuế này đã được đăng ký cho một công ty khác.',
      );
    }
    return this.prisma.company.create({ data: dto });
  }

  async updateCompany(id: string, dto: UpdateCompanyDto) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Công ty không tồn tại.');

    if (dto.taxCode && dto.taxCode !== company.taxCode) {
      const existing = await this.prisma.company.findUnique({
        where: { taxCode: dto.taxCode },
      });
      if (existing)
        throw new BadRequestException(
          'Mã số thuế này đã được đăng ký cho một công ty khác.',
        );
    }

    return this.prisma.company.update({
      where: { id },
      data: {
        taxCode: dto.taxCode ?? company.taxCode,
        name: dto.name ?? company.name,
        address: dto.address ?? company.address,
        phone: dto.phone ?? company.phone,
        email: dto.email ?? company.email,
        isActive: dto.isActive ?? company.isActive,
      },
    });
  }

  async deleteCompany(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { _count: { select: { users: true, documents: true } } },
    });
    if (!company) throw new NotFoundException('Công ty không tồn tại.');
    if (company._count.users > 0 || company._count.documents > 0) {
      throw new BadRequestException(
        'Công ty vẫn còn tài khoản người dùng hoặc chứng từ liên kết — vui lòng gỡ liên kết trước khi xóa.',
      );
    }
    return this.prisma.company.delete({ where: { id } });
  }

  // ── Tự yêu cầu liên kết Company (role BUSINESS chưa có companyId) ─────────
  async createLinkRequest(dto: CreateLinkRequestDto, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.companyId) {
      throw new BadRequestException(
        'Tài khoản của bạn đã được liên kết với một công ty.',
      );
    }

    // Check + create nằm trong 1 transaction Serializable — giống enroll() (CoursesService) và
    // applyJob() (RecruitmentService) — để 2 request gần như đồng thời không cùng vượt qua
    // findFirst rồi tạo 2 yêu cầu liên kết PENDING trùng nhau. Không dùng unique constraint đơn
    // thuần ở schema vì user được phép có nhiều CompanyLinkRequest theo thời gian (chỉ tối đa 1
    // cái đang PENDING tại 1 thời điểm — ràng buộc có điều kiện, không hợp constraint thường).
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const pending = await tx.companyLinkRequest.findFirst({
            where: { userId, status: 'PENDING' },
          });
          if (pending) {
            throw new ConflictException(
              'Bạn đã gửi yêu cầu liên kết công ty, vui lòng chờ Admin xét duyệt.',
            );
          }
          return tx.companyLinkRequest.create({
            data: { ...dto, userId },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err: any) {
      if (err instanceof ConflictException) throw err;
      if (err?.code === 'P2034') {
        throw new ConflictException(
          'Bạn đã gửi yêu cầu liên kết công ty, vui lòng chờ Admin xét duyệt.',
        );
      }
      throw err;
    }
  }

  // Gọi từ AuthService.register() khi tài khoản BUSINESS điền sẵn mã số thuế lúc đăng ký — tránh
  // bắt họ phải đăng nhập xong rồi vào /tai-khoan gửi yêu cầu riêng ở 1 bước tách biệt. Nếu công
  // ty với mã số thuế này ĐÃ tồn tại (đã được xác minh trước đó), gán thẳng luôn không cần Admin
  // duyệt lại; nếu là mã số thuế mới, tạo sẵn 1 CompanyLinkRequest PENDING — Admin chỉ cần bấm
  // Duyệt thay vì phải gõ tay lại toàn bộ thông tin công ty như trước.
  async resolveOrRequestCompanyLinkAtRegister(
    taxCode: string,
    companyName: string,
    userId: string,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { taxCode },
    });
    if (company) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { companyId: company.id },
      });
      return { linked: true as const };
    }
    await this.prisma.companyLinkRequest.create({
      data: { taxCode, companyName, userId },
    });
    return { linked: false as const };
  }

  // Doanh nghiệp (BUSINESS) đã liên kết công ty tự lấy lại thông tin công ty mình — dùng để tự
  // điền sẵn tên/địa chỉ công ty vào các form khác (VD: đăng tin tuyển dụng) thay vì gõ lại.
  async getMyCompany(companyId: string | null) {
    if (!companyId) return null;
    return this.prisma.company.findUnique({ where: { id: companyId } });
  }

  async getMyLinkRequests(userId: string) {
    return this.prisma.companyLinkRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllLinkRequests(status?: string) {
    return this.prisma.companyLinkRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Duyệt: tìm Company theo taxCode (tạo mới nếu chưa có) rồi gán companyId cho user gửi yêu cầu.
  // Từ chối: chỉ cập nhật status + reviewNote, không đụng tới user.companyId.
  async reviewLinkRequest(id: string, dto: ReviewLinkRequestDto) {
    const request = await this.prisma.companyLinkRequest.findUnique({
      where: { id },
    });
    if (!request)
      throw new NotFoundException('Yêu cầu liên kết không tồn tại.');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Yêu cầu này đã được xử lý trước đó.');
    }

    if (dto.status === 'REJECTED') {
      return this.prisma.companyLinkRequest.update({
        where: { id },
        data: { status: 'REJECTED', reviewNote: dto.reviewNote ?? null },
      });
    }

    // Toàn bộ "tìm/tạo Company theo taxCode + gán companyId cho user + đánh dấu request đã duyệt"
    // gói trong 1 transaction Serializable — nếu không, 2 admin cùng duyệt gần như đồng thời 2
    // request PENDING khác nhau nhưng CÙNG taxCode (công ty chưa tồn tại) có thể cùng vượt qua
    // findUnique(null) rồi cùng company.create(), 1 bên sẽ dính lỗi vi phạm unique taxCode (P2002)
    // không được xử lý — quy về đúng thông báo "đã được xử lý, thử lại" thay vì lỗi hệ thống chung
    // chung. Cùng pattern với CoursesService.enroll().
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          let company = await tx.company.findUnique({
            where: { taxCode: request.taxCode },
          });
          if (!company) {
            company = await tx.company.create({
              data: { taxCode: request.taxCode, name: request.companyName },
            });
          }

          await tx.user.update({
            where: { id: request.userId },
            data: { companyId: company.id },
          });

          return tx.companyLinkRequest.update({
            where: { id },
            data: { status: 'APPROVED', reviewNote: dto.reviewNote ?? null },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err: any) {
      if (err?.code === 'P2002' || err?.code === 'P2034') {
        throw new ConflictException(
          'Công ty này vừa được duyệt/tạo bởi 1 thao tác khác — vui lòng tải lại và thử duyệt lại.',
        );
      }
      throw err;
    }
  }
}
