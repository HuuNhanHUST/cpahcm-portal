import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { IsVietnamesePhoneNumber } from '../../common/validators/vn-phone.validator.js';

/**
 * DTO cho cập nhật profile.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'Họ tên phải là chuỗi ký tự!' })
  @MinLength(2, { message: 'Họ tên phải có ít nhất 2 ký tự!' })
  @MaxLength(100, { message: 'Họ tên không được vượt quá 100 ký tự!' })
  fullName?: string;

  @IsOptional()
  @IsVietnamesePhoneNumber()
  phone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
