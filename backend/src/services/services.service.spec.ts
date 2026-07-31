import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: {
    service: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      service: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  describe('getServiceBySlug', () => {
    it('throw NotFoundException nếu không tồn tại', async () => {
      prisma.service.findUnique.mockResolvedValue(null);
      await expect(service.getServiceBySlug('khong-ton-tai')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throw NotFoundException nếu isActive=false (đã ẩn)', async () => {
      prisma.service.findUnique.mockResolvedValue({
        slug: 'da-an',
        isActive: false,
      });
      await expect(service.getServiceBySlug('da-an')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('trả về service nếu tồn tại và đang active', async () => {
      const fake = { slug: 'ke-toan', isActive: true, title: 'Kế toán' };
      prisma.service.findUnique.mockResolvedValue(fake);
      const result = await service.getServiceBySlug('ke-toan');
      expect(result).toEqual(fake);
    });
  });

  describe('createService', () => {
    it('tự sinh slug từ title khi không cung cấp slug', async () => {
      prisma.service.findUnique.mockResolvedValue(null); // slug chưa tồn tại
      prisma.service.create.mockImplementation(({ data }) =>
        Promise.resolve(data),
      );

      const result = await service.createService(
        {
          title: 'Dịch vụ Kế toán Trọn gói',
          category: 'Kế toán',
          shortDesc: 'Mô tả ngắn đủ dài cho dịch vụ này.',
          features: ['A đủ dài', 'B đủ dài'],
          deliverables: ['C đủ dài'],
        },
        null,
      );

      expect(result.slug).toBe('dich-vu-ke-toan-tron-goi');
    });

    it('tự thêm hậu tố -2 khi slug đã tồn tại (chống trùng)', async () => {
      prisma.service.findUnique
        .mockResolvedValueOnce({ slug: 'ke-toan' }) // lần 1: trùng
        .mockResolvedValueOnce(null); // lần 2: base-2 chưa tồn tại
      prisma.service.create.mockImplementation(({ data }) =>
        Promise.resolve(data),
      );

      const result = await service.createService(
        {
          title: 'Kế toán',
          category: 'Kế toán',
          shortDesc: 'Mô tả ngắn đủ dài cho dịch vụ này.',
          features: ['A đủ dài'],
          deliverables: ['B đủ dài'],
        },
        null,
      );

      expect(result.slug).toBe('ke-toan-2');
    });

    it('sanitize longDescription trước khi lưu — loại bỏ <script>', async () => {
      prisma.service.findUnique.mockResolvedValue(null);
      prisma.service.create.mockImplementation(({ data }) =>
        Promise.resolve(data),
      );

      const result = await service.createService(
        {
          title: 'Kiểm toán độc lập',
          category: 'Kiểm toán',
          shortDesc: 'Mô tả ngắn đủ dài cho dịch vụ này.',
          longDescription: '<p>Nội dung</p><script>alert(1)</script>',
          features: ['A đủ dài'],
          deliverables: ['B đủ dài'],
        },
        null,
      );

      expect(result.longDescription).not.toContain('<script>');
      expect(result.longDescription).toContain('<p>Nội dung</p>');
    });
  });

  describe('deleteService', () => {
    it('throw NotFoundException nếu không tồn tại', async () => {
      prisma.service.findUnique.mockResolvedValue(null);
      await expect(service.deleteService('khong-ton-tai')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.service.delete).not.toHaveBeenCalled();
    });
  });
});
