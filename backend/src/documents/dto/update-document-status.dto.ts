import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export const DOC_STATUSES = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'REJECTED',
] as const;

export class UpdateDocumentStatusDto {
  @IsIn(DOC_STATUSES, {
    message: `Trạng thái phải thuộc: ${DOC_STATUSES.join(', ')}`,
  })
  status!: string;

  // Bắt buộc nhập lý do khi từ chối chứng từ — khách hàng cần biết vì sao để bổ sung/sửa lại.
  @ValidateIf((o) => o.status === 'REJECTED')
  @IsString()
  @IsNotEmpty({ message: 'Phải nhập lý do khi từ chối chứng từ' })
  @MaxLength(500)
  reviewNote?: string;
}
