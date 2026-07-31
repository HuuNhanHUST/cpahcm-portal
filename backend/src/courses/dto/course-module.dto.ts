import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CourseLessonDto } from './course-lesson.dto.js';

/** 1 module trong giáo trình khóa học — submit nguyên mảng modules mỗi lần lưu. `id` chỉ có khi
 * sửa module đã tồn tại, cùng lý do với CourseLessonDto.id (bảo toàn nội dung đã đính kèm). */
export class CourseModuleDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên module không được để trống' })
  @MaxLength(150)
  title!: string;

  @IsArray({ message: 'Danh sách bài học phải là một mảng' })
  @ArrayMaxSize(50, { message: 'Tối đa 50 bài học mỗi module' })
  @ValidateNested({ each: true })
  @Type(() => CourseLessonDto)
  lessons!: CourseLessonDto[];
}
