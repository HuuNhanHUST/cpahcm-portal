import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { toBoolean } from '../../common/utils/to-boolean.util.js';

/**
 * DTO cho Admin tạo/xuất bản tin tuyển dụng thật (JobPosting).
 * Đây là bước "duyệt" sau khi Doanh nghiệp (role BUSINESS) gửi yêu cầu đăng tin
 * (EmployerRequest) — Admin xem xét, biên tập lại nội dung, thêm ảnh rồi xuất bản.
 * Ảnh đi kèm dưới dạng multipart file (xem AdminController), không nằm trong DTO này.
 */
export class CreateJobPostingDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề vị trí tuyển dụng không được để trống' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Phòng ban không được để trống' })
  department!: string;

  @IsString()
  @IsNotEmpty({ message: 'Mô tả công việc không được để trống' })
  description!: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsString()
  benefits?: string;

  @IsOptional()
  @IsString()
  salary?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  // Kiểu `any` là bắt buộc, không phải sơ suất — xem giải thích chi tiết trong to-boolean.util.ts
  // (enableImplicitConversion global sẽ ép "false" thành `true` nếu khai kiểu `boolean`).
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: any;

  // Khi Admin xuất bản tin từ 1 EmployerRequest (nút "Xuất Bản Tin"), gửi kèm id gốc để backend
  // liên kết ngược lại — nếu không, BUSINESS gửi yêu cầu sẽ không bao giờ biết tin đã lên trang
  // công khai hay chưa (xem EmployerRequest.publishedJobId).
  @IsOptional()
  @IsString()
  employerRequestId?: string;
}
