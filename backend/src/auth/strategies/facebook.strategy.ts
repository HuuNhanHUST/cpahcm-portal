import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';

/**
 * Passport Facebook OAuth2 Strategy.
 * Chỉ hoạt động khi FACEBOOK_CLIENT_ID và FACEBOOK_CLIENT_SECRET được cấu hình.
 */
@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private readonly logger = new Logger(FacebookStrategy.name);

  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('facebook.clientId', '');
    const clientSecret = configService.get<string>('facebook.clientSecret', '');

    super({
      clientID: clientID || 'not-configured',
      clientSecret: clientSecret || 'not-configured',
      callbackURL:
        configService.get<string>('facebook.callbackUrl') ||
        'http://localhost:3001/api/v1/auth/facebook/callback',
      scope: ['email'],
      profileFields: ['id', 'emails', 'name', 'photos'],
    });

    if (!clientID || !clientSecret) {
      this.logger.warn(
        'Facebook OAuth: Chưa cấu hình FACEBOOK_CLIENT_ID/SECRET. Social Login sẽ không hoạt động.',
      );
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<void> {
    const { id, name, emails, photos } = profile;

    const user = {
      providerId: id,
      email: emails?.[0]?.value,
      fullName: `${name?.givenName || ''} ${name?.familyName || ''}`.trim(),
      avatarUrl: photos?.[0]?.value || null,
      provider: 'FACEBOOK' as const,
    };

    done(null, user);
  }
}
