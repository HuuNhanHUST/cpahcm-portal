import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { AuthProvider, Role } from '@prisma/client';

import { UsersService } from '../users/users.service.js';
import { RedisService } from '../redis/redis.service.js';
import { MailService } from '../mail/mail.service.js';
import { CompaniesService } from '../companies/companies.service.js';
import { RegisterDto, SELF_REGISTER_ROLES } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';
import {
  AuthResponse,
  MfaRequiredResponse,
  TokenResponse,
  UserProfileResponse,
} from './interfaces/auth-response.interface.js';

// Constants for Redis keys and TTLs
const OTP_TTL_SECONDS = 300; // 5 phút
const RESET_TOKEN_TTL_SECONDS = 900; // 15 phút
const VERIFY_EMAIL_TTL_SECONDS = 86400; // 24 giờ
const SALT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // fallback 7 ngày (khớp jwt.refreshExpiresIn mặc định)

/** Prefix Redis key cho 1 session refresh-token cụ thể (hỗ trợ multi-device). */
const refreshSessionKey = (userId: string, jti: string) =>
  `refresh_session:${userId}:${jti}`;
/** Prefix dùng để revoke TẤT CẢ session của 1 user (logout-all, reset password...). */
const refreshSessionPrefix = (userId: string) => `refresh_session:${userId}:`;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private mailService: MailService,
    private companiesService: CompaniesService,
  ) {}

  // ============================================================
  // 1. ĐĂNG KÝ (REGISTER)
  // ============================================================
  async register(
    dto: RegisterDto,
  ): Promise<{ message: string; user: UserProfileResponse }> {
    // Kiểm tra email đã tồn tại
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email này đã được sử dụng!');
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // Không tin tưởng tuyệt đối vào DTO validation — chặn cứng ADMIN ở tầng service.
    const safeRole =
      dto.role && (SELF_REGISTER_ROLES as readonly Role[]).includes(dto.role)
        ? dto.role
        : Role.MEMBER;

    // Tạo user mới
    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName,
      phone: dto.phone,
      role: safeRole,
    });

    // Gửi email xác thực
    const verifyToken = uuidv4();
    await this.redisService.set(
      `verify_email:${verifyToken}`,
      user.id,
      VERIFY_EMAIL_TTL_SECONDS,
    );
    await this.mailService.sendVerificationEmail(user.email, verifyToken);

    // BUSINESS điền sẵn mã số thuế lúc đăng ký — tự liên kết/tạo yêu cầu ngay, đỡ phải qua bước
    // riêng ở /tai-khoan sau khi đăng nhập. Đây là hành động PHỤ, không được để lỗi ở bước này
    // (VD: trùng mã số thuế đang có yêu cầu khác) làm hỏng cả luồng đăng ký chính.
    let companyLinkMessage = '';
    let finalUser = user;
    if (safeRole === Role.BUSINESS && dto.taxCode && dto.companyName) {
      try {
        const { linked } =
          await this.companiesService.resolveOrRequestCompanyLinkAtRegister(
            dto.taxCode,
            dto.companyName,
            user.id,
          );
        if (linked) {
          // `user` được tạo TRƯỚC khi liên kết công ty nên chưa có companyId — lấy lại bản ghi
          // mới nhất để response phản ánh đúng, tránh FE tưởng chưa liên kết dù DB đã đúng.
          finalUser = (await this.usersService.findById(user.id)) ?? user;
        }
        companyLinkMessage = linked
          ? ' Tài khoản đã được liên kết với công ty.'
          : ' Yêu cầu liên kết công ty đang chờ CPA HCM xét duyệt.';
      } catch {
        // Bỏ qua lỗi — user vẫn có thể tự gửi yêu cầu liên kết sau tại /tai-khoan.
      }
    }

    return {
      message: `Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.${companyLinkMessage}`,
      user: this.toUserProfile(finalUser),
    };
  }

  // ============================================================
  // 2. ĐĂNG NHẬP (LOGIN)
  // ============================================================
  async login(dto: LoginDto): Promise<AuthResponse | MfaRequiredResponse> {
    // Tìm user theo email
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng!');
    }

    // Kiểm tra tài khoản active
    if (!user.isActive) {
      throw new ForbiddenException('Tài khoản đã bị vô hiệu hóa!');
    }

    // Kiểm tra user có password (Social Login user không có password)
    if (!user.password) {
      throw new UnauthorizedException(
        `Tài khoản này đã đăng ký qua ${user.provider}. Vui lòng đăng nhập bằng ${user.provider}.`,
      );
    }

    // So sánh mật khẩu
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng!');
    }

    // Nếu MFA đang bật, trả về yêu cầu OTP thay vì token
    if (user.mfaEnabled) {
      const tempToken = this.generateTempMfaToken(user.id);

      // Tự động gửi OTP
      await this.sendMfaOtp(user.id, user.email);

      return {
        mfaRequired: true,
        tempToken,
        message: 'Vui lòng nhập mã OTP đã gửi đến email của bạn.',
      };
    }

    // Cập nhật thời gian đăng nhập cuối
    await this.usersService.updateLastLogin(user.id);

    // Tạo cặp token và trả về
    return this.generateAuthResponse(user);
  }

  // ============================================================
  // 3. REFRESH TOKEN
  // ============================================================
  /**
   * Rotation + Reuse Detection qua Redis:
   * - Mỗi refresh token có 1 `jti` riêng, tồn tại như 1 key Redis (1 session/thiết bị).
   * - Refresh hợp lệ → xóa session cũ (rotate), tạo session mới.
   * - `jti` không còn tồn tại trên Redis (đã bị rotate/revoke trước đó nhưng token vẫn
   *   còn hạn JWT) → dấu hiệu refresh token bị dùng lại (đánh cắp) → revoke TẤT CẢ
   *   session của user để buộc đăng nhập lại trên mọi thiết bị.
   */
  async refreshTokens(userId: string, jti: string): Promise<TokenResponse> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ!');
    }

    const sessionExists = await this.redisService.exists(
      refreshSessionKey(userId, jti),
    );
    if (!sessionExists) {
      // Reuse detection: token có chữ ký hợp lệ nhưng session đã bị rotate/revoke trước đó.
      await this.redisService.delByPrefix(refreshSessionPrefix(userId));
      throw new UnauthorizedException(
        'Refresh token đã được sử dụng hoặc không còn hiệu lực! Vui lòng đăng nhập lại.',
      );
    }

    // Rotate: hủy session cũ trước khi cấp session mới.
    await this.redisService.del(refreshSessionKey(userId, jti));

    return this.issueTokenPair(user.id, user.email, user.role);
  }

  // ============================================================
  // 4. ĐĂNG XUẤT (LOGOUT)
  // ============================================================
  /** Đăng xuất — revoke toàn bộ session refresh-token của user trên Redis. */
  async logout(userId: string): Promise<{ message: string }> {
    await this.redisService.delByPrefix(refreshSessionPrefix(userId));
    return { message: 'Đăng xuất thành công!' };
  }

  // ============================================================
  // 5. QUÊN MẬT KHẨU (FORGOT PASSWORD)
  // ============================================================
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    // Luôn trả về message thành công (không tiết lộ email có tồn tại hay không)
    if (!user) {
      return {
        message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.',
      };
    }

    // Tạo reset token
    const resetToken = uuidv4();
    await this.redisService.set(
      `reset_password:${resetToken}`,
      user.id,
      RESET_TOKEN_TTL_SECONDS,
    );

    // Gửi email reset password
    await this.mailService.sendPasswordResetEmail(email, resetToken);

    return {
      message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.',
    };
  }

  // ============================================================
  // 6. ĐẶT LẠI MẬT KHẨU (RESET PASSWORD)
  // ============================================================
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // Lấy userId từ Redis bằng reset token
    const userId = await this.redisService.get(`reset_password:${dto.token}`);
    if (!userId) {
      throw new BadRequestException('Token đã hết hạn hoặc không hợp lệ!');
    }

    // Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.usersService.updatePassword(userId, hashedPassword);

    // Xóa token đã sử dụng
    await this.redisService.del(`reset_password:${dto.token}`);

    // Revoke toàn bộ session hiện có để buộc đăng nhập lại trên mọi thiết bị
    await this.redisService.delByPrefix(refreshSessionPrefix(userId));

    return { message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.' };
  }

  // ============================================================
  // 7. XÁC THỰC EMAIL (VERIFY EMAIL)
  // ============================================================
  async verifyEmail(token: string): Promise<{ message: string }> {
    const userId = await this.redisService.get(`verify_email:${token}`);
    if (!userId) {
      throw new BadRequestException(
        'Link xác thực đã hết hạn hoặc không hợp lệ!',
      );
    }

    await this.usersService.verifyEmail(userId);
    await this.redisService.del(`verify_email:${token}`);

    return { message: 'Xác thực email thành công!' };
  }

  // ============================================================
  // 8. MFA: GỬI OTP
  // ============================================================
  async requestMfaOtp(userId: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại!');
    }

    await this.sendMfaOtp(userId, user.email);
    return { message: 'Mã OTP đã được gửi đến email của bạn.' };
  }

  // ============================================================
  // 9. MFA: XÁC THỰC OTP
  // ============================================================
  async verifyMfaOtp(userId: string, otp: string): Promise<AuthResponse> {
    const storedOtp = await this.redisService.get(`mfa_otp:${userId}`);
    if (!storedOtp || storedOtp !== otp) {
      throw new UnauthorizedException('Mã OTP không đúng hoặc đã hết hạn!');
    }

    // Xóa OTP đã sử dụng
    await this.redisService.del(`mfa_otp:${userId}`);

    // Lấy user và tạo auth response
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại!');
    }

    await this.usersService.updateLastLogin(userId);
    return this.generateAuthResponse(user);
  }

  // ============================================================
  // 10. MFA: BẬT/TẮT
  // ============================================================
  /**
   * Bắt buộc xác thực lại mật khẩu hiện tại khi TẮT MFA — tránh trường hợp kẻ chiếm
   * session (XSS, token bị đánh cắp...) tự tắt lớp bảo vệ thứ 2 mà không biết mật khẩu.
   */
  async toggleMfa(
    userId: string,
    enable: boolean,
    currentPassword?: string,
  ): Promise<{ message: string; mfaEnabled: boolean }> {
    if (!enable) {
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new UnauthorizedException('Người dùng không tồn tại!');
      }
      if (!user.password) {
        throw new BadRequestException(
          'Tài khoản đăng nhập qua mạng xã hội không thể tắt MFA bằng cách này.',
        );
      }
      if (!currentPassword) {
        throw new BadRequestException(
          'Vui lòng nhập mật khẩu hiện tại để tắt MFA!',
        );
      }
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        throw new UnauthorizedException('Mật khẩu hiện tại không đúng!');
      }
    }

    await this.usersService.toggleMfa(userId, enable);
    const action = enable ? 'bật' : 'tắt';
    return {
      message: `Đã ${action} xác thực đa yếu tố (MFA) thành công!`,
      mfaEnabled: enable,
    };
  }

  // ============================================================
  // 11. SOCIAL LOGIN CALLBACK
  // ============================================================
  async validateSocialLogin(socialUser: {
    provider: string;
    providerId: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
  }): Promise<AuthResponse> {
    // Tìm user đã liên kết với social account này
    let user = await this.usersService.findByProvider(
      socialUser.provider as AuthProvider,
      socialUser.providerId,
    );

    if (!user) {
      // Kiểm tra email đã tồn tại (user đã đăng ký bằng email thường)
      const existingUser = await this.usersService.findByEmail(
        socialUser.email,
      );

      if (existingUser) {
        // Liên kết social account với tài khoản hiện có
        user = await this.usersService.linkSocialAccount(
          existingUser.id,
          socialUser.provider as AuthProvider,
          socialUser.providerId,
          socialUser.avatarUrl,
        );
      } else {
        // Tạo tài khoản mới từ social profile
        user = await this.usersService.create({
          email: socialUser.email,
          fullName: socialUser.fullName,
          avatarUrl: socialUser.avatarUrl,
          provider: socialUser.provider as AuthProvider,
          providerId: socialUser.providerId,
          isEmailVerified: true, // Email từ Social provider đã xác thực
        });
      }
    }

    if (!user.isActive) {
      throw new ForbiddenException('Tài khoản đã bị vô hiệu hóa!');
    }

    await this.usersService.updateLastLogin(user.id);
    return this.generateAuthResponse(user);
  }

  // ============================================================
  // 12. LẤY THÔNG TIN PROFILE
  // ============================================================
  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại!');
    }
    return this.toUserProfile(user);
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  /**
   * Tạo cặp Access Token + Refresh Token MỚI và đăng ký session refresh trên Redis.
   * Mỗi lần gọi tạo ra 1 `jti` mới → hỗ trợ multi-session (nhiều thiết bị) và cho phép
   * revoke từng session riêng lẻ hoặc toàn bộ (xem refreshTokens/logout/resetPassword).
   */
  private async issueTokenPair(
    userId: string,
    email: string,
    role: Role,
  ): Promise<TokenResponse> {
    const jti = uuidv4();
    const payload = { sub: userId, email, role } as Record<string, any>;
    const refreshExpiresIn = this.configService.get(
      'jwt.refreshExpiresIn',
      '7d',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.configService.get('jwt.accessExpiresIn', '15m'),
      }),
      this.jwtService.signAsync(
        { ...payload, isRefreshToken: true, jti },
        {
          secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    await this.redisService.set(
      refreshSessionKey(userId, jti),
      '1',
      this.refreshTtlSeconds(refreshExpiresIn),
    );

    return { accessToken, refreshToken };
  }

  /** Chuyển expiresIn dạng '7d'/'15m'/số giây → số giây, dùng để đặt TTL session Redis. */
  private refreshTtlSeconds(expiresIn: string | number): number {
    if (typeof expiresIn === 'number') return expiresIn;
    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    if (!match) return REFRESH_TOKEN_TTL_SECONDS;
    const value = parseInt(match[1], 10);
    const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]] ?? 1;
    return value * unit;
  }

  /**
   * Tạo full AuthResponse bao gồm tokens và user profile.
   */
  private async generateAuthResponse(user: any): Promise<AuthResponse> {
    const tokens = await this.issueTokenPair(user.id, user.email, user.role);

    return {
      ...tokens,
      user: this.toUserProfile(user),
    };
  }

  /**
   * Tạo temp token cho MFA flow (ngắn hạn, chỉ dùng để verify OTP).
   * Ký bằng secret RIÊNG (jwt.mfaSecret) — KHÔNG dùng chung với access token,
   * để token này không thể bị dùng thay access token thật cho các route khác.
   */
  private generateTempMfaToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, purpose: 'mfa' },
      {
        secret: this.configService.getOrThrow<string>('jwt.mfaSecret'),
        expiresIn: this.configService.get('jwt.mfaExpiresIn', '10m'),
      },
    );
  }

  /**
   * Gửi OTP qua email và lưu vào Redis.
   */
  private async sendMfaOtp(userId: string, email: string): Promise<void> {
    // Tạo OTP 6 chữ số — dùng crypto.randomInt (CSPRNG) thay vì Math.random(), vốn không an toàn
    // về mặt mật mã học (thuật toán PRNG có thể dự đoán được, không phù hợp để sinh mã bảo mật
    // như OTP xác thực 2 lớp).
    const otp = randomInt(100000, 1000000).toString();

    // Lưu OTP vào Redis với TTL 5 phút
    await this.redisService.set(`mfa_otp:${userId}`, otp, OTP_TTL_SECONDS);

    // Gửi email
    await this.mailService.sendOtpEmail(email, otp);
  }

  /**
   * Convert User entity → UserProfileResponse (loại bỏ password và sensitive fields).
   */
  private toUserProfile(user: any): UserProfileResponse {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone || null,
      avatarUrl: user.avatarUrl || null,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      mfaEnabled: user.mfaEnabled,
      provider: user.provider,
      companyId: user.companyId || null,
      lastLoginAt: user.lastLoginAt || null,
      createdAt: user.createdAt,
    };
  }
}
