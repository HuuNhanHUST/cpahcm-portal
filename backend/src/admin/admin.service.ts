import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Role } from '@prisma/client';
import { CreateServiceRequestDto } from './dto/create-service-request.dto.js';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ─── 1. SERVICE REQUESTS CRUD ───
  async createServiceRequest(dto: CreateServiceRequestDto) {
    return this.prisma.serviceRequest.create({
      data: {
        companyName: dto.companyName,
        taxCode: dto.taxCode || null,
        contactName: dto.contactName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address || null,
        service: dto.service,
        message: dto.message || null,
        status: 'NEW',
      },
    });
  }

  async getAllServiceRequests() {
    return this.prisma.serviceRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateServiceRequestStatus(id: string, status: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });
    if (!request) {
      throw new NotFoundException(`Yêu cầu tư vấn ID ${id} không tồn tại`);
    }
    return this.prisma.serviceRequest.update({
      where: { id },
      data: { status },
    });
  }

  async deleteServiceRequest(id: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Yêu cầu tư vấn không tồn tại');
    return this.prisma.serviceRequest.delete({ where: { id } });
  }

  // ─── 2. DASHBOARD METRICS ───
  async getDashboardStats() {
    const [totalUsers, totalRequests, totalCandidates, totalCourses] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.serviceRequest.count(),
        this.prisma.candidateProfile.count(),
        this.prisma.course.count(),
      ]);

    const recentRequests = await this.prisma.serviceRequest.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalUsers,
      totalRequests,
      totalCandidates,
      totalCourses,
      recentRequests,
      systemHealth: 'ONLINE',
      timestamp: new Date(),
    };
  }

  // ─── 3. USER MANAGEMENT CRUD ───
  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        companyId: true,
        company: { select: { id: true, name: true, taxCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Gán/gỡ Company cho 1 user (dùng cho Cổng Khách Hàng — role BUSINESS). */
  async updateUserCompany(
    userId: string,
    companyId: string | null | undefined,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    // companyId chỉ có ý nghĩa với role BUSINESS — nhiều nơi khác (getMyCompany, chấm quyền tải
    // chứng từ, tự điền form đăng tin tuyển dụng...) coi companyId khác null là bằng chứng "user
    // này thuộc 1 công ty" mà không kiểm tra lại role. Gán nhầm companyId cho MEMBER/ADMIN sẽ vô
    // tình mở quyền truy cập dữ liệu công ty cho tài khoản không phải BUSINESS.
    if (companyId && user.role !== 'BUSINESS') {
      throw new ConflictException(
        'Chỉ có thể gán công ty cho tài khoản role BUSINESS.',
      );
    }

    if (companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      });
      if (!company) throw new NotFoundException('Công ty không tồn tại');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { companyId: companyId ?? null },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        companyId: true,
        company: { select: { id: true, name: true, taxCode: true } },
      },
    });
  }

  async updateUserRole(userId: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async toggleUserActiveStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            documents: true,
            applications: true,
            enrollments: true,
            candidateProfiles: true,
            employerRequests: true,
            companyLinkRequests: true,
            forumTopics: true,
            forumReplies: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    // Không set onDelete: Cascade cho các quan hệ này ở schema (cố ý — chứng từ/CV/bài đăng diễn
    // đàn... không nên tự động biến mất khi xóa tài khoản). Trước đây gọi delete() thẳng sẽ ném lỗi
    // vi phạm khóa ngoại (P2003) không được xử lý, biến thành lỗi hệ thống 500 chung chung — chặn
    // sớm ở đây với thông báo rõ ràng, khớp cách CoursesService.deleteCourse() đã làm.
    const hasActivity = Object.values(user._count).some((c) => c > 0);
    if (hasActivity) {
      throw new ConflictException(
        'Tài khoản đã có hoạt động (chứng từ, đăng ký khóa học, hồ sơ ứng tuyển, bài đăng diễn đàn...), không thể xóa. Vui lòng khóa tài khoản (isActive) thay vì xóa.',
      );
    }
    return this.prisma.user.delete({ where: { id: userId } });
  }

  // Courses/Services/Posts/Jobs CRUD nằm ở CoursesService/ServicesService/PostsService/
  // RecruitmentService (xem admin.controller.ts) — AdminController inject trực tiếp các
  // service đó, không lặp lại logic ở đây (đã dọn khỏi bản trùng lặp trước đây).

  // ─── 5. RECRUITMENT ATS CRUD ───
  async getAllJobApplications() {
    return this.prisma.jobApplication.findMany({
      include: { job: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateJobApplicationStatus(id: string, status: string) {
    const app = await this.prisma.jobApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Hồ sơ ứng tuyển không tồn tại');

    return this.prisma.jobApplication.update({
      where: { id },
      data: { status },
    });
  }

  async deleteJobApplication(id: string) {
    const app = await this.prisma.jobApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Hồ sơ ứng tuyển không tồn tại');
    return this.prisma.jobApplication.delete({ where: { id } });
  }
}
