// ═══════════════════════════════════════════════════════════════
// Update Organization DTO
// ═══════════════════════════════════════════════════════════════

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ description: 'اسم المكتب' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'اسم المكتب بالعربية' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({ description: 'الاسم القانوني' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional({ description: 'رقم السجل التجاري' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  commercialRegNo?: string;

  @ApiPropertyOptional({ description: 'الرقم الضريبي (RIN)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({ description: 'رقم ترخيص السمسرة' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  brokerLicenseNo?: string;

  @ApiPropertyOptional({
    description: 'تصنيف المكتب',
    enum: ['A', 'B', 'C'],
  })
  @IsOptional()
  @IsEnum(['A', 'B', 'C'])
  classification?: string;

  @ApiPropertyOptional({ description: 'رقم الهاتف' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'البريد الإلكتروني' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'العنوان' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'المدينة' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'رابط الشعار' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;
}
