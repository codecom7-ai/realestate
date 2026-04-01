// ═══════════════════════════════════════════════════════════════
// Reservations DTO - Data Transfer Objects للحجوزات
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { PaymentMethod } from '@realestate/shared-types';

// ─────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────

/**
 * DTO لإنشاء حجز جديد
 */
export class CreateReservationDto {
  @ApiProperty({ description: 'معرف الصفقة' })
  @IsUUID()
  @IsNotEmpty()
  dealId: string;

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
 * DTO لإلغاء حجز
 */
export class CancelReservationDto {
  @ApiPropertyOptional({ description: 'سبب الإلغاء' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO لفلترة الحجوزات
 */
export class GetReservationsDto {
  @ApiPropertyOptional({ description: 'معرف الصفقة' })
  @IsOptional()
  @IsUUID()
  dealId?: string;

  @ApiPropertyOptional({ description: 'فلترة حسب انتهاء الصلاحية' })
  @IsOptional()
  @IsDateString()
  expiresBefore?: string;

  @ApiPropertyOptional({ description: 'فلترة الحجوزات المنتهية' })
  @IsOptional()
  @IsString()
  status?: 'active' | 'expired' | 'all';

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
