// ═══════════════════════════════════════════════════════════════
// Contracts DTO - Data Transfer Objects للعقود
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────

/**
 * نوع العقد
 */
export enum ContractType {
  SALE = 'sale',
  RENT = 'rent',
  MANAGEMENT = 'management',
}

/**
 * حالة التوقيع
 */
export enum SignatureStatus {
  PENDING = 'pending',
  CLIENT_SIGNED = 'client_signed',
  OFFICE_SIGNED = 'office_signed',
  FULLY_SIGNED = 'fully_signed',
}

/**
 * أسماء أنواع العقود بالعربية
 */
export const CONTRACT_TYPE_AR: Record<ContractType, string> = {
  [ContractType.SALE]: 'عقد بيع',
  [ContractType.RENT]: 'عقد إيجار',
  [ContractType.MANAGEMENT]: 'عقد إدارة',
};

/**
 * أسماء حالات التوقيع بالعربية
 */
export const SIGNATURE_STATUS_AR: Record<SignatureStatus, string> = {
  [SignatureStatus.PENDING]: 'في الانتظار',
  [SignatureStatus.CLIENT_SIGNED]: 'العميل وقّع',
  [SignatureStatus.OFFICE_SIGNED]: 'المكتب وقّع',
  [SignatureStatus.FULLY_SIGNED]: 'موقّع بالكامل',
};

// ─────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────

/**
 * DTO لإنشاء عقد جديد
 */
export class CreateContractDto {
  @ApiProperty({ description: 'معرف الصفقة' })
  @IsUUID()
  @IsNotEmpty()
  dealId: string;

  @ApiPropertyOptional({ description: 'رقم العقد (يُولّد تلقائياً)' })
  @IsOptional()
  @IsString()
  contractNumber?: string;

  @ApiPropertyOptional({ description: 'تاريخ العقد' })
  @IsOptional()
  @IsDateString()
  contractDate?: string;

  @ApiPropertyOptional({ description: 'رابط ملف العقد' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لتحديث عقد
 */
export class UpdateContractDto extends PartialType(CreateContractDto) {
  @ApiPropertyOptional({ description: 'رقم العقد' })
  @IsOptional()
  @IsString()
  contractNumber?: string;

  @ApiPropertyOptional({ description: 'تاريخ العقد' })
  @IsOptional()
  @IsDateString()
  contractDate?: string;

  @ApiPropertyOptional({ description: 'رابط ملف العقد' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لتوقيع العقد
 */
export class SignContractDto {
  @ApiProperty({ description: 'من يوقّع', enum: ['client', 'office'] })
  @IsString()
  @IsNotEmpty()
  signedBy: 'client' | 'office';

  @ApiPropertyOptional({ description: 'تاريخ التوقيع' })
  @IsOptional()
  @IsDateString()
  signedAt?: string;
}

/**
 * DTO لربط مستند بالعقد
 */
export class LinkDocumentDto {
  @ApiProperty({ description: 'رابط الملف' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiPropertyOptional({ description: 'اسم الملف' })
  @IsOptional()
  @IsString()
  fileName?: string;
}

/**
 * DTO لفلترة العقود
 */
export class GetContractsDto {
  @ApiPropertyOptional({ description: 'معرف الصفقة' })
  @IsOptional()
  @IsUUID()
  dealId?: string;

  @ApiPropertyOptional({ description: 'حالة التوقيع', enum: SignatureStatus })
  @IsOptional()
  @IsEnum(SignatureStatus)
  signatureStatus?: SignatureStatus;

  @ApiPropertyOptional({ description: 'بحث نصي' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'رقم الصفحة', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'عدد العناصر في الصفحة', default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
