// ═══════════════════════════════════════════════════════════════
// Create User DTO - بيانات إنشاء مستخدم
// ═══════════════════════════════════════════════════════════════

import { IsEmail, IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@realestate/shared-types';

export class CreateUserDto {
  @ApiProperty({ description: 'البريد الإلكتروني', example: 'ahmed@office.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'الاسم الأول', example: 'أحمد' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'اسم العائلة', example: 'محمد' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ description: 'الاسم الأول بالعربية' })
  @IsOptional()
  @IsString()
  firstNameAr?: string;

  @ApiPropertyOptional({ description: 'اسم العائلة بالعربية' })
  @IsOptional()
  @IsString()
  lastNameAr?: string;

  @ApiPropertyOptional({ description: 'رقم الهاتف' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'دور المستخدم', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ description: 'معرف الفرع' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'رقم ترخيص السمسرة' })
  @IsOptional()
  @IsString()
  brokerLicenseNo?: string;
}
