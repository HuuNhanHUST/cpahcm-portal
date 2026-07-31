import { IsOptional, IsString, MaxLength } from 'class-validator';

/** BUSINESS gửi yêu cầu xem thông tin liên hệ (SĐT/email) của 1 hồ sơ ứng viên trong kho —
 * candidateProfileId lấy từ :id trên URL, companyId/userId lấy từ JWT, không nhận qua body. */
export class CreateCandidateIntroductionRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  note?: string;
}
