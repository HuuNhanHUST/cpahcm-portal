import { IsOptional, IsUUID } from 'class-validator';

/** Gán hoặc gỡ Company khỏi 1 user (role BUSINESS) — companyId=null nghĩa là gỡ liên kết. */
export class AssignUserCompanyDto {
  @IsOptional()
  @IsUUID('4', { message: 'companyId không hợp lệ' })
  companyId?: string | null;
}
