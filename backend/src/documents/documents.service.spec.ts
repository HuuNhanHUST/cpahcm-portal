import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

jest.mock('../common/config/upload.config.js', () => ({
  deletePrivateFile: jest.fn(),
}));

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: {
    document: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let mailService: { sendDocumentStatusEmail: jest.Mock };

  beforeEach(async () => {
    prisma = {
      document: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    mailService = { sendDocumentStatusEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  const fakeFile = {
    originalname: 'invoice.pdf',
    path: '/tmp/x.pdf',
    mimetype: 'application/pdf',
    size: 1024,
  };

  describe('createDocument', () => {
    it('throw BadRequestException nếu user chưa được gán công ty', async () => {
      await expect(
        service.createDocument(
          { category: 'INVOICE' },
          fakeFile,
          null,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.document.create).not.toHaveBeenCalled();
    });

    it('tạo document thành công khi có companyId', async () => {
      prisma.document.create.mockResolvedValue({ id: 'doc-1' });
      await service.createDocument(
        { category: 'INVOICE' },
        fakeFile,
        'company-1',
        'user-1',
      );
      expect(prisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            uploadedById: 'user-1',
          }),
        }),
      );
    });
  });

  describe('getDocumentForAccess — chống IDOR', () => {
    it('throw NotFoundException nếu document không tồn tại', async () => {
      prisma.document.findUnique.mockResolvedValue(null);
      await expect(
        service.getDocumentForAccess('doc-1', 'company-1', Role.BUSINESS),
      ).rejects.toThrow(NotFoundException);
    });

    it('throw ForbiddenException nếu companyId không khớp (user công ty khác)', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        companyId: 'company-A',
      });
      await expect(
        service.getDocumentForAccess('doc-1', 'company-B', Role.BUSINESS),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN luôn truy cập được bất kể companyId', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        companyId: 'company-A',
      });
      await expect(
        service.getDocumentForAccess('doc-1', null, Role.ADMIN),
      ).resolves.toBeDefined();
    });

    it('user cùng công ty truy cập được', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        companyId: 'company-A',
      });
      await expect(
        service.getDocumentForAccess('doc-1', 'company-A', Role.BUSINESS),
      ).resolves.toBeDefined();
    });
  });

  describe('deleteOwnDocument', () => {
    it('throw BadRequestException nếu status khác PENDING', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        companyId: 'company-A',
        status: 'PROCESSING',
        uploadedById: 'user-1',
        fileUrl: '/tmp/x.pdf',
      });
      await expect(
        service.deleteOwnDocument(
          'doc-1',
          'user-1',
          'company-A',
          Role.BUSINESS,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.document.delete).not.toHaveBeenCalled();
    });

    it('throw ForbiddenException nếu không phải người upload (dù cùng công ty)', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        companyId: 'company-A',
        status: 'PENDING',
        uploadedById: 'user-1',
        fileUrl: '/tmp/x.pdf',
      });
      await expect(
        service.deleteOwnDocument(
          'doc-1',
          'user-2',
          'company-A',
          Role.BUSINESS,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('cho phép xóa khi PENDING và đúng người upload', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        companyId: 'company-A',
        status: 'PENDING',
        uploadedById: 'user-1',
        fileUrl: '/tmp/x.pdf',
      });
      prisma.document.delete.mockResolvedValue({ id: 'doc-1' });
      await service.deleteOwnDocument(
        'doc-1',
        'user-1',
        'company-A',
        Role.BUSINESS,
      );
      expect(prisma.document.delete).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
      });
    });
  });

  describe('updateDocumentStatus', () => {
    it('lưu reviewNote khi REJECTED', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc-1' });
      prisma.document.update.mockResolvedValue({
        id: 'doc-1',
        status: 'REJECTED',
      });
      await service.updateDocumentStatus('doc-1', {
        status: 'REJECTED',
        reviewNote: 'File mờ, không đọc được',
      });
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { status: 'REJECTED', reviewNote: 'File mờ, không đọc được' },
      });
    });

    it('xóa reviewNote cũ khi chuyển sang trạng thái khác REJECTED', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc-1' });
      prisma.document.update.mockResolvedValue({
        id: 'doc-1',
        status: 'COMPLETED',
      });
      await service.updateDocumentStatus('doc-1', { status: 'COMPLETED' });
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { status: 'COMPLETED', reviewNote: null },
      });
    });
  });

  describe('updateDocumentStatus — chứng từ COMPLETED bất biến', () => {
    it('throw BadRequestException nếu cố chuyển COMPLETED sang trạng thái khác', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        status: 'COMPLETED',
      });
      await expect(
        service.updateDocumentStatus('doc-1', { status: 'PENDING' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.document.update).not.toHaveBeenCalled();
    });

    it('cho phép "chuyển" COMPLETED → COMPLETED (no-op, không phải đổi trạng thái thật)', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        status: 'COMPLETED',
      });
      prisma.document.update.mockResolvedValue({
        id: 'doc-1',
        status: 'COMPLETED',
      });
      await expect(
        service.updateDocumentStatus('doc-1', { status: 'COMPLETED' }),
      ).resolves.toBeDefined();
    });
  });

  describe('adminDeleteDocument — tuân thủ lưu trữ chứng từ kế toán (Luật Kế toán Điều 41)', () => {
    it('throw BadRequestException nếu document đã COMPLETED — không cho xóa cứng', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        status: 'COMPLETED',
        fileUrl: '/tmp/x.pdf',
      });
      await expect(service.adminDeleteDocument('doc-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.document.delete).not.toHaveBeenCalled();
    });

    it.each(['PENDING', 'PROCESSING', 'REJECTED'])(
      'cho phép xóa khi status=%s (chưa phải hồ sơ chính thức)',
      async (status) => {
        prisma.document.findUnique.mockResolvedValue({
          id: 'doc-1',
          status,
          fileUrl: '/tmp/x.pdf',
        });
        prisma.document.delete.mockResolvedValue({ id: 'doc-1' });
        await service.adminDeleteDocument('doc-1');
        expect(prisma.document.delete).toHaveBeenCalledWith({
          where: { id: 'doc-1' },
        });
      },
    );

    it('throw NotFoundException nếu document không tồn tại', async () => {
      prisma.document.findUnique.mockResolvedValue(null);
      await expect(service.adminDeleteDocument('doc-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
