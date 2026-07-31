import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  Length,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { toBoolean } from '../../common/utils/to-boolean.util.js';
import { parseJsonArray } from '../../common/utils/parse-json-array.util.js';
import { SERVICE_CATEGORIES } from './create-service.dto.js';

/** DTO cho Admin cập nhật dịch vụ đã xuất bản — mọi trường đều tùy chọn (partial update). */
export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Tiêu đề phải có ít nhất 5 ký tự' })
  @MaxLength(150, { message: 'Tiêu đề không được vượt quá 150 ký tự' })
  title?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'Slug chỉ gồm chữ thường, số và dấu gạch ngang',
  })
  slug?: string;

  @IsOptional()
  @IsIn(SERVICE_CATEGORIES, {
    message: `Chuyên mục phải thuộc: ${SERVICE_CATEGORIES.join(', ')}`,
  })
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;

  @IsOptional()
  @IsString()
  @MinLength(20, { message: 'Mô tả ngắn phải có ít nhất 20 ký tự' })
  @MaxLength(500, { message: 'Mô tả ngắn không được vượt quá 500 ký tự' })
  shortDesc?: string;

  @IsOptional()
  @IsString()
  longDescription?: string;

  @IsOptional()
  @IsArray({ message: 'Features phải là một mảng' })
  @ArrayMinSize(1, {
    message: 'Phải có ít nhất 1 mục trong "Gói dịch vụ bao gồm"',
  })
  @ArrayMaxSize(12, { message: 'Tối đa 12 mục trong "Gói dịch vụ bao gồm"' })
  @Length(3, 200, { each: true, message: 'Mỗi mục phải từ 3-200 ký tự' })
  @Transform(parseJsonArray)
  features?: string[];

  @IsOptional()
  @IsArray({ message: 'Deliverables phải là một mảng' })
  @ArrayMinSize(1, {
    message: 'Phải có ít nhất 1 mục trong "Kết quả nhận được"',
  })
  @ArrayMaxSize(12, { message: 'Tối đa 12 mục trong "Kết quả nhận được"' })
  @Length(3, 200, { each: true, message: 'Mỗi mục phải từ 3-200 ký tự' })
  @Transform(parseJsonArray)
  deliverables?: string[];

  // Kiểu `any` là bắt buộc — xem giải thích trong to-boolean.util.ts (enableImplicitConversion
  // global sẽ ép "false" thành `true` nếu khai kiểu `boolean`).
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: any;
}
