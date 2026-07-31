import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { ForumService } from './forum.service.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CreateForumTopicDto } from './dto/create-forum-topic.dto.js';
import { UpdateForumTopicDto } from './dto/update-forum-topic.dto.js';
import { CreateForumReplyDto } from './dto/create-forum-reply.dto.js';
import { UpdateForumReplyDto } from './dto/update-forum-reply.dto.js';

/** Chặt hơn mức throttle global (10/60s) — chống spam đăng chủ đề/trả lời hàng loạt. */
const FORUM_WRITE_THROTTLE = { default: { limit: 5, ttl: 300000 } };

@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Public()
  @Get('categories')
  async getCategories() {
    return this.forumService.getActiveCategories();
  }

  @Public()
  @Get('topics')
  async getTopics(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('category') category?: string,
    @Query('q') q?: string,
  ) {
    return this.forumService.getTopics(page, category, q);
  }

  @Public()
  @Get('topics/:slug')
  async getTopicBySlug(@Param('slug') slug: string) {
    return this.forumService.getTopicBySlug(slug);
  }

  // Tạo chủ đề mới — yêu cầu đăng nhập (MEMBER/BUSINESS), ADMIN bypass qua RolesGuard.
  @Roles(Role.MEMBER, Role.BUSINESS)
  @Throttle(FORUM_WRITE_THROTTLE)
  @Post('topics')
  async createTopic(
    @Body() dto: CreateForumTopicDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.forumService.createTopic(dto, userId);
  }

  @Patch('topics/:id')
  async updateTopic(
    @Param('id') id: string,
    @Body() dto: UpdateForumTopicDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.forumService.updateTopic(id, dto, userId, role);
  }

  @Delete('topics/:id')
  async deleteTopic(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.forumService.deleteTopic(id, userId, role);
  }

  @Roles(Role.MEMBER, Role.BUSINESS)
  @Throttle(FORUM_WRITE_THROTTLE)
  @Post('topics/:id/replies')
  async createReply(
    @Param('id') topicId: string,
    @Body() dto: CreateForumReplyDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.forumService.createReply(topicId, dto, userId, role);
  }

  @Patch('replies/:id')
  async updateReply(
    @Param('id') id: string,
    @Body() dto: UpdateForumReplyDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.forumService.updateReply(id, dto, userId, role);
  }

  @Delete('replies/:id')
  async deleteReply(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.forumService.deleteReply(id, userId, role);
  }
}
