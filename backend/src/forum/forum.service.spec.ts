import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ForumService } from './forum.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('ForumService', () => {
  let service: ForumService;
  let prisma: {
    forumCategory: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    forumTopic: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    forumReply: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      forumCategory: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      forumTopic: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      forumReply: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForumService,
        { provide: PrismaService, useValue: prisma },
        // getOrSet(key, ttl, fn) chỉ cần gọi thẳng fn() bỏ qua cache — đủ để test logic thật
        // bên trong service mà không cần Redis thật chạy trong unit test.
        { provide: RedisService, useValue: { getOrSet: jest.fn((_k: string, _t: number, fn: () => unknown) => fn()) } },
      ],
    }).compile();

    service = module.get<ForumService>(ForumService);
  });

  describe('createTopic', () => {
    it('throw BadRequestException nếu danh mục không tồn tại', async () => {
      prisma.forumCategory.findUnique.mockResolvedValue(null);
      await expect(
        service.createTopic(
          {
            categoryId: 'cat-1',
            title: 'Câu hỏi về thuế TNDN',
            content: 'Nội dung câu hỏi chi tiết',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.forumTopic.create).not.toHaveBeenCalled();
    });

    it('throw BadRequestException nếu danh mục đã bị ẩn (isActive=false)', async () => {
      prisma.forumCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        isActive: false,
      });
      await expect(
        service.createTopic(
          {
            categoryId: 'cat-1',
            title: 'Câu hỏi về thuế TNDN',
            content: 'Nội dung câu hỏi chi tiết',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.forumTopic.create).not.toHaveBeenCalled();
    });

    it('sanitize XSS trong content trước khi lưu DB', async () => {
      prisma.forumCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        isActive: true,
      });
      prisma.forumTopic.findUnique.mockResolvedValue(null); // slug chưa trùng
      prisma.forumTopic.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'topic-1', ...data }),
      );

      const result = await service.createTopic(
        {
          categoryId: 'cat-1',
          title: 'Câu hỏi về thuế TNDN',
          content: '<p>Nội dung</p><script>alert(1)</script>',
        },
        'user-1',
      );

      expect(result.content).not.toContain('<script>');
      expect(result.content).toContain('<p>Nội dung</p>');
    });

    it('tự thêm hậu tố khi slug bị trùng', async () => {
      prisma.forumCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        isActive: true,
      });
      prisma.forumTopic.findUnique
        .mockResolvedValueOnce({ id: 'existing' }) // slug gốc đã tồn tại
        .mockResolvedValueOnce(null); // slug-2 chưa tồn tại
      prisma.forumTopic.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'topic-2', ...data }),
      );

      const result = await service.createTopic(
        {
          categoryId: 'cat-1',
          title: 'Câu hỏi trùng tiêu đề',
          content: 'Nội dung câu hỏi chi tiết',
        },
        'user-1',
      );

      expect(result.slug).toMatch(/-2$/);
    });
  });

  describe('createReply', () => {
    it('throw NotFoundException nếu chủ đề không tồn tại', async () => {
      prisma.forumTopic.findUnique.mockResolvedValue(null);
      await expect(
        service.createReply(
          'topic-1',
          { content: 'Trả lời' },
          'user-1',
          Role.MEMBER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throw ForbiddenException nếu chủ đề đã bị khóa và người trả lời không phải ADMIN', async () => {
      prisma.forumTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        isLocked: true,
      });
      await expect(
        service.createReply(
          'topic-1',
          { content: 'Trả lời' },
          'user-1',
          Role.MEMBER,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.forumReply.create).not.toHaveBeenCalled();
    });

    it('ADMIN vẫn trả lời được dù chủ đề đã khóa', async () => {
      prisma.forumTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        isLocked: true,
      });
      prisma.forumReply.create.mockResolvedValue({ id: 'reply-1' });

      await expect(
        service.createReply(
          'topic-1',
          { content: 'Trả lời' },
          'admin-1',
          Role.ADMIN,
        ),
      ).resolves.toBeDefined();
      expect(prisma.forumReply.create).toHaveBeenCalled();
    });
  });

  describe('updateTopic / deleteTopic — quyền tác giả', () => {
    it('throw ForbiddenException nếu người sửa không phải tác giả hoặc ADMIN', async () => {
      prisma.forumTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        authorId: 'author-1',
      });
      await expect(
        service.updateTopic(
          'topic-1',
          { title: 'Sửa tiêu đề mới' },
          'other-user',
          Role.MEMBER,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.forumTopic.update).not.toHaveBeenCalled();
    });

    it('tác giả sửa được bài của chính mình', async () => {
      prisma.forumTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        authorId: 'author-1',
        title: 'Cũ',
        content: 'Cũ',
      });
      prisma.forumTopic.update.mockResolvedValue({ id: 'topic-1' });

      await expect(
        service.updateTopic(
          'topic-1',
          { title: 'Tiêu đề mới đủ dài' },
          'author-1',
          Role.MEMBER,
        ),
      ).resolves.toBeDefined();
      expect(prisma.forumTopic.update).toHaveBeenCalled();
    });

    it('ADMIN xóa được chủ đề của người khác', async () => {
      prisma.forumTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        authorId: 'author-1',
      });
      prisma.forumTopic.delete.mockResolvedValue({ id: 'topic-1' });

      await expect(
        service.deleteTopic('topic-1', 'admin-1', Role.ADMIN),
      ).resolves.toBeDefined();
      expect(prisma.forumTopic.delete).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
      });
    });
  });

  describe('deleteCategory', () => {
    it('throw BadRequestException nếu danh mục còn chủ đề — không cho xóa cứng', async () => {
      prisma.forumCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        _count: { topics: 2 },
      });
      await expect(service.deleteCategory('cat-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.forumCategory.delete).not.toHaveBeenCalled();
    });

    it('cho phép xóa khi danh mục chưa có chủ đề nào', async () => {
      prisma.forumCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        _count: { topics: 0 },
      });
      prisma.forumCategory.delete.mockResolvedValue({ id: 'cat-1' });

      await service.deleteCategory('cat-1');
      expect(prisma.forumCategory.delete).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
    });
  });

  describe('getTopicBySlug', () => {
    it('throw NotFoundException nếu chủ đề không tồn tại', async () => {
      prisma.forumTopic.findUnique.mockResolvedValue(null);
      await expect(service.getTopicBySlug('khong-ton-tai')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
