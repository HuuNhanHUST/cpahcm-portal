import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { IsVietnamesePhoneNumber } from '../../common/validators/vn-phone.validator.js';

/** DTO cho Admin cập nhật công ty — mọi trường đều tùy chọn (partial update). */
export class UpdateCompanyDto {
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
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsVietnamesePhoneNumber()
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
