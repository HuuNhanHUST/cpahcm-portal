import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('CoursesService', () => {
  let service: CoursesService;
  let prisma: {
    course: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    courseEnrollment: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
    };
    courseModule: {
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
    courseLesson: {
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      course: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      courseEnrollment: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      courseModule: {
        deleteMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn(),
      },
      courseLesson: {
        deleteMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn(),
      },
      // enroll() chạy trong prisma.$transaction(async (tx) => ...) — mock chạy callback ngay,
      // truyền lại chính object `prisma` giả làm `tx` vì test chỉ mock courseEnrollment.findFirst/
      // create dùng chung, không cần transaction thật trong unit test (DB thật không tồn tại ở đây).
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: prisma },
        // getOrSet(key, ttl, fn) chỉ cần gọi thẳng fn() bỏ qua cache — đủ để test logic thật
        // bên trong service mà không cần Redis thật chạy trong unit test.
        { provide: RedisService, useValue: { getOrSet: jest.fn((_k: string, _t: number, fn: () => unknown) => fn()) } },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  describe('enroll', () => {
    it('throw NotFoundException nếu khóa học không tồn tại', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(service.enroll('course-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.courseEnrollment.create).not.toHaveBeenCalled();
    });

    it('throw NotFoundException nếu khóa học đã đóng (isActive=false)', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'course-1',
        isActive: false,
      });
      await expect(service.enroll('course-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.courseEnrollment.create).not.toHaveBeenCalled();
    });

    it('throw ConflictException nếu user đã có enrollment PENDING/PAID/STUDYING cho khóa học này', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'course-1',
        isActive: true,
      });
      prisma.courseEnrollment.findFirst.mockResolvedValue({
        id: 'enr-1',
        status: 'PENDING',
      });

      await expect(service.enroll('course-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.courseEnrollment.create).not.toHaveBeenCalled();
    });

    it('tạo enrollment mới với status PENDING khi hợp lệ', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'course-1',
        isActive: true,
      });
      prisma.courseEnrollment.findFirst.mockResolvedValue(null);
      prisma.courseEnrollment.create.mockResolvedValue({
        id: 'enr-new',
        status: 'PENDING',
      });

      const result = await service.enroll('course-1', 'user-1');

      expect(prisma.courseEnrollment.create).toHaveBeenCalledWith({
        data: { courseId: 'course-1', userId: 'user-1', status: 'PENDING' },
      });
      expect(result.status).toBe('PENDING');
    });

    it('race condition: 2 request cùng lúc — Postgres báo P2034 (Serializable conflict) → quy về ConflictException', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'course-1',
        isActive: true,
      });
      prisma.$transaction.mockRejectedValue(
        Object.assign(new Error('Transaction failed due to a write conflict'), {
          code: 'P2034',
        }),
      );

      await expect(service.enroll('course-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('check + create nằm trong prisma.$transaction với isolation Serializable', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'course-1',
        isActive: true,
      });
      prisma.courseEnrollment.findFirst.mockResolvedValue(null);
      prisma.courseEnrollment.create.mockResolvedValue({
        id: 'enr-new',
        status: 'PENDING',
      });

      await service.enroll('course-1', 'user-1');

      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ isolationLevel: expect.anything() }),
      );
    });

    it('cho phép enroll lại nếu enrollment cũ đã COMPLETED/CANCELLED (không còn active)', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'course-1',
        isActive: true,
      });
      // findFirst chỉ query status in [PENDING, PAID, STUDYING] — enrollment COMPLETED không khớp filter nên trả null
      prisma.courseEnrollment.findFirst.mockResolvedValue(null);
      prisma.courseEnrollment.create.mockResolvedValue({
        id: 'enr-2',
        status: 'PENDING',
      });

      await expect(service.enroll('course-1', 'user-1')).resolves.toBeDefined();
      expect(prisma.courseEnrollment.create).toHaveBeenCalled();
    });
  });

  describe('deleteCourse', () => {
    it('throw NotFoundException nếu khóa học không tồn tại', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(service.deleteCourse('course-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throw ConflictException nếu khóa học đã có học viên đăng ký — không cho xóa cứng', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'course-1',
        imageUrl: null,
        _count: { enrollments: 3 },
      });
      await expect(service.deleteCourse('course-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.course.delete).not.toHaveBeenCalled();
    });

    it('cho phép xóa khi chưa có học viên đăng ký', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'course-1',
        imageUrl: null,
        _count: { enrollments: 0 },
      });
      prisma.course.delete.mockResolvedValue({ id: 'course-1' });

      await service.deleteCourse('course-1');
      expect(prisma.course.delete).toHaveBeenCalledWith({
        where: { id: 'course-1' },
      });
    });
  });

  describe('getCourseBySlug', () => {
    it('throw NotFoundException nếu khóa học đã ẩn (isActive=false)', async () => {
      prisma.course.findUnique.mockResolvedValue({
        slug: 'x',
        isActive: false,
      });
      await expect(service.getCourseBySlug('x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
