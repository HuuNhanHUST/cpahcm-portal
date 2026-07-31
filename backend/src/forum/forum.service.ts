import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { slugify } from '../common/utils/slugify.util.js';
import { sanitizeRichText } from '../common/utils/sanitize-html.util.js';
import { CreateForumCategoryDto } from './dto/create-forum-category.dto.js';
import { UpdateForumCategoryDto } from './dto/update-forum-category.dto.js';
import { CreateForumTopicDto } from './dto/create-forum-topic.dto.js';
import { UpdateForumTopicDto } from './dto/update-forum-topic.dto.js';
import { CreateForumReplyDto } from './dto/create-forum-reply.dto.js';
import { UpdateForumReplyDto } from './dto/update-forum-reply.dto.js';

const TOPICS_PER_PAGE = 15;
/** TTL cache Redis cho các danh sách công khai — xem giải thích chung ở RedisService.getOrSet. */
const LISTING_CACHE_TTL_SECONDS = 60;

const AUTHOR_SELECT = {
  id: true,
  fullName: true,
  avatarUrl: true,
  role: true,
} as const;

@Injectable()
export class ForumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ── Public reads ─────────────────────────────────────────────────────────
  async getActiveCategories() {
    return this.redis.getOrSet(
      'forum:categories',
      LISTING_CACHE_TTL_SECONDS,
      async () =>
        this.prisma.forumCategory.findMany({
          where: { isActive: true },
          orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
        }),
    );
  }

  async getCategoryBySlug(slug: string) {
    const category = await this.prisma.forumCategory.findUnique({
      where: { slug },
    });
    if (!category || !category.isActive) {
      throw new NotFoundException('Danh mục không tồn tại hoặc đã bị ẩn.');
    }
    return category;
  }

  async getTopics(page: number, categorySlug?: string, q?: string) {
    return this.redis.getOrSet(
      `forum:topics:${page}:${categorySlug || 'ALL'}:${q || ''}`,
      LISTING_CACHE_TTL_SECONDS,
      async () => {
        const where: any = {};
        if (categorySlug) {
          const category = await this.prisma.forumCategory.findUnique({
            where: { slug: categorySlug },
          });
          if (!category)
            return { items: [], total: 0, page, perPage: TOPICS_PER_PAGE };
          where.categoryId = category.id;
        }
        if (q) {
          where.title = { contains: q, mode: 'insensitive' };
        }

        const skip = (page - 1) * TOPICS_PER_PAGE;
        const [items, total] = await Promise.all([
          this.prisma.forumTopic.findMany({
            where,
            orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
            skip,
            take: TOPICS_PER_PAGE,
            include: {
              category: true,
              author: { select: AUTHOR_SELECT },
              _count: { select: { replies: true } },
            },
          }),
          this.prisma.forumTopic.count({ where }),
        ]);

        return { items, total, page, perPage: TOPICS_PER_PAGE };
      },
    );
  }

  async getTopicBySlug(slug: string) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { slug },
      include: {
        category: true,
        author: { select: AUTHOR_SELECT },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: AUTHOR_SELECT } },
        },
      },
    });
    if (!topic)
      throw new NotFoundException('Chủ đề không tồn tại hoặc đã bị gỡ.');

    return this.prisma.forumTopic.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
      include: {
        category: true,
        author: { select: AUTHOR_SELECT },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: AUTHOR_SELECT } },
        },
      },
    });
  }

  // ── User-generated content (MEMBER/BUSINESS, ADMIN bypass qua RolesGuard) ──
  private async generateUniqueTopicSlug(title: string): Promise<string> {
    const base = slugify(title);
    let candidate = base;
    let suffix = 2;
    while (
      await this.prisma.forumTopic.findUnique({ where: { slug: candidate } })
    ) {
      candidate = `${base}-${suffix}`;
      suffix++;
    }
    return candidate;
  }

  async createTopic(dto: CreateForumTopicDto, authorId: string) {
    const category = await this.prisma.forumCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category || !category.isActive) {
      throw new BadRequestException(
        'Danh mục không tồn tại hoặc đã bị ẩn, không thể tạo chủ đề mới.',
      );
    }

    const slug = await this.generateUniqueTopicSlug(dto.title);
    return this.prisma.forumTopic.create({
      data: {
        title: dto.title,
        slug,
        content: sanitizeRichText(dto.content) ?? '',
        categoryId: dto.categoryId,
        authorId,
      },
      include: { category: true, author: { select: AUTHOR_SELECT } },
    });
  }

  private assertCanModify(
    authorId: string,
    currentUserId: string,
    currentUserRole: Role,
  ) {
    if (currentUserRole === Role.ADMIN) return;
    if (authorId !== currentUserId) {
      throw new ForbiddenException(
        'Bạn không có quyền thao tác trên nội dung này.',
      );
    }
  }

  async updateTopic(
    id: string,
    dto: UpdateForumTopicDto,
    currentUserId: string,
    currentUserRole: Role,
  ) {
    const topic = await this.prisma.forumTopic.findUnique({ where: { id } });
    if (!topic) throw new NotFoundException('Chủ đề không tồn tại.');
    this.assertCanModify(topic.authorId, currentUserId, currentUserRole);

    return this.prisma.forumTopic.update({
      where: { id },
      data: {
        title: dto.title ?? topic.title,
        content:
          dto.content !== undefined
            ? (sanitizeRichText(dto.content) ?? '')
            : topic.content,
      },
      include: { category: true, author: { select: AUTHOR_SELECT } },
    });
  }

  async deleteTopic(id: string, currentUserId: string, currentUserRole: Role) {
    const topic = await this.prisma.forumTopic.findUnique({ where: { id } });
    if (!topic) throw new NotFoundException('Chủ đề không tồn tại.');
    this.assertCanModify(topic.authorId, currentUserId, currentUserRole);
    // Xóa topic cascade xóa toàn bộ reply (onDelete: Cascade trong schema) — chấp nhận được vì
    // đây là nội dung diễn đàn, không cần giữ lịch sử audit như CourseEnrollment.
    return this.prisma.forumTopic.delete({ where: { id } });
  }

  async createReply(
    topicId: string,
    dto: CreateForumReplyDto,
    authorId: string,
    currentUserRole: Role,
  ) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id: topicId },
    });
    if (!topic) throw new NotFoundException('Chủ đề không tồn tại.');
    if (topic.isLocked && currentUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Chủ đề đã bị khóa, không thể trả lời.');
    }

    return this.prisma.forumReply.create({
      data: {
        content: sanitizeRichText(dto.content) ?? '',
        topicId,
        authorId,
      },
      include: { author: { select: AUTHOR_SELECT } },
    });
  }

  async updateReply(
    id: string,
    dto: UpdateForumReplyDto,
    currentUserId: string,
    currentUserRole: Role,
  ) {
    const reply = await this.prisma.forumReply.findUnique({ where: { id } });
    if (!reply) throw new NotFoundException('Trả lời không tồn tại.');
    this.assertCanModify(reply.authorId, currentUserId, currentUserRole);

    return this.prisma.forumReply.update({
      where: { id },
      data: { content: sanitizeRichText(dto.content) ?? '' },
      include: { author: { select: AUTHOR_SELECT } },
    });
  }

  async deleteReply(id: string, currentUserId: string, currentUserRole: Role) {
    const reply = await this.prisma.forumReply.findUnique({ where: { id } });
    if (!reply) throw new NotFoundException('Trả lời không tồn tại.');
    this.assertCanModify(reply.authorId, currentUserId, currentUserRole);
    return this.prisma.forumReply.delete({ where: { id } });
  }

  // ── Admin: quản lý danh mục ─────────────────────────────────────────────
  async getAllCategories() {
    return this.prisma.forumCategory.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { topics: true } } },
    });
  }

  private async generateUniqueCategorySlug(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 2;
    while (
      await this.prisma.forumCategory.findUnique({ where: { slug: candidate } })
    ) {
      candidate = `${base}-${suffix}`;
      suffix++;
    }
    return candidate;
  }

  async createCategory(dto: CreateForumCategoryDto) {
    const slug = await this.generateUniqueCategorySlug(dto.name);
    return this.prisma.forumCategory.create({
      data: { name: dto.name, slug, description: dto.description ?? null },
    });
  }

  async updateCategory(id: string, dto: UpdateForumCategoryDto) {
    const category = await this.prisma.forumCategory.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException('Danh mục không tồn tại.');

    return this.prisma.forumCategory.update({
      where: { id },
      data: {
        name: dto.name ?? category.name,
        description: dto.description ?? category.description,
        displayOrder: dto.displayOrder ?? category.displayOrder,
        isActive: dto.isActive ?? category.isActive,
      },
    });
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.forumCategory.findUnique({
      where: { id },
      include: { _count: { select: { topics: true } } },
    });
    if (!category) throw new NotFoundException('Danh mục không tồn tại.');
    if (category._count.topics > 0) {
      throw new BadRequestException(
        'Danh mục đã có chủ đề, không thể xóa. Vui lòng ẩn danh mục thay vì xóa.',
      );
    }
    return this.prisma.forumCategory.delete({ where: { id } });
  }

  // ── Admin: kiểm duyệt ────────────────────────────────────────────────────
  async getAllTopicsForAdmin() {
    return this.prisma.forumTopic.findMany({
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        category: true,
        author: { select: AUTHOR_SELECT },
        _count: { select: { replies: true } },
      },
    });
  }

  // Admin xem lại replies để kiểm duyệt — KHÔNG dùng getTopicBySlug() (endpoint public) vì hàm đó
  // tăng viewCount ở mọi lệnh gọi; dùng lại sẽ khiến mỗi lần Admin mở/đóng 1 chủ đề để duyệt lại
  // cộng thêm "lượt xem" ảo vào con số hiển thị công khai cho người dùng thật.
  async getTopicByIdForAdmin(id: string) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id },
      include: {
        category: true,
        author: { select: AUTHOR_SELECT },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: AUTHOR_SELECT } },
        },
      },
    });
    if (!topic) throw new NotFoundException('Chủ đề không tồn tại.');
    return topic;
  }

  async setTopicPinned(id: string, isPinned: boolean) {
    const topic = await this.prisma.forumTopic.findUnique({ where: { id } });
    if (!topic) throw new NotFoundException('Chủ đề không tồn tại.');
    return this.prisma.forumTopic.update({ where: { id }, data: { isPinned } });
  }

  async setTopicLocked(id: string, isLocked: boolean) {
    const topic = await this.prisma.forumTopic.findUnique({ where: { id } });
    if (!topic) throw new NotFoundException('Chủ đề không tồn tại.');
    return this.prisma.forumTopic.update({ where: { id }, data: { isLocked } });
  }

  async adminDeleteTopic(id: string) {
    const topic = await this.prisma.forumTopic.findUnique({ where: { id } });
    if (!topic) throw new NotFoundException('Chủ đề không tồn tại.');
    return this.prisma.forumTopic.delete({ where: { id } });
  }

  async adminDeleteReply(id: string) {
    const reply = await this.prisma.forumReply.findUnique({ where: { id } });
    if (!reply) throw new NotFoundException('Trả lời không tồn tại.');
    return this.prisma.forumReply.delete({ where: { id } });
  }
}
