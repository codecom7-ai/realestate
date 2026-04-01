// ═══════════════════════════════════════════════════════════════
// Create Activity DTO - بيانات إنشاء نشاط جديد
// ═══════════════════════════════════════════════════════════════

import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsObject,
  IsDateString,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// أنواع الأنشطة المدعومة
export enum ActivityType {
  CALL = 'call',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  MEETING = 'meeting',
  NOTE = 'note',
  VIEWING = 'viewing',
  CONTRACT = 'contract',
  PAYMENT = 'payment',
  SYSTEM = 'system',
}

// أنواع الكيانات المدعومة
export enum EntityType {
  LEAD = 'lead',
  CLIENT = 'client',
  PROPERTY = 'property',
  DEAL = 'deal',
  CONTRACT = 'contract',
  PAYMENT = 'payment',
}

export class CreateActivityDto {
  @ApiProperty({
    description: 'معرف المستخدم الذي قام بالنشاط',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description: 'نوع الكيان المرتبط',
    enum: EntityType,
    example: EntityType.LEAD,
  })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({
    description: 'معرف الكيان المرتبط',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  entityId: string;

  @ApiProperty({
    description: 'نوع النشاط',
    enum: ActivityType,
    example: ActivityType.CALL,
  })
  @IsEnum(ActivityType)
  activityType: ActivityType;

  @ApiProperty({
    description: 'عنوان النشاط',
    example: 'مكالمة هاتفية مع العميل',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description: 'تفاصيل النشاط',
    example: 'تم التواصل مع العميل وتم تحديد موعد للمعاينة',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @ApiPropertyOptional({
    description: 'بيانات إضافية (JSON)',
    example: { duration: 15, outcome: 'scheduled_viewing' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'هل النشاط مُولَّد بواسطة AI',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @ApiPropertyOptional({
    description: 'تاريخ ووقت النشاط',
    example: '2026-03-21T10:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

export class UpdateActivityDto {
  @ApiPropertyOptional({
    description: 'عنوان النشاط',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'تفاصيل النشاط',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @ApiPropertyOptional({
    description: 'بيانات إضافية (JSON)',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class GetTimelineDto {
  @ApiPropertyOptional({
    description: 'نوع الكيان للفلترة',
    enum: EntityType,
  })
  @IsOptional()
  @IsEnum(EntityType)
  entityType?: EntityType;

  @ApiPropertyOptional({
    description: 'معرف الكيان للفلترة',
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'نوع النشاط للفلترة',
    enum: ActivityType,
  })
  @IsOptional()
  @IsEnum(ActivityType)
  activityType?: ActivityType;

  @ApiPropertyOptional({
    description: 'معرف المستخدم للفلترة',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'تاريخ البداية',
    example: '2026-03-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'تاريخ النهاية',
    example: '2026-03-21',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'رقم الصفحة',
    example: 1,
    default: 1,
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'عدد النتائج في الصفحة',
    example: 20,
    default: 20,
  })
  limit?: number;
}
