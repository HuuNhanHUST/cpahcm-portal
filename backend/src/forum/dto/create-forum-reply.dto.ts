import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateForumReplyDto {
  @IsString()
  @IsNotEmpty({ message: 'Nội dung trả lời không được để trống' })
  @MinLength(2, { message: 'Nội dung trả lời phải có ít nhất 2 ký tự' })
  @MaxLength(10000, {
    message: 'Nội dung trả lời không được vượt quá 10000 ký tự',
  })
  content!: string;
}
