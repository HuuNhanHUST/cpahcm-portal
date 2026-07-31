import { Role } from '@prisma/client';

/**
 * JWT Access Token payload structure.
 */
export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: Role;
  iat?: number; // issued at
  exp?: number; // expires at
}

/**
 * JWT Refresh Token payload structure.
 */
export interface JwtRefreshPayload extends JwtPayload {
  /** Flag to distinguish refresh tokens from access tokens */
  isRefreshToken: true;
  /** Session identifier — dùng để tra cứu/thu hồi session trên Redis */
  jti: string;
}
