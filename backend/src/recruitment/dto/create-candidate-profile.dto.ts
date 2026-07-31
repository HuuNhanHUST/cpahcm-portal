import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEmail,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsVietnamesePhoneNumber } from '../../common/validators/vn-phone.validator.js';

export class ExperienceDto {
  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  salary?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class EducationDto {
  @IsString()
  @IsNotEmpty()
  degree: string;

  @IsString()
  @IsNotEmpty()
  school: string;

  @IsOptional()
  @IsString()
  major?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  gradYear?: number;
}

export class ReferenceDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsVietnamesePhoneNumber()
  phone?: string;
}

export class CreateCandidateProfileDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsVietnamesePhoneNumber()
  phone: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  @IsNotEmpty()
  desiredPosition: string;

  @IsString()
  @IsNotEmpty()
  desiredLevel: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsNotEmpty()
  industry: string;

  @IsString()
  @IsNotEmpty()
  educationLevel: string;

  @IsString()
  @IsNotEmpty()
  experienceYears: string;

  @IsString()
  @IsNotEmpty()
  workType: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999999)
  minSalary?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999999)
  maxSalary?: number;

  @IsOptional()
  @IsString()
  careerGoal?: string;

  @IsOptional()
  @IsString()
  computerSkills?: string;

  @IsOptional()
  @IsString()
  languages?: string;

  @IsOptional()
  @IsString()
  cvUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experiences?: ExperienceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  educations?: EducationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReferenceDto)
  references?: ReferenceDto[];
}
