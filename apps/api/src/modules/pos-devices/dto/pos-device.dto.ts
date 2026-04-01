// ═══════════════════════════════════════════════════════════════
// POS Device DTOs - نظام تشغيل المكتب العقاري المصري
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  IsDateString,
} from 'class-validator';

/**
 * DTO لتسجيل جهاز POS جديد
 */
export class RegisterPosDeviceDto {
  @ApiProperty({
    description: 'معرف الفرع',
    example: 'uuid-branch-id',
  })
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional({
    description: 'معرف المستخدم المسند إليه الجهاز',
    example: 'uuid-user-id',
  })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @ApiProperty({
    description: 'الرقم التسلسلي للـ POS (يُسجَّل في ETA)',
    example: 'POS-123456789',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  posSerial: string;

  @ApiProperty({
    description: 'إصدار نظام التشغيل للـ POS',
    example: 'Android 11',
  })
  @IsString()
  posOsVersion: string;

  @ApiProperty({
    description: 'موديل إطار عمل POS',
    example: 'PAX A920',
  })
  @IsString()
  posModelFramework: string;

  @ApiPropertyOptional({
    description: 'اسم الجهاز',
    example: 'POS-مكتب-القاهرة',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'موديل الجهاز',
    example: 'Samsung Galaxy Tab A7',
  })
  @IsOptional()
  @IsString()
  deviceModel?: string;
}

/**
 * DTO لتحديث جهاز POS
 */
export class UpdatePosDeviceDto extends PartialType(RegisterPosDeviceDto) {
  @ApiPropertyOptional({
    description: 'اسم الجهاز',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'موديل الجهاز',
  })
  @IsOptional()
  @IsString()
  deviceModel?: string;
}

/**
 * DTO للاستجابة (بدون البيانات الحساسة)
 */
export class PosDeviceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  branchId: string;

  @ApiPropertyOptional()
  assignedToUserId?: string;

  @ApiProperty()
  posSerial: string;

  @ApiProperty()
  posOsVersion: string;

  @ApiProperty()
  posModelFramework: string;

  @ApiPropertyOptional()
  deviceName?: string;

  @ApiPropertyOptional()
  deviceModel?: string;

  @ApiProperty({
    enum: ['ACTIVE', 'INACTIVE', 'RETIRED', 'SUSPENDED'],
    description: 'حالة الجهاز',
  })
  status: string;

  @ApiPropertyOptional()
  lastSeenAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // ملاحظة: clientSecret و preSharedKey لا تُضمَّن في الاستجابة
}

/**
 * DTO لتسجيل نشاط الجهاز (heartbeat)
 */
export class HeartbeatDto {
  @ApiPropertyOptional({
    description: 'وقت آخر نشاط',
    example: '2026-03-21T12:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  lastSeenAt?: string;
}
