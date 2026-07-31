import { Controller, Get, Param, Query } from '@nestjs/common';
import { ServicesService } from './services.service.js';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // Danh sách dịch vụ đang hiển thị — công khai, dùng cho trang /dich-vu.
  @Public()
  @Get()
  async getActiveServices(@Query('category') category?: string) {
    return this.servicesService.getActiveServices(category);
  }

  // Chi tiết 1 dịch vụ theo slug — công khai, dùng cho /dich-vu/[slug].
  @Public()
  @Get(':slug')
  async getServiceBySlug(@Param('slug') slug: string) {
    return this.servicesService.getServiceBySlug(slug);
  }

  // Dịch vụ liên quan (cùng chuyên mục) hiển thị ở cuối trang chi tiết.
  @Public()
  @Get(':slug/related')
  async getRelatedServices(@Param('slug') slug: string) {
    return this.servicesService.getRelatedServices(slug);
  }
}
