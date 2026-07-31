import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';

/** class-validator @IsOptional() chỉ bỏ qua khi giá trị là null/undefined, KHÔNG bỏ qua chuỗi
 * rỗng "" — form bỏ trống ô video sẽ gửi "" chứ không phải undefined, cần tự ép "" → undefined. */
const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

/**
 * 1 bài học trong module. `id` chỉ có khi sửa bài học đã tồn tại — dùng để CoursesService biết
 * đâu là bài học cần GIỮ NGUYÊN (bảo toàn videoUrl/fileUrl đã đính kèm trước đó) thay vì xóa hết
 * tạo lại như cách cũ (String[] replace-all), vốn sẽ xóa mất file/video đã gắn mỗi lần Admin lưu
 * lại khóa học (kể cả chỉ sửa giá tiền).
 */
export class CourseLessonDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên bài học không được để trống' })
  @Length(3, 200, { message: 'Tên bài học phải từ 3-200 ký tự' })
  title!: string;

  // Link video dán tay (YouTube/Vimeo không công khai...) — không tự host video trên server.
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUrl({}, { message: 'Link video không hợp lệ' })
  @MaxLength(500)
  videoUrl?: string;
}
