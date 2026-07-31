import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { VerifyMfaDto, ToggleMfaDto } from './dto/mfa.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ConfigService } from '@nestjs/config';

/**
 * Throttle nghiêm ngặt hơn cho các endpoint dễ bị brute-force (login, OTP, reset password...).
 * Giới hạn 5/60s ban đầu quá chặt cho môi trường thật: nhiều nhân viên dùng chung 1 IP văn
 * phòng/NAT có thể tự khóa lẫn nhau dù không ai brute-force gì cả. 10/60s vẫn đủ chặn brute-force
 * (10 lần thử mật khẩu/phút là rất chậm so với tấn công thật) nhưng bớt false-positive hơn nhiều.
 */
const AUTH_THROTTLE = {
  default: {
    limit: parseInt(process.env.AUTH_THROTTLE_LIMIT || '10', 10),
    ttl: parseInt(process.env.AUTH_THROTTLE_TTL || '60000', 10),
  },
};

/**
 * Auth Controller — Quản lý tất cả luồng xác thực.
 *
 * Public endpoints: register, login, refresh, forgot-password, reset-password, verify-email, social login
 * Protected endpoints: logout, profile, MFA (request/verify/toggle)
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================================
  // ĐĂNG KÝ
  // ============================================================
  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ============================================================
  // ĐĂNG NHẬP
  // ============================================================
  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ============================================================
  // REFRESH TOKEN
  // ============================================================
  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Req() req: any) {
    const userId = req.user.sub;
    const jti = req.user.jti;
    return this.authService.refreshTokens(userId, jti);
  }

  // ============================================================
  // ĐĂNG XUẤT
  // ============================================================
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  // ============================================================
  // QUÊN MẬT KHẨU
  // ============================================================
  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  // ============================================================
  // ĐẶT LẠI MẬT KHẨU
  // ============================================================
  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ============================================================
  // XÁC THỰC EMAIL
  // ============================================================
  @Public()
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  // ============================================================
  // MFA: YÊU CẦU OTP (dùng tempToken cấp sau login, KHÔNG dùng access token)
  // ============================================================
  @Public()
  @UseGuards(AuthGuard('jwt-mfa'))
  @Throttle(AUTH_THROTTLE)
  @Post('mfa/request')
  @HttpCode(HttpStatus.OK)
  async requestMfaOtp(@CurrentUser('id') userId: string) {
    return this.authService.requestMfaOtp(userId);
  }

  // ============================================================
  // MFA: XÁC THỰC OTP (dùng tempToken cấp sau login, KHÔNG dùng access token)
  // ============================================================
  @Public()
  @UseGuards(AuthGuard('jwt-mfa'))
  @Throttle(AUTH_THROTTLE)
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMfaOtp(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyMfaDto,
  ) {
    return this.authService.verifyMfaOtp(userId, dto.otp);
  }

  // ============================================================
  // MFA: BẬT/TẮT
  // ============================================================
  @Patch('mfa/toggle')
  async toggleMfa(
    @CurrentUser('id') userId: string,
    @Body() dto: ToggleMfaDto,
  ) {
    return this.authService.toggleMfa(userId, dto.enable, dto.currentPassword);
  }

  // ============================================================
  // GOOGLE OAUTH
  // ============================================================
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard tự redirect đến Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.validateSocialLogin(req.user);
    this.redirectWithTokens(res, result);
  }

  // ============================================================
  // FACEBOOK OAUTH
  // ============================================================
  @Public()
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth() {
    // Guard tự redirect đến Facebook
  }

  @Public()
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.validateSocialLogin(req.user);
    this.redirectWithTokens(res, result);
  }

  /**
   * Trước đây 2 callback Google/Facebook trả thẳng JSON chứa accessToken/refreshToken — đúng như
   * comment cũ ghi "ở đây trả JSON cho dev/test", nhưng đây LÀ route thật mà nút "Đăng nhập Google/
   * Facebook" ở frontend trỏ tới (`<a href="${API_BASE}/auth/google">`), nên người dùng thật bấm vào
   * sẽ thấy y hệt: 1 trang JSON trần trụi thay vì được đăng nhập vào ứng dụng. Redirect kèm token
   * qua query string tới 1 trang frontend chuyên xử lý (giống pattern OAuth phổ biến khi ứng dụng
   * lưu token ở localStorage thay vì cookie) — trang đó tự lưu token rồi điều hướng tiếp.
   */
  private redirectWithTokens(
    res: Response,
    result: { accessToken: string; refreshToken: string; user: unknown },
  ) {
    const frontendUrl = this.configService.get<string>(
      'app.frontendUrl',
      'http://localhost:3000',
    );
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: JSON.stringify(result.user),
    });
    res.redirect(`${frontendUrl}/auth/social-callback?${params.toString()}`);
  }

  // ============================================================
  // PROFILE (Protected)
  // ============================================================
  @Get('profile')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }
}
