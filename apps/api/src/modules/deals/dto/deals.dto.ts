// ═══════════════════════════════════════════════════════════════
// Deals DTO - Data Transfer Objects للصفقات
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  IsDateString,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DealStage, PaymentMethod } from '@realestate/shared-types';

// ─────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────

/**
 * نوع الصفقة
 */
export enum DealType {
  SALE = 'sale',
  RENT = 'rent',
  MANAGEMENT = 'management',
}

/**
 * أسماء أنواع الصفقات بالعربية
 */
export const DEAL_TYPE_AR: Record<DealType, string> = {
  [DealType.SALE]: 'بيع',
  [DealType.RENT]: 'إيجار',
  [DealType.MANAGEMENT]: 'إدارة',
};

/**
 * أسماء مراحل الصفقة بالعربية
 */
export const DEAL_STAGE_AR: Record<DealStage, string> = {
  [DealStage.LEAD]: 'عميل محتمل',
  [DealStage.VIEWING]: 'معاينة',
  [DealStage.NEGOTIATION]: 'تفاوض',
  [DealStage.RESERVATION]: 'حجز',
  [DealStage.CONTRACT_PREPARATION]: 'إعداد العقد',
  [DealStage.CONTRACT_SIGNED]: 'عقد موقّع',
  [DealStage.PAYMENT_ACTIVE]: 'دفعات نشطة',
  [DealStage.HANDOVER_PENDING]: 'في انتظار التسليم',
  [DealStage.CLOSED]: 'مغلق',
  [DealStage.CANCELLED]: 'ملغي',
};

/**
 * أسماء طرق الدفع بالعربية
 */
export const PAYMENT_METHOD_AR: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'نقداً',
  [PaymentMethod.CHECK]: 'شيك',
  [PaymentMethod.BANK_TRANSFER]: 'تحويل بنكي',
  [PaymentMethod.INSTAPAY]: 'Instapay',
  [PaymentMethod.FAWRY]: 'فوري',
  [PaymentMethod.PAYMOB_CARD]: 'بطاقة Paymob',
  [PaymentMethod.PAYMOB_WALLET]: 'محفظة Paymob',
  [PaymentMethod.PAYMOB_BNPL]: 'اشتر الآن ادفع لاحقاً Paymob',
};

// ─────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────

/**
 * DTO لإنشاء صفقة جديدة
 */
export class CreateDealDto {
  @ApiPropertyOptional({ description: 'معرف Lead المرتبط' })
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @ApiProperty({ description: 'معرف العميل' })
  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ description: 'معرف العقار' })
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;

  @ApiPropertyOptional({ description: 'معرف السمسار المسؤول' })
  @IsOptional()
  @IsUUID()
  assignedBrokerId?: string;

  @ApiPropertyOptional({ description: 'معرف السمسار الخارجي (co-broker)' })
  @IsOptional()
  @IsUUID()
  cobrokerUserId?: string;

  @ApiPropertyOptional({ description: 'اسم السمسار الخارجي (إن لم يكن مستخدم)' })
  @IsOptional()
  @IsString()
  externalBroker?: string;

  @ApiProperty({ description: 'نوع الصفقة', enum: DealType })
  @IsEnum(DealType)
  @IsNotEmpty()
  dealType: DealType;

  @ApiPropertyOptional({ description: 'السعر المتفق عليه' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  agreedPrice?: number;

  @ApiPropertyOptional({ description: 'العملة', default: 'EGP' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'معرف الفرع' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لتحديث صفقة
 */
export class UpdateDealDto extends PartialType(CreateDealDto) {
  @ApiPropertyOptional({ description: 'السعر المتفق عليه' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  agreedPrice?: number;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لتغيير مرحلة الصفقة
 */
export class ChangeStageDto {
  @ApiProperty({ description: 'المرحلة الجديدة', enum: DealStage })
  @IsEnum(DealStage)
  @IsNotEmpty()
  stage: DealStage;

  @ApiPropertyOptional({ description: 'سبب التغيير (مطلوب عند الإلغاء)' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO لإنشاء حجز
 */
export class CreateReservationDto {
  @ApiProperty({ description: 'مبلغ العربون' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  depositAmount: number;

  @ApiProperty({ description: 'طريقة دفع العربون', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  depositMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'تاريخ دفع العربون' })
  @IsOptional()
  @IsDateString()
  depositPaidAt?: string;

  @ApiProperty({ description: 'تاريخ انتهاء الحجز' })
  @IsDateString()
  @IsNotEmpty()
  expiresAt: string;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لتحديث حجز
 */
export class UpdateReservationDto {
  @ApiPropertyOptional({ description: 'مبلغ العربون' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({ description: 'طريقة دفع العربون', enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  depositMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'تاريخ انتهاء الحجز' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لتمديد حجز
 */
export class ExtendReservationDto {
  @ApiProperty({ description: 'تاريخ انتهاء الحجز الجديد' })
  @IsDateString()
  @IsNotEmpty()
  newExpiresAt: string;

  @ApiPropertyOptional({ description: 'سبب التمديد' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO لفلترة الصفقات
 */
export class GetDealsDto {
  @ApiPropertyOptional({ description: 'المرحلة', enum: DealStage })
  @IsOptional()
  @IsEnum(DealStage)
  stage?: DealStage;

  @ApiPropertyOptional({ description: 'نوع الصفقة', enum: DealType })
  @IsOptional()
  @IsEnum(DealType)
  dealType?: DealType;

  @ApiPropertyOptional({ description: 'معرف السمسار المسؤول' })
  @IsOptional()
  @IsUUID()
  assignedBrokerId?: string;

  @ApiPropertyOptional({ description: 'معرف العميل' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'معرف العقار' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

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

  @ApiPropertyOptional({ description: 'حقل الترتيب', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'اتجاه الترتيب', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
