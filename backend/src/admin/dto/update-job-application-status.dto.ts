import { IsIn } from 'class-validator';

export const JOB_APPLICATION_STATUSES = [
  'NEW',
  'REVIEWING',
  'INTERVIEW',
  'HIRED',
  'REJECTED',
] as const;

export class UpdateJobApplicationStatusDto {
  @IsIn(JOB_APPLICATION_STATUSES, {
    message: `Status phải là một trong: ${JOB_APPLICATION_STATUSES.join(', ')}`,
  })
  status!: (typeof JOB_APPLICATION_STATUSES)[number];
}
