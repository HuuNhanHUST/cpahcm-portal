import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { UPLOADS_ROOT } from '../common/config/upload.config.js';
import { slugify } from '../common/utils/slugify.util.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';

const POSTS_PER_PAGE = 9;
/** TTL cache Redis cho các danh sách công khai — xem giải thích chung ở RedisService.getOrSet. */
const LISTING_CACHE_TTL_SECONDS = 60;

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // Danh sách bài viết đã xuất bản — công khai, hỗ trợ phân trang + lọc chuyên mục + tìm kiếm.
  async getPublishedPosts(page: number, category?: string, q?: string) {
    return this.redis.getOrSet(
      `posts:list:${page}:${category || 'ALL'}:${q || ''}`,
      LISTING_CACHE_TTL_SECONDS,
      async () => {
        const where: any = { isPublished: true };
        if (category && category !== 'ALL') where.category = category;
        if (q) {
          where.OR = [
            { title: { contains: q, mode: 'insensitive' } },
            { excerpt: { contains: q, mode: 'insensitive' } },
          ];
        }

        const skip = (page - 1) * POSTS_PER_PAGE;
        const [items, total] = await Promise.all([
          this.prisma.post.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: POSTS_PER_PAGE,
          }),
          this.prisma.post.count({ where }),
        ]);

        return { items, total, page, perPage: POSTS_PER_PAGE };
      },
    );
  }

  // Chi tiết 1 bài viết theo slug — công khai, tăng viewCount mỗi lần xem.
  async getPostBySlug(slug: string) {
    const post = await this.prisma.post.findUnique({ where: { slug } });
    if (!post || !post.isPublished) {
      throw new NotFoundException('Bài viết không tồn tại hoặc đã bị gỡ.');
    }
    return this.prisma.post.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    });
  }

  // Bài viết liên quan — cùng chuyên mục, loại trừ chính nó.
  async getRelatedPosts(slug: string, limit = 4) {
    return this.redis.getOrSet(
      `posts:related:${slug}:${limit}`,
      LISTING_CACHE_TTL_SECONDS,
      async () => {
        const post = await this.prisma.post.findUnique({ where: { slug } });
        if (!post) return [];

        return this.prisma.post.findMany({
          where: {
            isPublished: true,
            slug: { not: slug },
            category: post.category,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
      },
    );
  }

  // ── Admin CRUD ──────────────────────────────────────────────────────────
  async getAllPosts() {
    return this.prisma.post.findMany({ orderBy: { createdAt: 'desc' } });
  }

  private async generateUniqueSlug(
    title: string,
    providedSlug?: string,
  ): Promise<string> {
    const base = providedSlug ? slugify(providedSlug) : slugify(title);
    let candidate = base;
    let suffix = 2;
    while (await this.prisma.post.findUnique({ where: { slug: candidate } })) {
      candidate = `${base}-${suffix}`;
      suffix++;
    }
    return candidate;
  }

  async createPost(dto: CreatePostDto, imagePath: string | null) {
    const slug = await this.generateUniqueSlug(dto.title, dto.slug);
    return this.prisma.post.create({
      data: {
        title: dto.title,
        slug,
        content: dto.content,
        excerpt: dto.excerpt ?? null,
        category: dto.category,
        imageUrl: imagePath,
        isPublished: dto.isPublished ?? true,
      },
    });
  }

  async updatePost(id: string, dto: UpdatePostDto, imagePath: string | null) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Bài viết không tồn tại.');

    if (imagePath && post.imageUrl) {
      this.deleteUploadedFile(post.imageUrl);
    }

    let slug = post.slug;
    if (dto.slug && dto.slug !== post.slug) {
      slug = await this.generateUniqueSlug(dto.title ?? post.title, dto.slug);
    }

    return this.prisma.post.update({
      where: { id },
      data: {
        title: dto.title ?? post.title,
        slug,
        content: dto.content ?? post.content,
        excerpt: dto.excerpt ?? post.excerpt,
        category: dto.category ?? post.category,
        imageUrl: imagePath ?? post.imageUrl,
        isPublished: dto.isPublished ?? post.isPublished,
      },
    });
  }

  async deletePost(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Bài viết không tồn tại.');
    if (post.imageUrl) this.deleteUploadedFile(post.imageUrl);
    await this.prisma.post.delete({ where: { id } });
    return { id };
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
}
