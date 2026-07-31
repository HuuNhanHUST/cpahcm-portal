import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express, Response } from 'express';
import * as fs from 'node:fs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { CreateServiceRequestDto } from './dto/create-service-request.dto.js';
import { UpdateServiceRequestStatusDto } from './dto/update-service-request-status.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UpdateJobApplicationStatusDto } from './dto/update-job-application-status.dto.js';
import { CreateJobPostingDto } from '../recruitment/dto/create-job-posting.dto.js';
import { UpdateJobPostingDto } from '../recruitment/dto/update-job-posting.dto.js';
import { ReviewCandidateIntroductionRequestDto } from '../recruitment/dto/review-candidate-introduction-request.dto.js';
import { CreatePostDto } from '../posts/dto/create-post.dto.js';
import { UpdatePostDto } from '../posts/dto/update-post.dto.js';
import { CreateServiceDto } from '../services/dto/create-service.dto.js';
import { UpdateServiceDto } from '../services/dto/update-service.dto.js';
import { CreateCourseDto } from '../courses/dto/create-course.dto.js';
import { UpdateCourseDto } from '../courses/dto/update-course.dto.js';
import { UpdateEnrollmentStatusDto } from '../courses/dto/update-enrollment-status.dto.js';
import { ServicesService } from '../services/services.service.js';
import { CoursesService } from '../courses/courses.service.js';
import { PostsService } from '../posts/posts.service.js';
import { RecruitmentService } from '../recruitment/recruitment.service.js';
import { ForumService } from '../forum/forum.service.js';
import { CreateForumCategoryDto } from '../forum/dto/create-forum-category.dto.js';
import { UpdateForumCategoryDto } from '../forum/dto/update-forum-category.dto.js';
import { SetTopicFlagDto } from '../forum/dto/set-topic-flag.dto.js';
import { CompaniesService } from '../companies/companies.service.js';
import { CreateCompanyDto } from '../companies/dto/create-company.dto.js';
import { UpdateCompanyDto } from '../companies/dto/update-company.dto.js';
import { ReviewLinkRequestDto } from '../companies/dto/review-link-request.dto.js';
import { DocumentsService } from '../documents/documents.service.js';
import { UpdateDocumentStatusDto } from '../documents/dto/update-document-status.dto.js';
import { ChatService } from '../chat/chat.service.js';
import { AssignUserCompanyDto } from './dto/assign-user-company.dto.js';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  imageUploadOptions,
  toPublicUploadPath,
  lessonFileUploadOptions,
  documentResultUploadOptions,
} from '../common/config/upload.config.js';

@ApiTags('Admin & Service Management')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly servicesService: ServicesService,
    private readonly coursesService: CoursesService,
    private readonly postsService: PostsService,
    private readonly recruitmentService: RecruitmentService,
    private readonly forumService: ForumService,
    private readonly companiesService: CompaniesService,
    private readonly documentsService: DocumentsService,
    private readonly chatService: ChatService,
  ) {}

  // ─── 1. SERVICE REQUESTS (Public Submit & Admin CRUD) ───
  @Public()
  @Post('service-requests')
  @ApiOperation({ summary: 'Gửi yêu cầu báo giá & tư vấn dịch vụ (Public)' })
  @ApiResponse({
    status: 201,
    description: 'Yêu cầu tư vấn đã được gửi thành công',
  })
  async createServiceRequest(@Body() dto: CreateServiceRequestDto) {
    const data = await this.adminService.createServiceRequest(dto);
    return {
      success: true,
      message: 'Gửi yêu cầu tư vấn thành công! CPA HCM sẽ liên hệ sớm nhất.',
      data,
    };
  }

  @Get('service-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách tất cả yêu cầu tư vấn (Admin Only)' })
  async getAllServiceRequests() {
    const data = await this.adminService.getAllServiceRequests();
    return data;
  }

  @Patch('service-requests/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật trạng thái yêu cầu tư vấn (Admin Only)' })
  async updateServiceRequestStatus(
    @Param('id') id: string,
    @Body() dto: UpdateServiceRequestStatusDto,
  ) {
    const data = await this.adminService.updateServiceRequestStatus(
      id,
      dto.status,
    );
    return { success: true, message: 'Cập nhật trạng thái thành công', data };
  }

  @Delete('service-requests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa yêu cầu tư vấn dịch vụ (Admin Only)' })
  async deleteServiceRequest(@Param('id') id: string) {
    const data = await this.adminService.deleteServiceRequest(id);
    return { success: true, message: 'Xóa yêu cầu tư vấn thành công', data };
  }

  // ─── 2. DASHBOARD METRICS ───
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thống kê tổng quan Admin Dashboard (Admin Only)' })
  async getDashboardStats() {
    const data = await this.adminService.getDashboardStats();
    return data;
  }

  // ─── 3. USER MANAGEMENT CRUD ───
  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách tất cả người dùng (Admin Only)' })
  async getAllUsers() {
    const data = await this.adminService.getAllUsers();
    return data;
  }

  @Patch('users/:id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật phân quyền User Role (Admin Only)' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    if (id === currentUserId) {
      throw new ForbiddenException(
        'Không thể tự thay đổi phân quyền của chính mình!',
      );
    }
    const data = await this.adminService.updateUserRole(id, dto.role);
    return { success: true, message: 'Cập nhật phân quyền thành công', data };
  }

  @Patch('users/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Khóa / Kích hoạt tài khoản người dùng (Admin Only)',
  })
  async toggleUserActiveStatus(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    if (id === currentUserId) {
      throw new ForbiddenException(
        'Không thể tự khóa tài khoản của chính mình!',
      );
    }
    const data = await this.adminService.toggleUserActiveStatus(id);
    return {
      success: true,
      message: 'Thay đổi trạng thái tài khoản thành công',
      data,
    };
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa tài khoản người dùng (Admin Only)' })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    if (id === currentUserId) {
      throw new ForbiddenException(
        'Không thể tự xóa tài khoản của chính mình!',
      );
    }
    const data = await this.adminService.deleteUser(id);
    return {
      success: true,
      message: 'Xóa tài khoản người dùng thành công',
      data,
    };
  }

  @Patch('users/:id/company')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Gán / gỡ Công ty cho tài khoản BUSINESS (Admin Only)',
  })
  async updateUserCompany(
    @Param('id') id: string,
    @Body() dto: AssignUserCompanyDto,
  ) {
    const data = await this.adminService.updateUserCompany(id, dto.companyId);
    return {
      success: true,
      message: 'Cập nhật công ty cho tài khoản thành công',
      data,
    };
  }

  // ─── 4. COURSES MANAGEMENT CRUD ───
  // Trước đây GET /admin/courses bị gắn @Public() — lộ endpoint admin ra ngoài không cần thiết
  // vì đã có GET /courses (CoursesModule) riêng cho public. Đã bỏ @Public(), bắt buộc ADMIN
  // như mọi endpoint admin khác (admin cần thấy cả khóa học isActive=false, public thì không).
  @Get('courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Danh sách tất cả các khóa học CPA Academy, kể cả khóa đã ẩn (Admin Only)',
  })
  async getAllCourses() {
    const data = await this.coursesService.getAllCourses();
    return data;
  }

  @Post('courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Thêm mới khóa học CPA Academy, kèm ảnh cover (Admin Only)',
  })
  @UseInterceptors(FileInterceptor('image', imageUploadOptions('courses')))
  async createCourse(
    @Body() dto: CreateCourseDto,
    @UploadedFile() image: Express.Multer.File | undefined,
  ) {
    const imagePath = image
      ? toPublicUploadPath('courses', image.filename)
      : null;
    const data = await this.coursesService.createCourse(dto, imagePath);
    return { success: true, message: 'Tạo khóa học mới thành công', data };
  }

  @Put('courses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Sửa thông tin khóa học CPA Academy, ảnh tùy chọn (Admin Only)',
  })
  @UseInterceptors(FileInterceptor('image', imageUploadOptions('courses')))
  async updateCourse(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @UploadedFile() image: Express.Multer.File | undefined,
  ) {
    const imagePath = image
      ? toPublicUploadPath('courses', image.filename)
      : null;
    const data = await this.coursesService.updateCourse(id, dto, imagePath);
    return { success: true, message: 'Cập nhật khóa học thành công', data };
  }

  @Delete('courses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa khóa học CPA Academy (Admin Only)' })
  async deleteCourse(@Param('id') id: string) {
    const data = await this.coursesService.deleteCourse(id);
    return { success: true, message: 'Xóa khóa học thành công', data };
  }

  // ─── 4a. COURSE LESSON FILE (PDF) MANAGEMENT ───
  // Gắn/thay file PDF cho 1 bài học đã tồn tại — cần lessonId thật nên chỉ dùng được sau khi
  // module/lesson đã được lưu qua createCourse/updateCourse (CourseModuleDto/CourseLessonDto.id).
  @Post('courses/lessons/:lessonId/file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Gắn/thay file PDF cho 1 bài học (Admin Only)' })
  @UseInterceptors(FileInterceptor('file', lessonFileUploadOptions()))
  async attachLessonFile(
    @Param('lessonId') lessonId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file)
      throw new BadRequestException('Vui lòng chọn file PDF để tải lên.');
    const data = await this.coursesService.attachLessonFile(lessonId, file);
    return { success: true, message: 'Đã gắn tài liệu cho bài học', data };
  }

  @Delete('courses/lessons/:lessonId/file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gỡ file PDF khỏi 1 bài học (Admin Only)' })
  async removeLessonFile(@Param('lessonId') lessonId: string) {
    const data = await this.coursesService.removeLessonFile(lessonId);
    return { success: true, message: 'Đã gỡ tài liệu khỏi bài học', data };
  }

  // ─── 4b. COURSE ENROLLMENTS MANAGEMENT ───
  @Get('enrollments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách tất cả đăng ký khóa học (Admin Only)' })
  async getAllEnrollments() {
    const data = await this.coursesService.getAllEnrollments();
    return data;
  }

  @Patch('enrollments/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật trạng thái đăng ký khóa học (Admin Only)',
  })
  async updateEnrollmentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEnrollmentStatusDto,
  ) {
    const data = await this.coursesService.updateEnrollmentStatus(
      id,
      dto.status,
    );
    return {
      success: true,
      message: 'Cập nhật trạng thái đăng ký thành công',
      data,
    };
  }

  // ─── 4c. SERVICES MANAGEMENT CRUD ───
  @Get('services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Danh sách tất cả dịch vụ, kể cả dịch vụ đã ẩn (Admin Only)',
  })
  async getAllServices() {
    const data = await this.servicesService.getAllServices();
    return data;
  }

  @Post('services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Thêm mới dịch vụ, kèm ảnh cover (Admin Only)' })
  @UseInterceptors(FileInterceptor('image', imageUploadOptions('services')))
  async createService(
    @Body() dto: CreateServiceDto,
    @UploadedFile() image: Express.Multer.File | undefined,
  ) {
    const imagePath = image
      ? toPublicUploadPath('services', image.filename)
      : null;
    const data = await this.servicesService.createService(dto, imagePath);
    return { success: true, message: 'Tạo dịch vụ mới thành công', data };
  }

  @Put('services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Sửa thông tin dịch vụ, ảnh tùy chọn (Admin Only)' })
  @UseInterceptors(FileInterceptor('image', imageUploadOptions('services')))
  async updateService(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
    @UploadedFile() image: Express.Multer.File | undefined,
  ) {
    const imagePath = image
      ? toPublicUploadPath('services', image.filename)
      : null;
    const data = await this.servicesService.updateService(id, dto, imagePath);
    return { success: true, message: 'Cập nhật dịch vụ thành công', data };
  }

  @Delete('services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa dịch vụ (Admin Only)' })
  async deleteService(@Param('id') id: string) {
    const data = await this.servicesService.deleteService(id);
    return { success: true, message: 'Xóa dịch vụ thành công', data };
  }

  // ─── 5. RECRUITMENT ATS CRUD ───
  @Get('applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách hồ sơ ứng tuyển ATS (Admin Only)' })
  async getAllJobApplications() {
    const data = await this.adminService.getAllJobApplications();
    return data;
  }

  @Patch('applications/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật trạng thái duyệt hồ sơ ứng viên (Admin Only)',
  })
  async updateJobApplicationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateJobApplicationStatusDto,
  ) {
    const data = await this.adminService.updateJobApplicationStatus(
      id,
      dto.status,
    );
    return {
      success: true,
      message: 'Cập nhật trạng thái hồ sơ thành công',
      data,
    };
  }

  @Delete('applications/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa hồ sơ ứng tuyển (Admin Only)' })
  async deleteJobApplication(@Param('id') id: string) {
    const data = await this.adminService.deleteJobApplication(id);
    return { success: true, message: 'Xóa hồ sơ ứng tuyển thành công', data };
  }

  // ─── 5b. DUYỆT YÊU CẦU XEM LIÊN HỆ ỨNG VIÊN (BUSINESS gửi qua candidates/:id/introduction-request) ───
  @Get('candidate-introduction-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Danh sách yêu cầu xem liên hệ ứng viên do BUSINESS gửi (Admin Only)',
  })
  async getAllCandidateIntroductionRequests(@Query('status') status?: string) {
    const data =
      await this.recruitmentService.getAllIntroductionRequests(status);
    return data;
  }

  @Patch('candidate-introduction-requests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Duyệt/Từ chối yêu cầu xem liên hệ ứng viên (Admin Only)',
  })
  async reviewCandidateIntroductionRequest(
    @Param('id') id: string,
    @Body() dto: ReviewCandidateIntroductionRequestDto,
  ) {
    const data = await this.recruitmentService.reviewIntroductionRequest(
      id,
      dto,
    );
    return {
      success: true,
      message: 'Xử lý yêu cầu xem liên hệ ứng viên thành công',
      data,
    };
  }

  // ─── 6. JOB POSTINGS CRUD (xuất bản tin tuyển dụng thật, có ảnh — Admin Only) ───
  @Get('jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Danh sách tất cả tin tuyển dụng, kể cả tin đã ẩn (Admin Only)',
  })
  async getAllJobPostings() {
    const data = await this.recruitmentService.getAllJobPostings();
    return data;
  }

  @Post('jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Xuất bản tin tuyển dụng mới, kèm ảnh (Admin Only)',
  })
  @UseInterceptors(FileInterceptor('image', imageUploadOptions('jobs')))
  async createJobPosting(
    @Body() dto: CreateJobPostingDto,
    @UploadedFile() image: Express.Multer.File | undefined,
  ) {
    const imagePath = image ? toPublicUploadPath('jobs', image.filename) : null;
    const data = await this.recruitmentService.createJobPosting(dto, imagePath);
    return {
      success: true,
      message: 'Xuất bản tin tuyển dụng thành công',
      data,
    };
  }

  @Put('jobs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Cập nhật tin tuyển dụng, ảnh tùy chọn (Admin Only)',
  })
  @UseInterceptors(FileInterceptor('image', imageUploadOptions('jobs')))
  async updateJobPosting(
    @Param('id') id: string,
    @Body() dto: UpdateJobPostingDto,
    @UploadedFile() image: Express.Multer.File | undefined,
  ) {
    const imagePath = image ? toPublicUploadPath('jobs', image.filename) : null;
    const data = await this.recruitmentService.updateJobPosting(
      id,
      dto,
      imagePath,
    );
    return {
      success: true,
      message: 'Cập nhật tin tuyển dụng thành công',
      data,
    };
  }

  @Delete('jobs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gỡ tin tuyển dụng (Admin Only)' })
  async deleteJobPosting(@Param('id') id: string) {
    const data = await this.recruitmentService.deleteJobPosting(id);
    return { success: true, message: 'Gỡ tin tuyển dụng thành công', data };
  }

  // ─── 7. POSTS CRUD (quản lý bài viết Tin tức, có ảnh cover — Admin Only) ───
  @Get('posts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Danh sách tất cả bài viết, kể cả bài chưa xuất bản (Admin Only)',
  })
  async getAllPosts() {
    const data = await this.postsService.getAllPosts();
    return data;
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Đăng bài viết mới, kèm ảnh cover (Admin Only)' })
  @UseInterceptors(FileInterceptor('image', imageUploadOptions('posts')))
  async createPost(
    @Body() dto: CreatePostDto,
    @UploadedFile() image: Express.Multer.File | undefined,
  ) {
    const imagePath = image
      ? toPublicUploadPath('posts', image.filename)
      : null;
    const data = await this.postsService.createPost(dto, imagePath);
    return { success: true, message: 'Đăng bài viết thành công', data };
  }

  @Put('posts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Cập nhật bài viết, ảnh tùy chọn (Admin Only)' })
  @UseInterceptors(FileInterceptor('image', imageUploadOptions('posts')))
  async updatePost(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @UploadedFile() image: Express.Multer.File | undefined,
  ) {
    const imagePath = image
      ? toPublicUploadPath('posts', image.filename)
      : null;
    const data = await this.postsService.updatePost(id, dto, imagePath);
    return { success: true, message: 'Cập nhật bài viết thành công', data };
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa bài viết (Admin Only)' })
  async deletePost(@Param('id') id: string) {
    const data = await this.postsService.deletePost(id);
    return { success: true, message: 'Xóa bài viết thành công', data };
  }

  // ─── 8. FORUM MODERATION (Danh mục + Kiểm duyệt chủ đề/trả lời — Admin Only) ───
  @Get('forum/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Danh sách tất cả danh mục diễn đàn, kể cả đã ẩn (Admin Only)',
  })
  async getAllForumCategories() {
    const data = await this.forumService.getAllCategories();
    return data;
  }

  @Post('forum/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm mới danh mục diễn đàn (Admin Only)' })
  async createForumCategory(@Body() dto: CreateForumCategoryDto) {
    const data = await this.forumService.createCategory(dto);
    return { success: true, message: 'Tạo danh mục diễn đàn thành công', data };
  }

  @Put('forum/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sửa danh mục diễn đàn (Admin Only)' })
  async updateForumCategory(
    @Param('id') id: string,
    @Body() dto: UpdateForumCategoryDto,
  ) {
    const data = await this.forumService.updateCategory(id, dto);
    return {
      success: true,
      message: 'Cập nhật danh mục diễn đàn thành công',
      data,
    };
  }

  @Delete('forum/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Xóa danh mục diễn đàn, chặn nếu còn chủ đề (Admin Only)',
  })
  async deleteForumCategory(@Param('id') id: string) {
    const data = await this.forumService.deleteCategory(id);
    return { success: true, message: 'Xóa danh mục diễn đàn thành công', data };
  }

  @Get('forum/topics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Danh sách tất cả chủ đề diễn đàn để kiểm duyệt (Admin Only)',
  })
  async getAllForumTopics() {
    const data = await this.forumService.getAllTopicsForAdmin();
    return data;
  }

  @Get('forum/topics/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Xem chi tiết + replies của 1 chủ đề để kiểm duyệt, không tăng lượt xem công khai (Admin Only)',
  })
  async getForumTopicForAdmin(@Param('id') id: string) {
    const data = await this.forumService.getTopicByIdForAdmin(id);
    return { success: true, data };
  }

  @Patch('forum/topics/:id/pin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ghim / Bỏ ghim chủ đề diễn đàn (Admin Only)' })
  async setForumTopicPinned(
    @Param('id') id: string,
    @Body() dto: SetTopicFlagDto,
  ) {
    const data = await this.forumService.setTopicPinned(id, dto.value);
    return {
      success: true,
      message: 'Cập nhật trạng thái ghim thành công',
      data,
    };
  }

  @Patch('forum/topics/:id/lock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khóa / Mở khóa chủ đề diễn đàn (Admin Only)' })
  async setForumTopicLocked(
    @Param('id') id: string,
    @Body() dto: SetTopicFlagDto,
  ) {
    const data = await this.forumService.setTopicLocked(id, dto.value);
    return {
      success: true,
      message: 'Cập nhật trạng thái khóa thành công',
      data,
    };
  }

  @Delete('forum/topics/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa chủ đề diễn đàn vi phạm (Admin Only)' })
  async adminDeleteForumTopic(@Param('id') id: string) {
    const data = await this.forumService.adminDeleteTopic(id);
    return { success: true, message: 'Xóa chủ đề diễn đàn thành công', data };
  }

  @Delete('forum/replies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa trả lời diễn đàn vi phạm (Admin Only)' })
  async adminDeleteForumReply(@Param('id') id: string) {
    const data = await this.forumService.adminDeleteReply(id);
    return { success: true, message: 'Xóa trả lời diễn đàn thành công', data };
  }

  // ─── 9. COMPANIES MANAGEMENT (Cổng Khách Hàng — Admin Only) ───
  @Get('companies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách tất cả công ty khách hàng (Admin Only)' })
  async getAllCompanies() {
    const data = await this.companiesService.getAllCompanies();
    return data;
  }

  @Post('companies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm mới công ty khách hàng (Admin Only)' })
  async createCompany(@Body() dto: CreateCompanyDto) {
    const data = await this.companiesService.createCompany(dto);
    return { success: true, message: 'Tạo công ty thành công', data };
  }

  @Put('companies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sửa thông tin công ty khách hàng (Admin Only)' })
  async updateCompany(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    const data = await this.companiesService.updateCompany(id, dto);
    return { success: true, message: 'Cập nhật công ty thành công', data };
  }

  @Delete('companies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Xóa công ty, chặn nếu còn user/chứng từ liên kết (Admin Only)',
  })
  async deleteCompany(@Param('id') id: string) {
    const data = await this.companiesService.deleteCompany(id);
    return { success: true, message: 'Xóa công ty thành công', data };
  }

  @Get('company-link-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Danh sách yêu cầu liên kết công ty do BUSINESS tự gửi (Admin Only)',
  })
  async getAllCompanyLinkRequests(@Query('status') status?: string) {
    const data = await this.companiesService.getAllLinkRequests(status);
    return data;
  }

  @Patch('company-link-requests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Duyệt/Từ chối yêu cầu liên kết công ty (Admin Only)',
  })
  async reviewCompanyLinkRequest(
    @Param('id') id: string,
    @Body() dto: ReviewLinkRequestDto,
  ) {
    const data = await this.companiesService.reviewLinkRequest(id, dto);
    return {
      success: true,
      message: 'Xử lý yêu cầu liên kết công ty thành công',
      data,
    };
  }

  // ─── 10. DOCUMENTS MANAGEMENT (Chứng Từ Khách Hàng — Admin Only) ───
  @Get('documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Danh sách toàn bộ chứng từ khách hàng, lọc theo company/status (Admin Only)',
  })
  async getAllDocuments(
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.documentsService.getAllDocuments(companyId, status);
    return data;
  }

  @Patch('documents/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật trạng thái xử lý chứng từ (Admin Only)' })
  async updateDocumentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentStatusDto,
  ) {
    const data = await this.documentsService.updateDocumentStatus(id, dto);
    return {
      success: true,
      message: 'Cập nhật trạng thái chứng từ thành công',
      data,
    };
  }

  @Get('documents/:id/download')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tải xuống chứng từ bất kỳ công ty nào (Admin Only)',
  })
  async adminDownloadDocument(@Param('id') id: string, @Res() res: Response) {
    const document = await this.documentsService.getDocumentForAccess(
      id,
      null,
      Role.ADMIN,
    );
    if (!fs.existsSync(document.fileUrl)) {
      throw new NotFoundException(
        'File chứng từ không còn tồn tại trên máy chủ.',
      );
    }
    res.download(document.fileUrl, document.fileName);
  }

  @Delete('documents/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa chứng từ khách hàng (Admin Only)' })
  async adminDeleteDocument(@Param('id') id: string) {
    const data = await this.documentsService.adminDeleteDocument(id);
    return { success: true, message: 'Xóa chứng từ thành công', data };
  }

  // Gắn/thay file KẾT QUẢ trả lại khách hàng (báo cáo, chứng từ đã xử lý...) — tách khỏi file gốc
  // khách hàng tải lên, khách hàng tự tải qua GET /documents/:id/result-file.
  @Post('documents/:id/result-file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Gắn/thay file kết quả trả lại khách hàng cho 1 chứng từ (Admin Only)',
  })
  @UseInterceptors(FileInterceptor('file', documentResultUploadOptions()))
  async attachDocumentResultFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file)
      throw new BadRequestException('Vui lòng chọn file kết quả để tải lên.');
    const data = await this.documentsService.attachResultFile(id, file);
    return {
      success: true,
      message: 'Đã gắn file kết quả — email thông báo đã gửi tới khách hàng',
      data,
    };
  }

  @Delete('documents/:id/result-file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gỡ file kết quả khỏi 1 chứng từ (Admin Only)' })
  async removeDocumentResultFile(@Param('id') id: string) {
    const data = await this.documentsService.removeResultFile(id);
    return { success: true, message: 'Đã gỡ file kết quả', data };
  }

  // ─── 10. CHAT LOGS (xem lại hội thoại của Chatbot tư vấn — Admin Only) ───
  @Get('chat/conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Danh sách hội thoại chatbot, mới nhất trước (Admin Only)',
  })
  async listChatConversations(@Query('page') page?: string) {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const data = await this.chatService.listConversationsForAdmin(pageNum, 20);
    return { success: true, data };
  }

  @Get('chat/conversations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Chi tiết 1 hội thoại chatbot, đầy đủ tin nhắn (Admin Only)',
  })
  async getChatConversation(@Param('id') id: string) {
    const data = await this.chatService.getConversationForAdmin(id);
    return { success: true, data };
  }
}
