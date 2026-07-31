import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class CreatePostDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề bài viết không được để trống' })
  title!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  @IsNotEmpty({ message: 'Nội dung bài viết không được để trống' })
  content!: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsString()
  @IsNotEmpty({ message: 'Chuyên mục không được để trống' })
  category!: string;

  // Kiểu `any` là bắt buộc, không phải sơ suất — global ValidationPipe bật enableImplicitConversion,
  // nếu khai kiểu `boolean` thì class-transformer sẽ tự ép "false" (string) thành `true` (boolean)
  // TRƯỚC KHI @Transform chạy, ghi đè âm thầm kết quả đúng. Xem to-boolean.util.ts để biết chi tiết.
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isPublished?: any;
}
