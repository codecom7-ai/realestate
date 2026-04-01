// ═══════════════════════════════════════════════════════════════
// Setup DTO - بيانات إعداد النظام
// ═══════════════════════════════════════════════════════════════

import { IsString, IsEmail, IsOptional, MinLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetupDto {
  @ApiProperty({ description: 'اسم المكتب', example: 'مكتب النيل للعقارات' })
  @IsString()
  officeName: string;

  @ApiPropertyOptional({ description: 'اسم المكتب بالعربية' })
  @IsOptional()
  @IsString()
  officeNameAr?: string;

  @ApiPropertyOptional({ description: 'الاسم القانوني' })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional({ description: 'رقم السجل التجاري' })
  @IsOptional()
  @IsString()
  commercialRegNo?: string;

  @ApiProperty({ description: 'الرقم الضريبي (RIN لـ ETA)', example: '123456789' })
  @IsString()
  taxId: string;

  @ApiPropertyOptional({ description: 'رقم ترخيص السمسرة (578)' })
  @IsOptional()
  @IsString()
  brokerLicenseNo?: string;

  @ApiPropertyOptional({ description: 'التصنيف (أ|ب|ج)', enum: ['A', 'B', 'C'] })
  @IsOptional()
  @IsEnum(['A', 'B', 'C'])
  classification?: string;

  @ApiPropertyOptional({ description: 'رقم الهاتف' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'البريد الإلكتروني' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'العنوان' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'المدينة' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: 'اسم المالك', example: 'أحمد محمد' })
  @IsString()
  ownerName: string;

  @ApiProperty({ description: 'بريد المالك', example: 'ahmed@office.com' })
  @IsEmail()
  ownerEmail: string;

  @ApiProperty({ description: 'كلمة مرور المالك', minLength: 8 })
  @IsString()
  @MinLength(8)
  ownerPassword: string;

  @ApiPropertyOptional({ description: 'هاتف المالك' })
  @IsOptional()
  @IsString()
  ownerPhone?: string;

  // ETA Setup (الخطوة 3)
  @ApiPropertyOptional({ description: 'الرقم التسلسلي لجهاز POS' })
  @IsOptional()
  @IsString()
  etaPosSerial?: string;

  @ApiPropertyOptional({ description: 'إصدار نظام تشغيل POS' })
  @IsOptional()
  @IsString()
  etaPosOsVersion?: string;

  // WhatsApp Setup (الخطوة 4)
  @ApiPropertyOptional({ description: 'رمز WhatsApp Business API' })
  @IsOptional()
  @IsString()
  whatsappToken?: string;

  @ApiPropertyOptional({ description: 'معرف هاتف WhatsApp' })
  @IsOptional()
  @IsString()
  whatsappPhoneId?: string;
}

export class SetupStatusDto {
  @ApiProperty({ description: 'هل الإعداد مكتمل' })
  isSetupDone: boolean;

  @ApiProperty({ description: 'رابط التوجيه' })
  redirectTo: string;
}
