import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { UPLOADS_ROOT } from '../common/config/upload.config.js';
import { slugify } from '../common/utils/slugify.util.js';
import { sanitizeRichText } from '../common/utils/sanitize-html.util.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Public reads ─────────────────────────────────────────────────────────
  async getActiveServices(category?: string) {
    const where: any = { isActive: true };
    if (category && category !== 'ALL') where.category = category;
    return this.prisma.service.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getServiceBySlug(slug: string) {
    const service = await this.prisma.service.findUnique({ where: { slug } });
    if (!service || !service.isActive) {
      throw new NotFoundException('Dịch vụ không tồn tại hoặc đã bị gỡ.');
    }
    return service;
  }

  async getRelatedServices(slug: string, limit = 4) {
    const service = await this.prisma.service.findUnique({ where: { slug } });
    if (!service) return [];
    return this.prisma.service.findMany({
      where: {
        isActive: true,
        slug: { not: slug },
        category: service.category,
      },
      orderBy: { displayOrder: 'asc' },
      take: limit,
    });
  }

  // ── Admin CRUD ────────────────────────────────────────────────────────────
  async getAllServices() {
    return this.prisma.service.findMany({
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
      await this.prisma.service.findUnique({ where: { slug: candidate } })
    ) {
      candidate = `${base}-${suffix}`;
      suffix++;
    }
    return candidate;
  }

  async createService(dto: CreateServiceDto, imagePath: string | null) {
    const slug = await this.generateUniqueSlug(dto.title, dto.slug);
    return this.prisma.service.create({
      data: {
        title: dto.title,
        slug,
        category: dto.category,
        tag: dto.tag ?? null,
        shortDesc: dto.shortDesc,
        longDescription: sanitizeRichText(dto.longDescription),
        imageUrl: imagePath,
        features: dto.features,
        deliverables: dto.deliverables,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateService(
    id: string,
    dto: UpdateServiceDto,
    imagePath: string | null,
  ) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Dịch vụ không tồn tại.');

    if (imagePath && service.imageUrl)
      this.deleteUploadedFile(service.imageUrl);

    let slug = service.slug;
    if (dto.slug && dto.slug !== service.slug) {
      slug = await this.generateUniqueSlug(
        dto.title ?? service.title,
        dto.slug,
      );
    }

    return this.prisma.service.update({
      where: { id },
      data: {
        title: dto.title ?? service.title,
        slug,
        category: dto.category ?? service.category,
        tag: dto.tag ?? service.tag,
        shortDesc: dto.shortDesc ?? service.shortDesc,
        longDescription:
          dto.longDescription !== undefined
            ? sanitizeRichText(dto.longDescription)
            : service.longDescription,
        imageUrl: imagePath ?? service.imageUrl,
        features: dto.features ?? service.features,
        deliverables: dto.deliverables ?? service.deliverables,
        isActive: dto.isActive ?? service.isActive,
      },
    });
  }

  async deleteService(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Dịch vụ không tồn tại.');
    if (service.imageUrl) this.deleteUploadedFile(service.imageUrl);
    return this.prisma.service.delete({ where: { id } });
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
