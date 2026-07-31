import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const DOCUMENT_CATEGORIES = [
  'INVOICE',
  'TAX_REPORT',
  'CONTRACT',
  'ACCOUNTING',
  'OTHER',
] as const;

export class CreateDocumentDto {
  @IsIn(DOCUMENT_CATEGORIES, {
    message: `Danh mục phải thuộc: ${DOCUMENT_CATEGORIES.join(', ')}`,
  })
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Ghi chú không được vượt quá 500 ký tự' })
  note?: string;
}
