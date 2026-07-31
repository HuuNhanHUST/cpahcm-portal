import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthProvider, Role, User } from '@prisma/client';

/**
 * Users Service — Quản lý CRUD và các operations trên User entity.
 */
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // TÌM KIẾM USER
  // ============================================================

  /**
   * Tìm User theo ID.
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Tìm User theo Email.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Tìm User theo Social Provider + Provider ID.
   */
  async findByProvider(
    provider: AuthProvider,
    providerId: string,
  ): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { provider, providerId },
    });
  }

  // ============================================================
  // TẠO USER
  // ============================================================

  /**
   * Tạo User mới.
   */
  async create(data: {
    email: string;
    password?: string;
    fullName: string;
    phone?: string;
    avatarUrl?: string | null;
    role?: Role;
    provider?: AuthProvider;
    providerId?: string;
    isEmailVerified?: boolean;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
        role: data.role || Role.MEMBER,
        provider: data.provider || AuthProvider.LOCAL,
        providerId: data.providerId,
        isEmailVerified: data.isEmailVerified || false,
      },
    });
  }

  // ============================================================
  // CẬP NHẬT USER
  // ============================================================

  /**
   * Cập nhật mật khẩu (đã hash).
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  /**
   * Xác thực email.
   */
  async verifyEmail(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });
  }

  /**
   * Bật/tắt MFA.
   */
  async toggleMfa(userId: string, enable: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: enable },
    });
  }

  /**
   * Cập nhật thời gian đăng nhập cuối.
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Cập nhật thông tin profile.
   */
  async updateProfile(
    userId: string,
    data: {
      fullName?: string;
      phone?: string;
      avatarUrl?: string;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /**
   * Liên kết Social Account với tài khoản hiện có.
   */
  async linkSocialAccount(
    userId: string,
    provider: AuthProvider,
    providerId: string,
    avatarUrl?: string | null,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        provider,
        providerId,
        isEmailVerified: true,
        ...(avatarUrl && !(await this.hasAvatar(userId)) ? { avatarUrl } : {}),
      },
    });
  }

  /**
   * Kiểm tra user đã có avatar chưa.
   */
  private async hasAvatar(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    return !!user?.avatarUrl;
  }

  /**
   * Đổi mật khẩu (cần mật khẩu cũ).
   */
  async changePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }
}
