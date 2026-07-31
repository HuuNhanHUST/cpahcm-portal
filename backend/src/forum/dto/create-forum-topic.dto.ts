import {
  IsString,
  IsNotEmpty,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateForumTopicDto {
  @IsUUID('4', { message: 'Danh mục không hợp lệ' })
  categoryId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MinLength(10, { message: 'Tiêu đề phải có ít nhất 10 ký tự' })
  @MaxLength(150, { message: 'Tiêu đề không được vượt quá 150 ký tự' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  @MinLength(10, { message: 'Nội dung phải có ít nhất 10 ký tự' })
  @MaxLength(10000, { message: 'Nội dung không được vượt quá 10000 ký tự' })
  content!: string;
}
