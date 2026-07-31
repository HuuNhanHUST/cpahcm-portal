import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsVietnamesePhoneNumber } from '../../common/validators/vn-phone.validator.js';

export class CreateServiceRequestDto {
  @ApiProperty({ example: 'Công ty TNHH Dược Phẩm Việt Pháp' })
  @IsNotEmpty({ message: 'Tên công ty không được để trống' })
  @IsString()
  companyName: string;

  @ApiPropertyOptional({ example: '0312345678' })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiProperty({ example: 'Bà Trần Thị Thanh' })
  @IsNotEmpty({ message: 'Tên người liên hệ không được để trống' })
  @IsString()
  contactName: string;

  @ApiProperty({ example: '0918234567' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsVietnamesePhoneNumber()
  phone: string;

  @ApiProperty({ example: 'thanh.tran@vietphap.com.vn' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Huệ, Q.1, TP.HCM' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Kiểm toán BCTC & Quyết toán Thuế 2025' })
  @IsNotEmpty({ message: 'Tên dịch vụ không được để trống' })
  @IsString()
  service: string;

  @ApiPropertyOptional({ example: 'Cần báo giá dịch vụ kiểm toán năm 2025' })
  @IsOptional()
  @IsString()
  message?: string;
}
