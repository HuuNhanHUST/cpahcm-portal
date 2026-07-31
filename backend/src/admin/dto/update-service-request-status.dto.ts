import { IsIn } from 'class-validator';

export const SERVICE_REQUEST_STATUSES = [
  'NEW',
  'CONTACTED',
  'QUOTED',
  'SIGNED',
  'REJECTED',
] as const;

export class UpdateServiceRequestStatusDto {
  @IsIn(SERVICE_REQUEST_STATUSES, {
    message: `Status phải là một trong: ${SERVICE_REQUEST_STATUSES.join(', ')}`,
  })
  status!: (typeof SERVICE_REQUEST_STATUSES)[number];
}
