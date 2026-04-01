// ═══════════════════════════════════════════════════════════════
// Create Lead DTO - بيانات إنشاء lead جديد
// ═══════════════════════════════════════════════════════════════

import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStage, PropertyType } from '@realestate/shared-types';

export class CreateLeadDto {
  @ApiPropertyOptional({
    description: 'معرف العميل المرتبط',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'معرف السمسار المسؤول',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({
    description: 'مصدر الـ Lead',
    example: 'واتساب',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @ApiPropertyOptional({
    description: 'الميزانية المتاحة',
    example: 1500000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({
    description: 'عملة الميزانية',
    example: 'EGP',
    default: 'EGP',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  budgetCurrency?: string;

  @ApiPropertyOptional({
    description: 'المناطق المفضلة',
    example: ['مصر الجديدة', 'القاهرة الجديدة', 'الشروق'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredAreas?: string[];

  @ApiPropertyOptional({
    description: 'أنواع العقارات المطلوبة',
    enum: PropertyType,
    isArray: true,
    example: [PropertyType.APARTMENT, PropertyType.VILLA],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PropertyType, { each: true })
  propertyTypes?: PropertyType[];

  @ApiPropertyOptional({
    description: 'أقل مساحة بالمتر المربع',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSize?: number;

  @ApiPropertyOptional({
    description: 'أكبر مساحة بالمتر المربع',
    example: 250,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSize?: number;

  @ApiPropertyOptional({
    description: 'أقل عدد غرف نوم',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minBedrooms?: number;

  @ApiPropertyOptional({
    description: 'أكبر عدد غرف نوم',
    example: 4,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxBedrooms?: number;

  @ApiPropertyOptional({
    description: 'ملاحظات',
    example: 'العميل يبحث عن شقة في دور متوسط مع إطلالة',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'تاريخ الإغلاق المتوقع',
    example: '2026-04-30',
  })
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;
}

export class ChangeStageDto {
  @ApiProperty({
    description: 'المرحلة الجديدة',
    enum: LeadStage,
    example: LeadStage.CONTACTED,
  })
  @IsEnum(LeadStage)
  stage: LeadStage;

  @ApiPropertyOptional({
    description: 'سبب التغيير (إلزامي عند CLOSED_LOST)',
    example: 'العميل قرر عدم الشراء',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AssignLeadDto {
  @ApiProperty({
    description: 'معرف المستخدم الجديد للمسؤولية',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsString()
  userId: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({
    description: 'الميزانية المتاحة',
    example: 1800000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({
    description: 'عملة الميزانية',
    example: 'EGP',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  budgetCurrency?: string;

  @ApiPropertyOptional({
    description: 'المناطق المفضلة',
    example: ['مصر الجديدة', 'القاهرة الجديدة'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredAreas?: string[];

  @ApiPropertyOptional({
    description: 'أنواع العقارات المطلوبة',
    enum: PropertyType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PropertyType, { each: true })
  propertyTypes?: PropertyType[];

  @ApiPropertyOptional({
    description: 'أقل مساحة بالمتر المربع',
    example: 120,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSize?: number;

  @ApiPropertyOptional({
    description: 'أكبر مساحة بالمتر المربع',
    example: 300,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSize?: number;

  @ApiPropertyOptional({
    description: 'أقل عدد غرف نوم',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minBedrooms?: number;

  @ApiPropertyOptional({
    description: 'أكبر عدد غرف نوم',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxBedrooms?: number;

  @ApiPropertyOptional({
    description: 'ملاحظات',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'تاريخ الإغلاق المتوقع',
    example: '2026-05-15',
  })
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;
}
