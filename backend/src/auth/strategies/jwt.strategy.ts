import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import { UsersService } from '../../users/users.service.js';

/**
 * Passport JWT Strategy cho Access Token.
 * Tự động extract và validate JWT từ Authorization: Bearer header.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  /**
   * Được gọi sau khi JWT được giải mã thành công.
   * Kết quả trả về sẽ được gán vào request.user
   */
  async validate(
    payload: JwtPayload & { purpose?: string; isRefreshToken?: boolean },
  ) {
    // Defense-in-depth: chặn mọi token mang claim đặc biệt (mfa temp token, refresh token...)
    // dù ký bằng secret nào — access token thật không bao giờ có các claim này.
    if (payload.purpose || payload.isRefreshToken) {
      throw new UnauthorizedException('Token không hợp lệ cho hành động này!');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa!',
      );
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      mfaEnabled: user.mfaEnabled,
      companyId: user.companyId,
    };
  }
}
