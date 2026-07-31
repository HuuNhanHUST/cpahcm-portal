import { IsString, Length, IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO cho xác thực MFA OTP.
 */
export class VerifyMfaDto {
  @IsString({ message: 'Mã OTP không hợp lệ!' })
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 chữ số!' })
  otp!: string;
}

/**
 * DTO cho bật/tắt MFA.
 * Khi TẮT MFA phải xác thực lại bằng mật khẩu hiện tại (tránh kẻ chiếm session tự tắt lớp bảo vệ thứ 2).
 */
export class ToggleMfaDto {
  @IsBoolean({ message: 'Giá trị enable phải là boolean!' })
  enable!: boolean;

  @IsOptional()
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự!' })
  currentPassword?: string;
}
