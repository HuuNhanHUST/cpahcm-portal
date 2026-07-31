import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

/** DTO cho tác giả (hoặc Admin) sửa lại topic đã đăng — không cho đổi categoryId sau khi tạo. */
export class UpdateForumTopicDto {
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Tiêu đề phải có ít nhất 10 ký tự' })
  @MaxLength(150, { message: 'Tiêu đề không được vượt quá 150 ký tự' })
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Nội dung phải có ít nhất 10 ký tự' })
  @MaxLength(10000, { message: 'Nội dung không được vượt quá 10000 ký tự' })
  content?: string;
}
