// ═══════════════════════════════════════════════════════════════
// Create Client DTO - بيانات إنشاء عميل جديد
// ═══════════════════════════════════════════════════════════════

import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ClientType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company',
}

export class CreateClientDto {
  @ApiProperty({
    description: 'الاسم الأول',
    example: 'أحمد',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    description: 'اسم العائلة',
    example: 'محمد',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiPropertyOptional({
    description: 'الاسم الأول بالعربية',
    example: 'أحمد',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstNameAr?: string;

  @ApiPropertyOptional({
    description: 'اسم العائلة بالعربية',
    example: 'محمد',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastNameAr?: string;

  @ApiProperty({
    description: 'رقم الهاتف الرئيسي',
    example: '01012345678',
  })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({
    description: 'رقم الهاتف الثانوي',
    example: '01123456789',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone2?: string;

  @ApiPropertyOptional({
    description: 'البريد الإلكتروني',
    example: 'ahmed@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'الرقم القومي (يُشفَّر تلقائياً)',
    example: '29501011234567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nationalId?: string;

  @ApiPropertyOptional({
    description: 'الجنسية',
    example: 'EG',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  nationality?: string;

  @ApiPropertyOptional({
    description: 'نوع العميل',
    enum: ClientType,
    default: ClientType.INDIVIDUAL,
  })
  @IsOptional()
  @IsEnum(ClientType)
  clientType?: ClientType;

  @ApiPropertyOptional({
    description: 'اسم الشركة (للشركات)',
    example: 'شركة النيل للتجارة',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyName?: string;

  @ApiPropertyOptional({
    description: 'الرقم الضريبي للشركة',
    example: '123456789',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string;

  @ApiPropertyOptional({
    description: 'مصدر العميل',
    example: 'واتساب',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @ApiPropertyOptional({
    description: 'الوسوم',
    example: ['ممول', 'مستثمر'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'ملاحظات',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'هل العميل VIP',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isVip?: boolean;
}
