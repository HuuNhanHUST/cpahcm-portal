import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prisma: {
    company: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    user: { findUnique: jest.Mock };
    companyLinkRequest: { findFirst: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      company: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: { findUnique: jest.fn() },
      companyLinkRequest: { findFirst: jest.fn(), create: jest.fn() },
      // $transaction(fn) mô phỏng transaction thật bằng cách gọi callback với chính `prisma` mock
      // làm `tx` — đủ để test logic bên trong transaction (createLinkRequest) mà không cần Postgres.
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
  });

  describe('createCompany', () => {
    it('throw BadRequestException nếu taxCode đã tồn tại', async () => {
      prisma.company.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.createCompany({ taxCode: '0312345678', name: 'Công ty A' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.company.create).not.toHaveBeenCalled();
    });

    it('tạo công ty mới khi taxCode chưa tồn tại', async () => {
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.company.create.mockResolvedValue({ id: 'company-1' });
      await service.createCompany({ taxCode: '0312345678', name: 'Công ty A' });
      expect(prisma.company.create).toHaveBeenCalled();
    });
  });

  describe('deleteCompany', () => {
    it('throw NotFoundException nếu công ty không tồn tại', async () => {
      prisma.company.findUnique.mockResolvedValue(null);
      await expect(service.deleteCompany('company-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throw BadRequestException nếu còn user liên kết', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        _count: { users: 2, documents: 0 },
      });
      await expect(service.deleteCompany('company-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.company.delete).not.toHaveBeenCalled();
    });

    it('throw BadRequestException nếu còn document liên kết', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        _count: { users: 0, documents: 3 },
      });
      await expect(service.deleteCompany('company-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cho phép xóa khi không còn user/document liên kết', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        _count: { users: 0, documents: 0 },
      });
      prisma.company.delete.mockResolvedValue({ id: 'company-1' });
      await service.deleteCompany('company-1');
      expect(prisma.company.delete).toHaveBeenCalledWith({
        where: { id: 'company-1' },
      });
    });
  });

  describe('createLinkRequest', () => {
    const dto = { taxCode: '0312345678', companyName: 'Công ty A' } as any;

    it('throw BadRequestException nếu tài khoản đã liên kết công ty rồi', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        companyId: 'company-1',
      });
      await expect(service.createLinkRequest(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.companyLinkRequest.create).not.toHaveBeenCalled();
    });

    it('throw ConflictException nếu đã có yêu cầu PENDING — chặn gửi trùng', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        companyId: null,
      });
      prisma.companyLinkRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'PENDING',
      });

      await expect(service.createLinkRequest(dto, 'user-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.companyLinkRequest.create).not.toHaveBeenCalled();
    });

    it('tạo yêu cầu thành công khi chưa có yêu cầu PENDING nào', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        companyId: null,
      });
      prisma.companyLinkRequest.findFirst.mockResolvedValue(null);
      prisma.companyLinkRequest.create.mockResolvedValue({
        id: 'req-1',
        status: 'PENDING',
      });

      await expect(
        service.createLinkRequest(dto, 'user-1'),
      ).resolves.toBeDefined();
      expect(prisma.companyLinkRequest.create).toHaveBeenCalled();
    });

    it('check-trùng và tạo nằm trong 1 transaction Serializable — race condition', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        companyId: null,
      });
      prisma.companyLinkRequest.findFirst.mockResolvedValue(null);
      prisma.companyLinkRequest.create.mockResolvedValue({
        id: 'req-1',
        status: 'PENDING',
      });

      await service.createLinkRequest(dto, 'user-1');

      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ isolationLevel: 'Serializable' }),
      );
    });

    it('quy đổi lỗi P2034 (xung đột ghi đồng thời giữa 2 request gửi yêu cầu gần như cùng lúc) thành ConflictException thân thiện', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        companyId: null,
      });
      prisma.$transaction.mockRejectedValue({
        code: 'P2034',
        message: 'Transaction failed due to a write conflict',
      });

      await expect(service.createLinkRequest(dto, 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('lỗi transaction khác P2034 thì ném nguyên văn', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        companyId: null,
      });
      const dbDown = new Error('Connection refused');
      prisma.$transaction.mockRejectedValue(dbDown);

      await expect(service.createLinkRequest(dto, 'user-1')).rejects.toThrow(
        dbDown,
      );
    });
  });
});
