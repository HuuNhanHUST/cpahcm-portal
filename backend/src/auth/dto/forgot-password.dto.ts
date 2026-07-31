import { IsEmail } from 'class-validator';

/**
 * DTO cho yêu cầu quên mật khẩu.
 */
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ!' })
  email!: string;
}
