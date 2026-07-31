import { IsString } from 'class-validator';

/**
 * DTO cho refresh token.
 */
export class RefreshTokenDto {
  @IsString({ message: 'Refresh token không hợp lệ!' })
  refreshToken!: string;
}
