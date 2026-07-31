import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role, AuthProvider } from '@prisma/client';

import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { RedisService } from '../redis/redis.service.js';
import { MailService } from '../mail/mail.service.js';
import { CompaniesService } from '../companies/companies.service.js';

// Mock bcrypt để test chạy nhanh và tách biệt (không phụ thuộc chi phí hash thật ~12 rounds) —
// hành vi đúng/sai của compare được kiểm soát trực tiếp trong từng test case.
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let redisService: jest.Mocked<RedisService>;
  let jwtService: jest.Mocked<JwtService>;
  let mailService: jest.Mocked<MailService>;

  const baseUser = {
    id: 'user-1',
    email: 'test@cpahcm.vn',
    password: 'hashed-password',
    fullName: 'Nguyen Van A',
    phone: null,
    avatarUrl: null,
    role: Role.MEMBER,
    isActive: true,
    isEmailVerified: true,
    mfaEnabled: false,
    provider: AuthProvider.LOCAL,
    companyId: null,
    lastLoginAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            findByProvider: jest.fn(),
            create: jest.fn(),
            updateLastLogin: jest.fn(),
            updatePassword: jest.fn(),
            verifyEmail: jest.fn(),
            toggleMfa: jest.fn(),
            linkSocialAccount: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('signed-token'),
            sign: jest.fn().mockReturnValue('signed-temp-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: any) => fallback),
            getOrThrow: jest.fn((key: string) => `secret-for-${key}`),
          },
        },
        {
          provide: RedisService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            exists: jest.fn(),
            delByPrefix: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
            sendOtpEmail: jest.fn(),
          },
        },
        {
          provide: CompaniesService,
          useValue: {
            resolveOrRequestCompanyLinkAtRegister: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    redisService = module.get(RedisService);
    jwtService = module.get(JwtService);
    mailService = module.get(MailService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── register() ────────────────────────────────────────────────────────
  describe('register', () => {
    it('từ chối đăng ký nếu email đã tồn tại', async () => {
      usersService.findByEmail.mockResolvedValue(baseUser as any);

      await expect(
        service.register({
          email: baseUser.email,
          password: 'Abcd1234!',
          fullName: 'A',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    // Bảo vệ cốt lõi: DTO chỉ cho phép MEMBER/BUSINESS ở tầng validation, nhưng service PHẢI tự
    // kiểm tra lại (defense-in-depth) — nếu 1 request nào đó lách qua được DTO (bug tương lai,
    // validator bị tắt nhầm...) mà mang role=ADMIN, service vẫn phải ép về MEMBER chứ không tin
    // tuyệt đối vào input.
    it('ép role về MEMBER nếu role trong DTO không nằm trong SELF_REGISTER_ROLES (kể cả ADMIN)', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({
        ...baseUser,
        role: Role.MEMBER,
      } as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      await service.register({
        email: 'new@cpahcm.vn',
        password: 'Abcd1234!',
        fullName: 'New User',
        role: 'ADMIN',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.MEMBER }),
      );
    });

    it('giữ nguyên role BUSINESS hợp lệ khi tự đăng ký', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({
        ...baseUser,
        role: Role.BUSINESS,
      } as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      await service.register({
        email: 'biz@cpahcm.vn',
        password: 'Abcd1234!',
        fullName: 'Biz Owner',
        role: Role.BUSINESS,
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.BUSINESS }),
      );
    });
  });

  // ── login() ───────────────────────────────────────────────────────────
  describe('login', () => {
    it('từ chối nếu email không tồn tại (thông báo chung, không tiết lộ email/mật khẩu sai cái nào)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@cpahcm.vn', password: 'x' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('từ chối nếu tài khoản đã bị vô hiệu hóa (isActive=false)', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...baseUser,
        isActive: false,
      } as any);

      await expect(
        service.login({ email: baseUser.email, password: 'x' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('từ chối tài khoản Social Login (không có password) đăng nhập bằng password', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...baseUser,
        password: null,
        provider: AuthProvider.GOOGLE,
      } as any);

      await expect(
        service.login({ email: baseUser.email, password: 'x' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('từ chối nếu mật khẩu sai', async () => {
      usersService.findByEmail.mockResolvedValue(baseUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: baseUser.email, password: 'wrong' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('trả về mfaRequired thay vì token nếu tài khoản đã bật MFA', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...baseUser,
        mfaEnabled: true,
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: baseUser.email,
        password: 'right',
      });

      expect(result).toEqual(
        expect.objectContaining({
          mfaRequired: true,
          tempToken: 'signed-temp-token',
        }),
      );
      expect(mailService.sendOtpEmail).toHaveBeenCalled();
      // Không được cấp access/refresh token thật khi MFA chưa xác thực xong.
      expect(result).not.toHaveProperty('accessToken');
    });

    it('đăng nhập thành công trả về accessToken + refreshToken khi mật khẩu đúng và MFA tắt', async () => {
      usersService.findByEmail.mockResolvedValue(baseUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: baseUser.email,
        password: 'right',
      });

      expect(result).toEqual(
        expect.objectContaining({
          accessToken: 'signed-token',
          refreshToken: 'signed-token',
        }),
      );
      expect(usersService.updateLastLogin).toHaveBeenCalledWith(baseUser.id);
      // Refresh token phải được đăng ký session trên Redis để hỗ trợ rotation/revoke sau này.
      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining(`refresh_session:${baseUser.id}:`),
        '1',
        expect.any(Number),
      );
    });
  });

  // ── refreshTokens() — rotation + reuse detection ─────────────────────
  describe('refreshTokens', () => {
    it('từ chối nếu user không còn tồn tại hoặc đã bị khóa', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.refreshTokens('user-1', 'jti-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    // Trường hợp bảo mật quan trọng nhất của cơ chế rotation: nếu 1 refresh token đã bị rotate/
    // revoke trước đó (session không còn trên Redis) nhưng vẫn được dùng lại (chữ ký JWT vẫn hợp
    // lệ vì chưa hết hạn) — đây là dấu hiệu token bị đánh cắp. Phải revoke TOÀN BỘ session của
    // user để buộc đăng nhập lại trên mọi thiết bị, không chỉ từ chối riêng request này.
    it('revoke TOÀN BỘ session của user khi phát hiện refresh token bị dùng lại (reuse detection)', async () => {
      usersService.findById.mockResolvedValue(baseUser as any);
      redisService.exists.mockResolvedValue(false);

      await expect(
        service.refreshTokens(baseUser.id, 'stale-jti'),
      ).rejects.toThrow(UnauthorizedException);
      expect(redisService.delByPrefix).toHaveBeenCalledWith(
        `refresh_session:${baseUser.id}:`,
      );
    });

    it('rotate: xóa session cũ và cấp cặp token mới khi refresh hợp lệ', async () => {
      usersService.findById.mockResolvedValue(baseUser as any);
      redisService.exists.mockResolvedValue(true);

      const result = await service.refreshTokens(baseUser.id, 'valid-jti');

      expect(redisService.del).toHaveBeenCalledWith(
        `refresh_session:${baseUser.id}:valid-jti`,
      );
      expect(result).toEqual(
        expect.objectContaining({
          accessToken: 'signed-token',
          refreshToken: 'signed-token',
        }),
      );
    });
  });

  // ── logout() ──────────────────────────────────────────────────────────
  it('logout() revoke toàn bộ session refresh-token của user', async () => {
    await service.logout(baseUser.id);
    expect(redisService.delByPrefix).toHaveBeenCalledWith(
      `refresh_session:${baseUser.id}:`,
    );
  });

  // ── forgotPassword() — không được tiết lộ email có tồn tại hay không ──
  describe('forgotPassword', () => {
    it('trả về cùng 1 message dù email tồn tại hay không (chống user enumeration)', async () => {
      usersService.findByEmail.mockResolvedValueOnce(null);
      const notFoundResult = await service.forgotPassword('ghost@cpahcm.vn');

      usersService.findByEmail.mockResolvedValueOnce(baseUser as any);
      const foundResult = await service.forgotPassword(baseUser.email);

      expect(notFoundResult.message).toBe(foundResult.message);
    });

    it('không gửi email nếu tài khoản không tồn tại', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await service.forgotPassword('ghost@cpahcm.vn');
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  // ── resetPassword() ───────────────────────────────────────────────────
  describe('resetPassword', () => {
    it('từ chối nếu token không tồn tại/hết hạn trên Redis', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'invalid',
          newPassword: 'Abcd1234!',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('revoke TOÀN BỘ session hiện có sau khi đặt lại mật khẩu thành công', async () => {
      redisService.get.mockResolvedValue(baseUser.id);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed');

      await service.resetPassword({
        token: 'valid-token',
        newPassword: 'Abcd1234!',
      });

      expect(usersService.updatePassword).toHaveBeenCalledWith(
        baseUser.id,
        'new-hashed',
      );
      expect(redisService.delByPrefix).toHaveBeenCalledWith(
        `refresh_session:${baseUser.id}:`,
      );
    });
  });

  // ── MFA OTP ───────────────────────────────────────────────────────────
  describe('verifyMfaOtp', () => {
    it('từ chối nếu OTP sai hoặc đã hết hạn', async () => {
      redisService.get.mockResolvedValue('123456');

      await expect(service.verifyMfaOtp(baseUser.id, '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('xác thực thành công thì xóa OTP khỏi Redis và cấp token', async () => {
      redisService.get.mockResolvedValue('123456');
      usersService.findById.mockResolvedValue(baseUser as any);

      const result = await service.verifyMfaOtp(baseUser.id, '123456');

      expect(redisService.del).toHaveBeenCalledWith(`mfa_otp:${baseUser.id}`);
      expect(result).toEqual(
        expect.objectContaining({ accessToken: 'signed-token' }),
      );
    });
  });

  // ── toggleMfa() — tắt MFA bắt buộc xác thực lại mật khẩu ──────────────
  describe('toggleMfa', () => {
    it('từ chối tắt MFA nếu không cung cấp mật khẩu hiện tại', async () => {
      usersService.findById.mockResolvedValue(baseUser as any);

      await expect(
        service.toggleMfa(baseUser.id, false, undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối tắt MFA nếu mật khẩu hiện tại không đúng', async () => {
      usersService.findById.mockResolvedValue(baseUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.toggleMfa(baseUser.id, false, 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('cho phép bật MFA mà không cần mật khẩu hiện tại', async () => {
      const result = await service.toggleMfa(baseUser.id, true);
      expect(result.mfaEnabled).toBe(true);
      expect(usersService.toggleMfa).toHaveBeenCalledWith(baseUser.id, true);
    });
  });
});
