import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { RecruitmentService } from './recruitment.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('RecruitmentService', () => {
  let service: RecruitmentService;
  let prisma: {
    jobPosting: { findUnique: jest.Mock };
    jobApplication: { findFirst: jest.Mock; create: jest.Mock };
    candidateProfile: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    candidateExperience: { deleteMany: jest.Mock };
    candidateEducation: { deleteMany: jest.Mock };
    candidateReference: { deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      jobPosting: { findUnique: jest.fn() },
      jobApplication: { findFirst: jest.fn(), create: jest.fn() },
      candidateProfile: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      candidateExperience: { deleteMany: jest.fn() },
      candidateEducation: { deleteMany: jest.fn() },
      candidateReference: { deleteMany: jest.fn() },
      // $transaction(fn) mô phỏng transaction thật bằng cách gọi callback với chính `prisma` mock
      // làm `tx` — đủ để test logic bên trong transaction (applyJob) mà không cần Postgres thật.
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    const redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      getOrSet: jest.fn((_key: string, _ttl: number, fn: () => any) => fn()),
      delByPrefix: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruitmentService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<RecruitmentService>(RecruitmentService);
  });

  describe('applyJob', () => {
    const dto = {
      jobId: 'job-1',
      fullName: 'A',
      phone: '0900000000',
      email: 'a@b.com',
      cvUrl: 'cv.pdf',
    } as any;

    it('throw NotFoundException nếu job không tồn tại hoặc đã đóng', async () => {
      prisma.jobPosting.findUnique.mockResolvedValue(null);
      await expect(
        service.applyJob(dto, 'user-1', '/tmp/cv-1.pdf'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.jobApplication.create).not.toHaveBeenCalled();
    });

    it('throw ConflictException nếu đã có hồ sơ chưa REJECTED cho cùng job — chặn nộp trùng', async () => {
      prisma.jobPosting.findUnique.mockResolvedValue({
        id: 'job-1',
        isActive: true,
      });
      prisma.jobApplication.findFirst.mockResolvedValue({
        id: 'app-1',
        status: 'NEW',
      });

      await expect(
        service.applyJob(dto, 'user-1', '/tmp/cv-1.pdf'),
      ).rejects.toThrow(ConflictException);
      expect(prisma.jobApplication.create).not.toHaveBeenCalled();
    });

    it('check-trùng và tạo nằm trong 1 transaction Serializable — race condition', async () => {
      prisma.jobPosting.findUnique.mockResolvedValue({
        id: 'job-1',
        isActive: true,
      });
      prisma.jobApplication.findFirst.mockResolvedValue(null);
      prisma.jobApplication.create.mockResolvedValue({
        id: 'app-1',
        status: 'NEW',
      });

      await service.applyJob(dto, 'user-1', '/tmp/cv-1.pdf');

      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ isolationLevel: 'Serializable' }),
      );
    });

    it('quy đổi lỗi P2034 (Postgres huỷ transaction do xung đột ghi đồng thời) thành ConflictException thân thiện — đây chính là cơ chế chặn double-click nộp hồ sơ 2 lần gần như đồng thời', async () => {
      prisma.jobPosting.findUnique.mockResolvedValue({
        id: 'job-1',
        isActive: true,
      });
      prisma.$transaction.mockRejectedValue({
        code: 'P2034',
        message: 'Transaction failed due to a write conflict',
      });

      await expect(
        service.applyJob(dto, 'user-1', '/tmp/cv-1.pdf'),
      ).rejects.toThrow(ConflictException);
    });

    it('lỗi transaction khác P2034 thì ném nguyên văn, không bị nuốt thành ConflictException sai lệch', async () => {
      prisma.jobPosting.findUnique.mockResolvedValue({
        id: 'job-1',
        isActive: true,
      });
      const dbDown = new Error('Connection refused');
      prisma.$transaction.mockRejectedValue(dbDown);

      await expect(
        service.applyJob(dto, 'user-1', '/tmp/cv-1.pdf'),
      ).rejects.toThrow(dbDown);
    });

    it('cho phép nộp lại nếu hồ sơ trước đã REJECTED', async () => {
      prisma.jobPosting.findUnique.mockResolvedValue({
        id: 'job-1',
        isActive: true,
      });
      // findFirst chỉ query status != REJECTED — hồ sơ REJECTED không khớp filter nên trả null
      prisma.jobApplication.findFirst.mockResolvedValue(null);
      prisma.jobApplication.create.mockResolvedValue({
        id: 'app-2',
        status: 'NEW',
      });

      await expect(
        service.applyJob(dto, 'user-1', '/tmp/cv-1.pdf'),
      ).resolves.toBeDefined();
      expect(prisma.jobApplication.create).toHaveBeenCalled();
    });

    it('tạo hồ sơ mới thành công khi chưa từng ứng tuyển', async () => {
      prisma.jobPosting.findUnique.mockResolvedValue({
        id: 'job-1',
        isActive: true,
      });
      prisma.jobApplication.findFirst.mockResolvedValue(null);
      prisma.jobApplication.create.mockResolvedValue({
        id: 'app-3',
        status: 'NEW',
      });

      const result = await service.applyJob(dto, 'user-1', '/tmp/cv-1.pdf');
      expect(result.status).toBe('NEW');
    });
  });

  describe('createCandidateProfile — chặn tạo trùng', () => {
    const dto = {
      fullName: 'A',
      phone: '0900000000',
      email: 'a@b.com',
      desiredPosition: 'Kế toán',
    } as any;

    it('throw ConflictException nếu user đã có hồ sơ', async () => {
      prisma.candidateProfile.findFirst.mockResolvedValue({ id: 'profile-1' });
      await expect(
        service.createCandidateProfile(dto, 'user-1'),
      ).rejects.toThrow(ConflictException);
      expect(prisma.candidateProfile.create).not.toHaveBeenCalled();
    });

    it('tạo thành công khi chưa có hồ sơ', async () => {
      prisma.candidateProfile.findFirst.mockResolvedValue(null);
      prisma.candidateProfile.create.mockResolvedValue({ id: 'profile-1' });
      await expect(
        service.createCandidateProfile(dto, 'user-1'),
      ).resolves.toBeDefined();
      expect(prisma.candidateProfile.create).toHaveBeenCalled();
    });

    it('race condition: findFirst chưa thấy hồ sơ (request khác vừa tạo xen giữa) nhưng create() vỡ ràng buộc @@unique([userId]) ở DB (P2002) — vẫn phải quy về ConflictException thân thiện, không lộ lỗi Prisma thô', async () => {
      prisma.candidateProfile.findFirst.mockResolvedValue(null);
      prisma.candidateProfile.create.mockRejectedValue({
        code: 'P2002',
        message: 'Unique constraint failed on the fields: (`user_id`)',
      });

      await expect(
        service.createCandidateProfile(dto, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('lỗi create() khác P2002 thì ném nguyên văn', async () => {
      prisma.candidateProfile.findFirst.mockResolvedValue(null);
      const dbDown = new Error('Connection refused');
      prisma.candidateProfile.create.mockRejectedValue(dbDown);

      await expect(
        service.createCandidateProfile(dto, 'user-1'),
      ).rejects.toThrow(dbDown);
    });

    it('throw BadRequestException nếu cvUrl không phải path CV thật đã upload', async () => {
      prisma.candidateProfile.findFirst.mockResolvedValue(null);
      await expect(
        service.createCandidateProfile(
          { ...dto, cvUrl: '/etc/passwd' },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.candidateProfile.create).not.toHaveBeenCalled();
    });
  });

  describe('updateCandidateProfile', () => {
    const dto = {
      fullName: 'A',
      phone: '0900000000',
      email: 'a@b.com',
      desiredPosition: 'Kế toán',
    } as any;

    it('throw NotFoundException nếu chưa có hồ sơ để sửa', async () => {
      prisma.candidateProfile.findFirst.mockResolvedValue(null);
      await expect(
        service.updateCandidateProfile(dto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('sửa thành công khi đã có hồ sơ', async () => {
      prisma.candidateProfile.findFirst.mockResolvedValue({ id: 'profile-1' });
      prisma.candidateProfile.update.mockResolvedValue({ id: 'profile-1' });
      await expect(
        service.updateCandidateProfile(dto, 'user-1'),
      ).resolves.toBeDefined();
      expect(prisma.candidateProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'profile-1' } }),
      );
    });
  });
});
