import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'node:fs';
import { Role } from '@prisma/client';
import { CoursesService } from './courses.service.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // Danh sách khóa học đang mở — công khai, dùng cho trang /dao-tao.
  @Public()
  @Get()
  async getActiveCourses(@Query('category') category?: string) {
    return this.coursesService.getActiveCourses(category);
  }

  // Khóa học của tôi (role MEMBER) — PHẢI khai báo trước route ':slug' bên dưới, nếu không
  // ':slug' (wildcard) sẽ nuốt mất path literal 'me/enrollments' (NestJS khớp route theo thứ tự
  // khai báo trong controller).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MEMBER)
  @Get('me/enrollments')
  async getMyEnrollments(@CurrentUser('id') userId: string) {
    return this.coursesService.getMyEnrollments(userId);
  }

  // Tải file PDF tài liệu bài học — công khai, không yêu cầu đăng nhập/đóng học phí (khóa học đào
  // tạo offline, tài liệu chỉ mang tính hỗ trợ ôn tập thêm — khớp cách cpahcm.com.vn/khoa-dao-tao
  // cho tải brochure/tài liệu công khai không cần đăng nhập).
  @Public()
  @Get('lessons/:lessonId/file')
  async downloadLessonFile(
    @Param('lessonId') lessonId: string,
    @Res() res: Response,
  ) {
    const file = await this.coursesService.getLessonFileForDownload(lessonId);
    if (!fs.existsSync(file.path)) {
      throw new NotFoundException(
        'File tài liệu không còn tồn tại trên máy chủ.',
      );
    }
    res.download(file.path, file.fileName);
  }

  // Chi tiết 1 khóa học theo slug (kèm giáo trình) — công khai, dùng cho /dao-tao/[slug].
  @Public()
  @Get(':slug')
  async getCourseBySlug(@Param('slug') slug: string) {
    return this.coursesService.getCourseBySlug(slug);
  }

  // Khóa học liên quan (cùng chuyên mục) hiển thị ở cuối trang chi tiết.
  @Public()
  @Get(':slug/related')
  async getRelatedCourses(@Param('slug') slug: string) {
    return this.coursesService.getRelatedCourses(slug);
  }

  // Đăng ký khóa học (role MEMBER, bắt buộc đăng nhập) — ADMIN bypass theo RolesGuard hiện tại.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MEMBER)
  @Post(':id/enroll')
  async enroll(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.coursesService.enroll(id, userId);
  }
}
