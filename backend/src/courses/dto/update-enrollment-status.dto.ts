import { IsIn } from 'class-validator';

export const ENROLLMENT_STATUSES = [
  'PENDING',
  'PAID',
  'STUDYING',
  'COMPLETED',
  'CANCELLED',
] as const;

export class UpdateEnrollmentStatusDto {
  @IsIn(ENROLLMENT_STATUSES, {
    message: `Status phải là một trong: ${ENROLLMENT_STATUSES.join(', ')}`,
  })
  status!: (typeof ENROLLMENT_STATUSES)[number];
}
