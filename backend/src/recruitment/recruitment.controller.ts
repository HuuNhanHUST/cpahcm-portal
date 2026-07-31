import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express, Response } from 'express';
import * as fs from 'node:fs';
import { Role } from '@prisma/client';
import { RecruitmentService } from './recruitment.service.js';
import { CreateCandidateProfileDto } from './dto/create-candidate-profile.dto.js';
import { CreateEmployerRequestDto } from './dto/create-employer-request.dto.js';
import { CreateEmployerPostingDto } from './dto/create-employer-posting.dto.js';
import { CreateJobApplicationDto } from './dto/create-job-application.dto.js';
import { CreateCandidateIntroductionRequestDto } from './dto/create-candidate-introduction-request.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { cvUploadOptions } from '../common/config/upload.config.js';

@Controller('recruitment')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  // Upload CV trước, dùng path trả về làm `cvUrl` khi tạo hồ sơ ở bước sau (form tạo hồ sơ là
  // wizard nhiều bước với các mảng lồng nhau — tách riêng bước upload file để không phải nhồi
  // multipart + JSON lồng nhau vào cùng 1 request). Trước đây bước "Tải CV" trong wizard chỉ lưu
  // tên file client tự khai, không có file thật nào lên server — cùng lỗi với applyJob().
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MEMBER)
  @Post('candidates/cv-upload')
  @UseInterceptors(FileInterceptor('cv', cvUploadOptions()))
  async uploadCandidateCv(
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file)
      throw new BadRequestException(
        'Vui lòng đính kèm file CV (định dạng PDF).',
      );
    return { cvUrl: file.path };
  }

  // 1. Dành cho Ứng Viên (role MEMBER): tạo hồ sơ ATS — bắt buộc đăng nhập để gắn hồ sơ
  // với đúng tài khoản (chống mạo danh, cho phép ứng viên xem lại/sửa hồ sơ của mình sau này).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MEMBER)
  @Post('candidates')
  async createCandidateProfile(
    @Body() dto: CreateCandidateProfileDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.recruitmentService.createCandidateProfile(dto, userId);
  }

  // Sửa hồ sơ ứng viên của chính mình — thay cho việc tạo hồ sơ trùng lặp mỗi lần chỉnh sửa.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MEMBER)
  @Patch('candidates/me')
  async updateCandidateProfile(
    @Body() dto: CreateCandidateProfileDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.recruitmentService.updateCandidateProfile(dto, userId);
  }

  // Hồ sơ ứng viên của tôi (role MEMBER) — path literal, không xung đột với ':id' bên dưới.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MEMBER)
  @Get('candidates/me')
  async getMyCandidateProfiles(@CurrentUser('id') userId: string) {
    return this.recruitmentService.getMyCandidateProfiles(userId);
  }

  // Chứa PII (SĐT, email, địa chỉ, mức lương mong muốn...). ADMIN xem đầy đủ; BUSINESS xem được
  // (chủ động tìm ứng viên phù hợp — đúng nghiệp vụ ATS) nhưng SĐT/email/CV bị che trong service
  // (getAllCandidateProfiles) trừ khi công ty đã được duyệt CandidateIntroductionRequest.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BUSINESS)
  @Get('candidates')
  async getAllCandidateProfiles(
    @Query('search') search?: string,
    @Query('location') location?: string,
    @CurrentUser('role') role?: Role,
    @CurrentUser('companyId') companyId?: string | null,
  ) {
    return this.recruitmentService.getAllCandidateProfiles(
      search,
      location,
      role,
      companyId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BUSINESS)
  @Get('candidates/:id')
  async getCandidateProfileById(
    @Param('id') id: string,
    @CurrentUser('role') role?: Role,
    @CurrentUser('companyId') companyId?: string | null,
  ) {
    return this.recruitmentService.getCandidateProfileById(id, role, companyId);
  }

  // Doanh nghiệp gửi yêu cầu xem thông tin liên hệ 1 hồ sơ — Admin duyệt mới lộ SĐT/email.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUSINESS)
  @Post('candidates/:id/introduction-request')
  async requestCandidateIntroduction(
    @Param('id') id: string,
    @Body() dto: CreateCandidateIntroductionRequestDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string | null,
  ) {
    const data = await this.recruitmentService.requestCandidateIntroduction(
      id,
      companyId,
      userId,
      dto,
    );
    return {
      success: true,
      message:
        'Đã gửi yêu cầu xem thông tin liên hệ — CPA HCM sẽ xét duyệt sớm.',
      data,
    };
  }

  // Danh sách yêu cầu công ty mình đã gửi — tiền tố 'introduction-requests' khác 'candidates' nên
  // không có rủi ro xung đột với route ':id' ở trên (NestJS chỉ nuốt nhầm khi trùng tiền tố).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUSINESS)
  @Get('introduction-requests/me')
  async getMyIntroductionRequests(
    @CurrentUser('companyId') companyId: string | null,
  ) {
    return this.recruitmentService.getMyIntroductionRequests(companyId);
  }

  // 2. Dành cho Nhà Tuyển Dụng (B2B) — form tư vấn dịch vụ headhunting đơn giản, vẫn public
  // vì đây chỉ là một lead liên hệ (không tạo tin tuyển dụng), giống form liên hệ thường.
  @Public()
  @Post('employer-requests')
  async createEmployerRequest(@Body() dto: CreateEmployerRequestDto) {
    return this.recruitmentService.createEmployerRequest(dto);
  }

  // Đăng tin tuyển dụng (role BUSINESS, bắt buộc đăng nhập): tạo YÊU CẦU vào hàng đợi
  // (EmployerRequest), CHƯA hiển thị công khai — Admin xét duyệt rồi mới xuất bản thành
  // JobPosting thật qua POST /admin/jobs (xem AdminController).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUSINESS)
  @Post('employer-postings')
  async createEmployerPosting(
    @Body() dto: CreateEmployerPostingDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.recruitmentService.createEmployerPosting(dto, userId);
  }

  // Sửa/xóa yêu cầu đăng tin của chính mình — chỉ khi Admin chưa xử lý (còn PENDING), xem
  // guard chi tiết trong RecruitmentService.updateEmployerPosting/deleteEmployerPosting.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUSINESS)
  @Patch('employer-postings/:id')
  async updateEmployerPosting(
    @Param('id') id: string,
    @Body() dto: CreateEmployerPostingDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.recruitmentService.updateEmployerPosting(id, dto, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUSINESS)
  @Delete('employer-postings/:id')
  async deleteEmployerPosting(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.recruitmentService.deleteEmployerPosting(id, userId);
  }

  // Yêu cầu đăng tin của tôi (role BUSINESS) — path literal, khai trước 'employer-requests' (ADMIN)
  // để rõ ràng về ngữ nghĩa, dù không có ':id' phía dưới nên thực ra không xung đột thứ tự.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUSINESS)
  @Get('employer-requests/me')
  async getMyEmployerRequests(@CurrentUser('id') userId: string) {
    return this.recruitmentService.getMyEmployerRequests(userId);
  }

  // Chứa thông tin liên hệ B2B (SĐT, email doanh nghiệp) — chỉ ADMIN được xem.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('employer-requests')
  async getAllEmployerRequests() {
    return this.recruitmentService.getAllEmployerRequests();
  }

  // 3. ATS Job Applications & Job Postings
  // Ứng tuyển (role MEMBER, bắt buộc đăng nhập) — gắn hồ sơ ứng tuyển với tài khoản thật.
  // Bắt buộc kèm file CV thật (multipart, field 'cv') — trước đây chỉ nhận 1 chuỗi tên file
  // từ client nên hồ sơ ATS chưa từng có CV thật đính kèm, xem cvUploadOptions() để biết lý do.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MEMBER)
  @Post('apply')
  @UseInterceptors(FileInterceptor('cv', cvUploadOptions()))
  async applyJob(
    @Body() dto: CreateJobApplicationDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser('id') userId: string,
  ) {
    if (!file)
      throw new BadRequestException(
        'Vui lòng đính kèm file CV (định dạng PDF).',
      );
    try {
      return await this.recruitmentService.applyJob(dto, userId, file.path);
    } catch (err) {
      // Multer đã lưu file vào đĩa TRƯỚC KHI handler chạy — nếu service từ chối (job đóng, nộp
      // trùng...) mà không dọn, file PII (CV) này mồ côi vĩnh viễn trên đĩa vì không có bản ghi
      // DB nào trỏ tới để dọn sau này.
      fs.unlink(file.path, () => {});
      throw err;
    }
  }

  // Tải xuống CV — chống IDOR: chỉ chủ hồ sơ hoặc ADMIN được tải.
  @Get('applications/:id/cv')
  async downloadApplicationCv(
    @Param('id') id: string,
    @Res() res: Response,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const application = await this.recruitmentService.getApplicationForCvAccess(
      id,
      userId,
      role,
    );
    if (!fs.existsSync(application.cvUrl)) {
      throw new NotFoundException('File CV không còn tồn tại trên máy chủ.');
    }
    res.download(
      application.cvUrl,
      `CV-${application.fullName || 'ung-vien'}.pdf`,
    );
  }

  // Đơn ứng tuyển của tôi (role MEMBER) — xem trạng thái CV đã nộp.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MEMBER)
  @Get('applications/me')
  async getMyApplications(@CurrentUser('id') userId: string) {
    return this.recruitmentService.getMyApplications(userId);
  }

  // Danh sách tin tuyển dụng đang mở — công khai, KHÔNG cần đăng nhập để duyệt tin.
  @Public()
  @Get('jobs')
  async getActiveJobs() {
    return this.recruitmentService.getActiveJobs();
  }

  // Chi tiết 1 tin tuyển dụng — công khai, dùng cho trang /tuyen-dung/[id].
  @Public()
  @Get('jobs/:id')
  async getJobById(@Param('id') id: string) {
    return this.recruitmentService.getJobById(id);
  }

  // Việc làm liên quan (cùng phòng ban / địa điểm) hiển thị ở cuối trang chi tiết.
  @Public()
  @Get('jobs/:id/related')
  async getRelatedJobs(@Param('id') id: string) {
    return this.recruitmentService.getRelatedJobs(id);
  }
}
