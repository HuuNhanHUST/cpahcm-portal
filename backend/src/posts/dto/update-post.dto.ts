import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

/** DTO cho Admin cập nhật bài viết đã xuất bản — mọi trường đều tùy chọn (partial update). */
export class UpdatePostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  category?: string;

  // Kiểu `any` là bắt buộc — xem giải thích trong to-boolean.util.ts (enableImplicitConversion
  // global sẽ ép "false" thành `true` nếu khai kiểu `boolean`).
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isPublished?: any;
}
