import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import {
  UPLOADS_ROOT,
  PRIVATE_UPLOADS_ROOT,
} from '../common/config/upload.config.js';
import { slugify } from '../common/utils/slugify.util.js';
import { sanitizeRichText } from '../common/utils/sanitize-html.util.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { CourseModuleDto } from './dto/course-module.dto.js';

/** Các trạng thái enrollment vẫn coi là "đang theo học" — chặn đăng ký trùng khi còn ở trạng thái này. */
const ACTIVE_ENROLLMENT_STATUSES = ['PENDING', 'PAID', 'STUDYING'];

/** TTL cache Redis cho các danh sách công khai — xem giải thích chung ở RedisService.getOrSet. */
const LISTING_CACHE_TTL_SECONDS = 60;

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ── Public reads ─────────────────────────────────────────────────────────
  async getActiveCourses(category?: string) {
    return this.redis.getOrSet(
      `courses:list:${category || 'ALL'}`,
      LISTING_CACHE_TTL_SECONDS,
      async () => {
        const where: any = { isActive: true };
        if (category && category !== 'ALL') where.category = category;
        return this.prisma.course.findMany({
          where,
          orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
        });
      },
    );
  }

  // Public — khóa học ĐÀO TẠO OFFLINE (học viên tới lớp trực tiếp), tài liệu ôn tập (video/PDF)
  // chỉ mang tính hỗ trợ thêm nên công khai luôn, không khóa sau "đóng học phí" — khớp đúng cách
  // trang chính thức cpahcm.com.vn/khoa-dao-tao trình bày (tài liệu tải công khai, không cần đăng
  // nhập). Trước đây có cơ chế khóa nội dung theo enrollment PAID/STUDYING/COMPLETED — đã bỏ.
  async getCourseBySlug(slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                videoUrl: true,
                fileName: true,
                order: true,
                fileUrl: true,
              },
            },
          },
        },
      },
    });
    if (!course || !course.isActive) {
      throw new NotFoundException('Khóa học không tồn tại hoặc đã đóng.');
    }
    return {
      ...course,
      modules: course.modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          videoUrl: l.videoUrl,
          fileName: l.fileName,
          hasFile: !!l.fileUrl,
          order: l.order,
        })),
      })),
    };
  }

  /** Trả đường dẫn đĩa + tên file gốc để tải tài liệu bài học — công khai, không yêu cầu đăng
   * nhập/đóng học phí (xem lý do ở getCourseBySlug). */
  async getLessonFileForDownload(lessonId: string) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: {
        module: { include: { course: { select: { isActive: true } } } },
      },
    });
    if (!lesson || !lesson.fileUrl)
      throw new NotFoundException('Tài liệu không tồn tại.');
    // getCourseBySlug() đã ẩn khóa học isActive=false khỏi trang public — nếu route tải file này
    // không kiểm tra lại, link cũ (đã chia sẻ/lưu trước khi ẩn, hoặc bị crawler lưu cache) vẫn tải
    // được mãi mãi dù khóa học đã bị ẩn, làm vô hiệu hóa chính việc "ẩn" đó.
    if (!lesson.module.course.isActive)
      throw new NotFoundException('Tài liệu không tồn tại.');
    return {
      path: lesson.fileUrl,
      fileName: lesson.fileName || 'tai-lieu.pdf',
    };
  }

  async getRelatedCourses(slug: string, limit = 4) {
    return this.redis.getOrSet(
      `courses:related:${slug}:${limit}`,
      LISTING_CACHE_TTL_SECONDS,
      async () => {
        const course = await this.prisma.course.findUnique({ where: { slug } });
        if (!course) return [];
        return this.prisma.course.findMany({
          where: {
            isActive: true,
            slug: { not: slug },
            category: course.category,
          },
          orderBy: { displayOrder: 'asc' },
          take: limit,
        });
      },
    );
  }

  // ── Enrollment (MEMBER, bắt buộc đăng nhập) ─────────────────────────────
  // Khóa học của tôi — MEMBER xem lại trạng thái đăng ký (PENDING/PAID/STUDYING/COMPLETED)
  // của chính mình, kèm thông tin khóa học để hiển thị (title/imageUrl/instructor...).
  async getMyEnrollments(userId: string) {
    return this.prisma.courseEnrollment.findMany({
      where: { userId },
      include: { course: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async enroll(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course || !course.isActive) {
      throw new NotFoundException('Khóa học không tồn tại hoặc đã đóng.');
    }

    // Check "đã đăng ký chưa" + create nằm trong 1 transaction Serializable — nếu không, 2
    // request đăng ký gần như đồng thời (double-click, double-tap) đều có thể vượt qua check
    // findFirst trước khi request kia kịp insert, tạo ra 2 enrollment PENDING trùng nhau (không
    // có @@unique([userId, courseId]) ở schema vì nghiệp vụ cho phép học lại sau khi
    // COMPLETED/CANCELLED, nên không thể chặn bằng unique constraint đơn thuần). Serializable
    // isolation khiến Postgres tự phát hiện xung đột ghi giữa 2 transaction cùng lúc và abort
    // 1 trong 2 — bên thua cuộc nhận lỗi P2034, ta quy về đúng thông báo "đã đăng ký rồi".
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.courseEnrollment.findFirst({
            where: {
              courseId,
              userId,
              status: { in: ACTIVE_ENROLLMENT_STATUSES },
            },
          });
          if (existing) {
            throw new ConflictException('Bạn đã đăng ký khóa học này rồi.');
          }
          return tx.courseEnrollment.create({
            data: { courseId, userId, status: 'PENDING' },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err: any) {
      if (err instanceof ConflictException) throw err;
      if (err?.code === 'P2034') {
        throw new ConflictException('Bạn đã đăng ký khóa học này rồi.');
      }
      throw err;
    }
  }

  // ── Admin CRUD ────────────────────────────────────────────────────────────
  async getAllCourses() {
    return this.prisma.course.findMany({
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
        _count: { select: { enrollments: true } },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  private async generateUniqueSlug(
    title: string,
    providedSlug?: string,
  ): Promise<string> {
    const base = providedSlug ? slugify(providedSlug) : slugify(title);
    let candidate = base;
    let suffix = 2;
    while (
      await this.prisma.course.findUnique({ where: { slug: candidate } })
    ) {
      candidate = `${base}-${suffix}`;
      suffix++;
    }
    return candidate;
  }

  async createCourse(dto: CreateCourseDto, imagePath: string | null) {
    const slug = await this.generateUniqueSlug(dto.title, dto.slug);
    const course = await this.prisma.course.create({
      data: {
        title: dto.title,
        slug,
        category: dto.category,
        tag: dto.tag ?? null,
        description: dto.description ?? null,
        longDescription: sanitizeRichText(dto.longDescription),
        imageUrl: imagePath,
        instructor: dto.instructor ?? null,
        price: dto.price,
        originalPrice: dto.originalPrice ?? null,
        lessons: dto.lessons ?? 0,
        hours: dto.hours ?? 0,
        level: dto.level ?? null,
        schedule: dto.schedule ?? null,
        isHot: dto.isHot ?? false,
        isActive: dto.isActive ?? true,
      },
    });

    if (dto.modules?.length) {
      await this.syncModules(course.id, dto.modules);
    }

    return this.prisma.course.findUnique({
      where: { id: course.id },
      include: {
        modules: {
          include: { lessons: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async updateCourse(
    id: string,
    dto: UpdateCourseDto,
    imagePath: string | null,
  ) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Khóa học không tồn tại.');

    if (imagePath && course.imageUrl) this.deleteUploadedFile(course.imageUrl);

    let slug = course.slug;
    if (dto.slug && dto.slug !== course.slug) {
      slug = await this.generateUniqueSlug(dto.title ?? course.title, dto.slug);
    }

    // IsGreaterThanField chỉ so sánh 2 field trong CÙNG request body — với partial update (chỉ gửi
    // 1 trong 2 field), nó không thấy được giá trị đã lưu trong DB nên bỏ qua kiểm tra. Phải so
    // sánh lại ở đây bằng giá trị SAU KHI merge với dữ liệu cũ mới bắt đúng trường hợp gửi thiếu.
    const finalPrice = dto.price ?? course.price;
    const finalOriginalPrice = dto.originalPrice ?? course.originalPrice;
    if (
      finalOriginalPrice != null &&
      Number(finalOriginalPrice) <= Number(finalPrice)
    ) {
      throw new BadRequestException('Giá gốc phải lớn hơn học phí hiện tại.');
    }

    await this.prisma.course.update({
      where: { id },
      data: {
        title: dto.title ?? course.title,
        slug,
        category: dto.category ?? course.category,
        tag: dto.tag ?? course.tag,
        description: dto.description ?? course.description,
        longDescription:
          dto.longDescription !== undefined
            ? sanitizeRichText(dto.longDescription)
            : course.longDescription,
        imageUrl: imagePath ?? course.imageUrl,
        instructor: dto.instructor ?? course.instructor,
        price: dto.price ?? course.price,
        originalPrice: dto.originalPrice ?? course.originalPrice,
        lessons: dto.lessons ?? course.lessons,
        hours: dto.hours ?? course.hours,
        level: dto.level ?? course.level,
        schedule: dto.schedule ?? course.schedule,
        isHot: dto.isHot ?? course.isHot,
        isActive: dto.isActive ?? course.isActive,
      },
    });

    // Giáo trình dùng upsert-by-id (syncModules), KHÔNG replace-all — cách cũ (xóa hết module rồi
    // tạo lại) sẽ xóa mất videoUrl/fileUrl đã gắn cho từng bài học mỗi lần Admin lưu khóa học, kể cả
    // khi chỉ sửa những field không liên quan (giá tiền, mô tả...).
    if (dto.modules !== undefined) {
      await this.syncModules(id, dto.modules);
    }

    return this.prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          include: { lessons: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Đồng bộ modules/lessons theo id (upsert), thay vì xóa hết tạo lại — bảo toàn videoUrl/fileUrl
   * đã gắn cho các bài học không đổi. Module/lesson vắng mặt trong payload mới coi là bị xóa; file
   * PDF đính kèm (nếu có) được dọn khỏi đĩa trước khi xóa bản ghi.
   */
  private async syncModules(courseId: string, modules: CourseModuleDto[]) {
    const existingModules = await this.prisma.courseModule.findMany({
      where: { courseId },
      select: { id: true },
    });
    const keepModuleIds = new Set(
      modules.filter((m) => m.id).map((m) => m.id as string),
    );
    const modulesToDelete = existingModules
      .filter((m) => !keepModuleIds.has(m.id))
      .map((m) => m.id);

    if (modulesToDelete.length) {
      const lessonsToClean = await this.prisma.courseLesson.findMany({
        where: { moduleId: { in: modulesToDelete }, fileUrl: { not: null } },
      });
      lessonsToClean.forEach(
        (l) => l.fileUrl && this.deleteLessonFile(l.fileUrl),
      );
      await this.prisma.courseModule.deleteMany({
        where: { id: { in: modulesToDelete } },
      });
    }

    for (let i = 0; i < modules.length; i++) {
      const m = modules[i];
      let moduleId = m.id;
      if (moduleId) {
        // updateMany + where courseId (thay vì update({ where: { id } })) — CHỐT quyền sở hữu: nếu
        // admin gửi 1 moduleId thuộc course KHÁC (cố tình hay do bug FE), updateMany trả count=0
        // thay vì âm thầm sửa nhầm module của course khác. Không dùng update() vì where của nó chỉ
        // nhận field @unique, không ghép được điều kiện courseId.
        const { count } = await this.prisma.courseModule.updateMany({
          where: { id: moduleId, courseId },
          data: { title: m.title, order: i },
        });
        if (count === 0) {
          throw new NotFoundException(
            `Module "${m.title}" không thuộc khóa học này.`,
          );
        }
      } else {
        const created = await this.prisma.courseModule.create({
          data: { courseId, title: m.title, order: i },
        });
        moduleId = created.id;
      }

      const existingLessons = await this.prisma.courseLesson.findMany({
        where: { moduleId },
        select: { id: true, fileUrl: true },
      });
      const keepLessonIds = new Set(
        m.lessons.filter((l) => l.id).map((l) => l.id as string),
      );
      const lessonsToDelete = existingLessons.filter(
        (l) => !keepLessonIds.has(l.id),
      );
      lessonsToDelete.forEach(
        (l) => l.fileUrl && this.deleteLessonFile(l.fileUrl),
      );
      if (lessonsToDelete.length) {
        await this.prisma.courseLesson.deleteMany({
          where: { id: { in: lessonsToDelete.map((l) => l.id) } },
        });
      }

      for (let j = 0; j < m.lessons.length; j++) {
        const l = m.lessons[j];
        if (l.id) {
          // Cùng lý do với module ở trên — chốt lessonId phải thuộc ĐÚNG module đang xử lý.
          const { count } = await this.prisma.courseLesson.updateMany({
            where: { id: l.id, moduleId },
            data: { title: l.title, videoUrl: l.videoUrl ?? null, order: j },
          });
          if (count === 0) {
            throw new NotFoundException(
              `Bài học "${l.title}" không thuộc module này.`,
            );
          }
        } else {
          await this.prisma.courseLesson.create({
            data: {
              moduleId,
              title: l.title,
              videoUrl: l.videoUrl ?? null,
              order: j,
            },
          });
        }
      }
    }
  }

  async deleteCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại.');
    if (course._count.enrollments > 0) {
      throw new ConflictException(
        'Khóa học đã có học viên đăng ký, không thể xóa. Vui lòng ẩn khóa học (isActive) thay vì xóa.',
      );
    }
    if (course.imageUrl) this.deleteUploadedFile(course.imageUrl);

    // Dọn file PDF của mọi bài học trước khi xóa course — CourseModule/CourseLesson cascade-delete
    // ở DB (schema.prisma onDelete: Cascade) nhưng chỉ xóa BẢN GHI, không tự xóa file vật lý trên
    // đĩa, để lại file mồ côi trong PRIVATE_UPLOADS_ROOT nếu không dọn thủ công ở đây.
    const lessonsToClean = await this.prisma.courseLesson.findMany({
      where: { module: { courseId: id }, fileUrl: { not: null } },
    });
    lessonsToClean.forEach(
      (l) => l.fileUrl && this.deleteLessonFile(l.fileUrl),
    );

    return this.prisma.course.delete({ where: { id } });
  }

  // ── Admin — Enrollment management ────────────────────────────────────────
  async getAllEnrollments() {
    return this.prisma.courseEnrollment.findMany({
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        course: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateEnrollmentStatus(id: string, status: string) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id },
    });
    if (!enrollment)
      throw new NotFoundException('Đăng ký khóa học không tồn tại.');

    // Chặn đổi trạng thái NGƯỢC ra khỏi COMPLETED — nếu cho phép COMPLETED → PENDING tùy tiện thì
    // lịch sử "đã hoàn thành khóa học" mất ý nghĩa, cùng nguyên tắc bất biến đã áp dụng cho
    // Document.status (documents.service.ts).
    if (enrollment.status === 'COMPLETED' && status !== 'COMPLETED') {
      throw new BadRequestException(
        'Đăng ký đã hoàn thành khóa học không thể đổi lại trạng thái khác.',
      );
    }

    return this.prisma.courseEnrollment.update({
      where: { id },
      data: { status },
    });
  }

  // ── Admin — Lesson file management ──────────────────────────────────────
  // Gắn/thay file PDF cho 1 bài học — xóa file cũ (nếu có) trước khi ghi đường dẫn mới, tránh
  // rác file mồ côi trên đĩa.
  async attachLessonFile(
    lessonId: string,
    file: { path: string; originalname: string },
  ) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại.');
    if (lesson.fileUrl) this.deleteLessonFile(lesson.fileUrl);
    return this.prisma.courseLesson.update({
      where: { id: lessonId },
      data: { fileUrl: file.path, fileName: file.originalname },
    });
  }

  async removeLessonFile(lessonId: string) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại.');
    if (lesson.fileUrl) this.deleteLessonFile(lesson.fileUrl);
    return this.prisma.courseLesson.update({
      where: { id: lessonId },
      data: { fileUrl: null, fileName: null },
    });
  }

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

  /** Xóa file PDF bài học khỏi PRIVATE_UPLOADS_ROOT theo đường dẫn nội bộ lưu ở CourseLesson.fileUrl. */
  private deleteLessonFile(internalPath: string): void {
    fs.unlink(internalPath, () => {
      // Bỏ qua lỗi (file có thể đã bị xóa thủ công) — không chặn luồng chính vì việc này.
    });
  }
}
