import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  MinLength,
  MaxLength,
} from 'class-validator';

/** DTO cho Admin cập nhật danh mục diễn đàn — mọi trường đều tùy chọn (partial update). */
export class UpdateForumCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Tên danh mục phải có ít nhất 2 ký tự' })
  @MaxLength(60, { message: 'Tên danh mục không được vượt quá 60 ký tự' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Mô tả không được vượt quá 300 ký tự' })
  description?: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  // Endpoint này nhận JSON body (không phải multipart), nên không dính bug
  // enableImplicitConversion — khai kiểu boolean bình thường là an toàn.
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
