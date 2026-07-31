import { IsString, MinLength, MaxLength } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/strong-password.validator.js';

/**
 * DTO cho đổi mật khẩu.
 */
export class ChangePasswordDto {
  @IsString({ message: 'Mật khẩu hiện tại phải là chuỗi ký tự!' })
  @MinLength(1, { message: 'Vui lòng nhập mật khẩu hiện tại!' })
  currentPassword!: string;

  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự!' })
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự!' })
  @MaxLength(50, { message: 'Mật khẩu mới không được vượt quá 50 ký tự!' })
  @IsStrongPassword()
  newPassword!: string;
}
