import { Controller, Get, Param, Query } from '@nestjs/common';
import { PostsService } from './posts.service.js';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // Danh sách bài viết đã xuất bản — công khai, dùng cho trang /tin-tuc.
  @Public()
  @Get()
  async getPublishedPosts(
    @Query('page') page?: string,
    @Query('category') category?: string,
    @Query('q') q?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    return this.postsService.getPublishedPosts(pageNum, category, q);
  }

  // Chi tiết 1 bài viết theo slug — công khai, dùng cho /tin-tuc/[slug].
  @Public()
  @Get(':slug')
  async getPostBySlug(@Param('slug') slug: string) {
    return this.postsService.getPostBySlug(slug);
  }

  // Bài viết liên quan (cùng chuyên mục) hiển thị ở cuối trang chi tiết.
  @Public()
  @Get(':slug/related')
  async getRelatedPosts(@Param('slug') slug: string) {
    return this.postsService.getRelatedPosts(slug);
  }
}
