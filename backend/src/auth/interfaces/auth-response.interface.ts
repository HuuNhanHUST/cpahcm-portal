import { Role } from '@prisma/client';

/**
 * User profile trả về cho client (không bao giờ chứa password).
 */
export interface UserProfileResponse {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  provider: string;
  companyId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

/**
 * Response trả về sau khi login/register thành công.
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfileResponse;
}

/**
 * Response khi login nhưng cần MFA verification.
 */
export interface MfaRequiredResponse {
  mfaRequired: true;
  tempToken: string; // Token tạm để dùng cho bước verify MFA
  message: string;
}

/**
 * Response trả về chỉ có token (refresh, reset).
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}
