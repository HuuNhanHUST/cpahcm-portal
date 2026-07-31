import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CompaniesService } from './companies.service.js';
import { CreateLinkRequestDto } from './dto/create-link-request.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

// Tự phục vụ cho tài khoản BUSINESS chưa được gán Company — trước đây phải liên hệ Admin
// thủ công. Quản trị Company đầy đủ (CRUD, danh sách) vẫn nằm ở /admin/companies (Admin Only).
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUSINESS)
  @Post('link-requests')
  async createLinkRequest(
    @Body() dto: CreateLinkRequestDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.companiesService.createLinkRequest(dto, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUSINESS)
  @Get('link-requests/me')
  async getMyLinkRequests(@CurrentUser('id') userId: string) {
    return this.companiesService.getMyLinkRequests(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUSINESS)
  @Get('me')
  async getMyCompany(@CurrentUser('companyId') companyId: string | null) {
    return this.companiesService.getMyCompany(companyId);
  }
}
