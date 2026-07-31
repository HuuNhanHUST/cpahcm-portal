import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateLinkRequestDto {
  @IsString()
  @Matches(/^\d{10}(\d{3})?$/, {
    message: 'Mã số thuế phải gồm 10 hoặc 13 chữ số',
  })
  taxCode!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên công ty không được để trống' })
  @MinLength(2, { message: 'Tên công ty phải có ít nhất 2 ký tự' })
  @MaxLength(200, { message: 'Tên công ty không được vượt quá 200 ký tự' })
  companyName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
