import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { IsVietnamesePhoneNumber } from '../../common/validators/vn-phone.validator.js';

export class CreateJobApplicationDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsVietnamesePhoneNumber()
  phone: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
