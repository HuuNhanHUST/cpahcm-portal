import { IsBoolean } from 'class-validator';

/** Body chung cho PATCH /admin/forum/topics/:id/pin và /lock — JSON thường, không multipart. */
export class SetTopicFlagDto {
  @IsBoolean()
  value!: boolean;
}
