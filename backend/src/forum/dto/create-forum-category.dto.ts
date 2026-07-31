import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateForumCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @MinLength(2, { message: 'Tên danh mục phải có ít nhất 2 ký tự' })
  @MaxLength(60, { message: 'Tên danh mục không được vượt quá 60 ký tự' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Mô tả không được vượt quá 300 ký tự' })
  description?: string;
}
