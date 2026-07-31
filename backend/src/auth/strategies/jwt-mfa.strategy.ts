import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface MfaTokenPayload {
  sub: string;
  purpose: 'mfa';
}

/**
 * Passport JWT Strategy dành riêng cho MFA temp token.
 * Dùng secret RIÊNG (khác access token) và bắt buộc claim `purpose: 'mfa'`
 * để temp token (cấp trước khi verify OTP) không thể dùng thay access token thật.
 */
@Injectable()
export class JwtMfaStrategy extends PassportStrategy(Strategy, 'jwt-mfa') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.mfaSecret'),
    });
  }

  async validate(payload: MfaTokenPayload) {
    if (payload.purpose !== 'mfa' || !payload.sub) {
      throw new UnauthorizedException('Token MFA không hợp lệ!');
    }
    return { id: payload.sub };
  }
}
