import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshTokens: jest.fn(),
            logout: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
            verifyEmail: jest.fn(),
            requestMfaOtp: jest.fn(),
            verifyMfaOtp: jest.fn(),
            toggleMfa: jest.fn(),
            validateSocialLogin: jest.fn(),
            getProfile: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (_key: string, fallback?: any) =>
                fallback ?? 'http://localhost:3000',
            ),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('refreshTokens() lấy userId/jti từ req.user (do JwtRefreshStrategy gắn vào), không từ body client gửi', async () => {
    authService.refreshTokens.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'b',
    });

    await controller.refreshTokens({ user: { sub: 'user-1', jti: 'jti-1' } });

    expect(authService.refreshTokens).toHaveBeenCalledWith('user-1', 'jti-1');
  });

  // Callback OAuth trước đây từng trả JSON trần trụi thay vì đăng nhập người dùng vào ứng dụng
  // (xem comment ở redirectWithTokens trong auth.controller.ts) — test này khóa lại hành vi đúng:
  // luôn redirect kèm token qua query string tới trang xử lý của frontend.
  it('googleAuthCallback() redirect (không trả JSON) kèm token qua query string tới frontend', async () => {
    authService.validateSocialLogin.mockResolvedValue({
      accessToken: 'access-xyz',
      refreshToken: 'refresh-xyz',
      user: { id: 'user-1', email: 'a@b.com' },
    } as any);
    const res = { redirect: jest.fn() } as any;

    await controller.googleAuthCallback(
      { user: { provider: 'google' } } as any,
      res,
    );

    expect(res.redirect).toHaveBeenCalledTimes(1);
    const redirectUrl = res.redirect.mock.calls[0][0] as string;
    expect(redirectUrl).toContain('/auth/social-callback?');
    expect(redirectUrl).toContain('accessToken=access-xyz');
    expect(redirectUrl).toContain('refreshToken=refresh-xyz');
  });

  it('logout() ủy quyền cho AuthService với userId lấy từ token đã xác thực', async () => {
    authService.logout.mockResolvedValue({ message: 'ok' });
    await controller.logout('user-1');
    expect(authService.logout).toHaveBeenCalledWith('user-1');
  });
});
