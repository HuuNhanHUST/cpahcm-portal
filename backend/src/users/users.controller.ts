import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service.js';
import { RedisService } from '../redis/redis.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

/**
 * Users Controller — Quản lý profile và thông tin cá nhân.
 * Tất cả endpoint đều yêu cầu JWT authentication.
 */
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
  ) {}

  // ============================================================
  // LẤY PROFILE HIỆN TẠI
  // ============================================================
  @Get('profile')
  async getProfile(@CurrentUser('id') userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại!');
    }

    const { password, ...profile } = user;
    return { user: profile };
  }

  // ============================================================
  // CẬP NHẬT PROFILE
  // ============================================================
  @Patch('profile')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(userId, dto);
    const { password, ...profile } = user;
    return {
      message: 'Cập nhật thông tin thành công!',
      user: profile,
    };
  }

  // ============================================================
  // ĐỔI MẬT KHẨU
  // ============================================================
  @Post('change-password')
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại!');
    }

    // Kiểm tra user có password (Social login users)
    if (!user.password) {
      throw new BadRequestException(
        'Tài khoản đăng nhập qua mạng xã hội không thể đổi mật khẩu bằng cách này.',
      );
    }

    // Verify mật khẩu hiện tại
    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng!');
    }

    // Kiểm tra mật khẩu mới khác mật khẩu cũ
    const isSame = await bcrypt.compare(dto.newPassword, user.password);
    if (isSame) {
      throw new BadRequestException(
        'Mật khẩu mới phải khác mật khẩu hiện tại!',
      );
    }

    // Hash và cập nhật mật khẩu mới
    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.usersService.changePassword(userId, hashedPassword);

    // Đổi mật khẩu → revoke toàn bộ session refresh-token trên mọi thiết bị
    await this.redisService.delByPrefix(`refresh_session:${userId}:`);

    return { message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' };
  }
}
