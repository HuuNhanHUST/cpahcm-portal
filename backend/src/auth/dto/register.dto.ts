import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
  Matches,
} from 'class-validator';
import { Role } from '@prisma/client';
import { IsStrongPassword } from '../../common/validators/strong-password.validator.js';
import { IsVietnamesePhoneNumber } from '../../common/validators/vn-phone.validator.js';

/** Role được phép chọn khi tự đăng ký — KHÔNG bao gồm ADMIN. */
export const SELF_REGISTER_ROLES = [Role.MEMBER, Role.BUSINESS] as const;

/**
 * DTO cho đăng ký tài khoản mới.
 * User tự đăng ký chỉ được chọn MEMBER hoặc BUSINESS.
 * ADMIN chỉ được tạo bởi system (qua Admin API, không qua endpoint public này).
 */
export class RegisterDto {
  @IsEmail({}, { message: 'Email không hợp lệ!' })
  email!: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự!' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự!' })
  @MaxLength(50, { message: 'Mật khẩu không được vượt quá 50 ký tự!' })
  @IsStrongPassword()
  password!: string;

  @IsString({ message: 'Họ tên phải là chuỗi ký tự!' })
  @MinLength(2, { message: 'Họ tên phải có ít nhất 2 ký tự!' })
  @MaxLength(100, { message: 'Họ tên không được vượt quá 100 ký tự!' })
  fullName!: string;

  @IsOptional()
  @IsVietnamesePhoneNumber()
  phone?: string;

  /** Mặc định MEMBER. Chỉ được chọn MEMBER hoặc BUSINESS khi tự đăng ký — ADMIN bị chặn tuyệt đối. */
  @IsOptional()
  @IsIn(SELF_REGISTER_ROLES, {
    message: 'Role chỉ được là MEMBER hoặc BUSINESS!',
  })
  role?: Role;

  // Chỉ áp dụng khi role=BUSINESS — cho phép điền công ty ngay lúc đăng ký thay vì phải vào
  // /tai-khoan gửi yêu cầu liên kết ở 1 bước riêng sau khi đăng nhập (xem AuthService.register).
  // Optional ở tầng DTO vì BUSINESS vẫn có thể bỏ qua và tự liên kết công ty sau.
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}(\d{3})?$/, {
    message: 'Mã số thuế phải gồm 10 hoặc 13 chữ số',
  })
  taxCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Tên công ty phải có ít nhất 2 ký tự' })
  @MaxLength(200, { message: 'Tên công ty không được vượt quá 200 ký tự' })
  companyName?: string;
}
