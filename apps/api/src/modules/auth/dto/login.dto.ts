// ═══════════════════════════════════════════════════════════════
// Login DTO - بيانات تسجيل الدخول
// ═══════════════════════════════════════════════════════════════

import { IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'البريد الإلكتروني', example: 'ahmed@office.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'كلمة المرور' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'رمز التحقق الثنائي (TOTP)' })
  @IsOptional()
  @IsString()
  totp?: string;
}
