import { IsString, MinLength, MaxLength } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/strong-password.validator.js';

/**
 * DTO cho đặt lại mật khẩu.
 */
export class ResetPasswordDto {
  @IsString({ message: 'Token không hợp lệ!' })
  token!: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự!' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự!' })
  @MaxLength(50, { message: 'Mật khẩu không được vượt quá 50 ký tự!' })
  @IsStrongPassword()
  newPassword!: string;
}
