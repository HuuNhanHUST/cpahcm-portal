import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewLinkRequestDto {
  @IsIn(['APPROVED', 'REJECTED'], {
    message: 'status phải là APPROVED hoặc REJECTED',
  })
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNote?: string;
}
