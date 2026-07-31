import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';
import { IsVietnamesePhoneNumber } from '../../common/validators/vn-phone.validator.js';

export class CreateEmployerRequestDto {
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  contactName: string;

  @IsVietnamesePhoneNumber()
  phone: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsOptional()
  @IsString()
  expectedSalary?: string;

  @IsOptional()
  @IsString()
  jobDescription?: string;
}
