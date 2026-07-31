import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { toBoolean } from '../../common/utils/to-boolean.util.js';

/** DTO cho Admin cập nhật tin tuyển dụng đã xuất bản — mọi trường đều tùy chọn (partial update). */
export class UpdateJobPostingDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsString()
  benefits?: string;

  @IsOptional()
  @IsString()
  salary?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  // Kiểu `any` là bắt buộc, không phải sơ suất — xem giải thích chi tiết trong to-boolean.util.ts
  // (enableImplicitConversion global sẽ ép "false" thành `true` nếu khai kiểu `boolean`).
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: any;
}
