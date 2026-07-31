import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
  IsArray,
  IsNumber,
  IsInt,
  Min,
  Max,
  ArrayMaxSize,
  ValidateNested,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform, plainToInstance } from 'class-transformer';
import { toBoolean } from '../../common/utils/to-boolean.util.js';
import { parseJsonArray } from '../../common/utils/parse-json-array.util.js';
import { IsGreaterThanField } from '../../common/validators/greater-than-field.validator.js';
import { CourseModuleDto } from './course-module.dto.js';

/**
 * `modules` đến từ multipart/form-data dưới dạng JSON string (vì request có kèm ảnh, không thể
 * gửi mảng lồng object trực tiếp) — parse thành mảng plain object rồi tự dựng CourseModuleDto[]
 * ngay trong 1 Transform duy nhất. Không dùng @Type()+@Transform() riêng lẻ vì thứ tự áp dụng
 * giữa 2 decorator này với field JSON-string không đảm bảo, dễ khiến @ValidateNested() validate
 * nhầm trên object thường thay vì instance thật.
 */
const parseAndInstantiateModules = ({ value }: { value: unknown }) => {
  const arr = parseJsonArray({ value });
  if (!Array.isArray(arr)) return arr;
  return arr.map((item) => plainToInstance(CourseModuleDto, item));
};

export const COURSE_CATEGORIES = [
  'CPA',
  'Kế toán trưởng',
  'Kế toán tổng hợp',
  'Thuế',
] as const;

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên khóa học không được để trống' })
  @MinLength(5, { message: 'Tên khóa học phải có ít nhất 5 ký tự' })
  @MaxLength(150, { message: 'Tên khóa học không được vượt quá 150 ký tự' })
  title!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'Slug chỉ gồm chữ thường, số và dấu gạch ngang',
  })
  slug?: string;

  @IsIn(COURSE_CATEGORIES, {
    message: `Chuyên mục phải thuộc: ${COURSE_CATEGORIES.join(', ')}`,
  })
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  longDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  instructor?: string;

  @IsNumber()
  @Min(0, { message: 'Học phí không được âm' })
  @Max(999999999)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999999)
  @IsGreaterThanField('price', {
    message: 'Giá gốc phải lớn hơn học phí hiện tại',
  })
  originalPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  lessons?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  hours?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  schedule?: string;

  // Kiểu `any` là bắt buộc cho cả 2 field dưới — xem giải thích trong to-boolean.util.ts
  // (enableImplicitConversion global sẽ ép "false" thành `true` nếu khai kiểu `boolean`).
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isHot?: any;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: any;

  @IsOptional()
  @IsArray({ message: 'Giáo trình phải là một mảng' })
  @ArrayMaxSize(30, { message: 'Tối đa 30 module mỗi khóa học' })
  @ValidateNested({ each: true })
  @Transform(parseAndInstantiateModules)
  modules?: CourseModuleDto[];
}
