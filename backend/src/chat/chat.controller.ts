import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ChatService } from './chat.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';

// Throttle riêng, chặt hơn giới hạn chung — mỗi request ở đây tốn phí gọi Gemini API thật (khi
// hết free tier), khác với các endpoint đọc dữ liệu thông thường.
const CHAT_THROTTLE = {
  default: {
    limit: parseInt(process.env.CHAT_THROTTLE_LIMIT || '15', 10),
    ttl: parseInt(process.env.CHAT_THROTTLE_TTL || '60000', 10),
  },
};

// Yêu cầu đăng nhập — không dùng @Public() nên JwtAuthGuard toàn cục áp dụng mặc định. Chỉ
// user/doanh nghiệp đã có tài khoản mới dùng được trợ lý ảo, khớp mô hình các tính năng khác
// của cổng thông tin (upload chứng từ, đăng ký khóa học...).
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Throttle(CHAT_THROTTLE)
  @Post()
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, dto.message);
  }

  // Khôi phục hội thoại của user hiện tại sau khi tải lại trang — widget gọi 1 lần lúc mount.
  @Get()
  async getHistory(@CurrentUser('id') userId: string) {
    return this.chatService.getHistory(userId);
  }
}
