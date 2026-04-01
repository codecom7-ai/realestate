// ═══════════════════════════════════════════════════════════════
// Payment Schedules DTO - Data Transfer Objects لجدولة الأقساط
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  IsNotEmpty,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────

/**
 * نوع القسط
 */
export enum InstallmentType {
  DEPOSIT = 'deposit',
  FIRST_PAYMENT = 'first_payment',
  INSTALLMENT = 'installment',
  HANDOVER = 'handover',
  FINAL = 'final',
}

/**
 * حالة القسط
 */
export enum InstallmentStatus {
  PENDING = 'pending',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

/**
 * أسماء أنواع الأقساط بالعربية
 */
export const INSTALLMENT_TYPE_AR: Record<InstallmentType, string> = {
  [InstallmentType.DEPOSIT]: 'عربون',
  [InstallmentType.FIRST_PAYMENT]: 'دفعة أولى',
  [InstallmentType.INSTALLMENT]: 'قسط',
  [InstallmentType.HANDOVER]: 'دفعة تسليم',
  [InstallmentType.FINAL]: 'دفعة نهائية',
};

/**
 * أسماء حالات الأقساط بالعربية
 */
export const INSTALLMENT_STATUS_AR: Record<InstallmentStatus, string> = {
  [InstallmentStatus.PENDING]: 'قيد الانتظار',
  [InstallmentStatus.PARTIALLY_PAID]: 'مدفوع جزئياً',
  [InstallmentStatus.PAID]: 'مدفوع بالكامل',
  [InstallmentStatus.OVERDUE]: 'متأخر',
  [InstallmentStatus.CANCELLED]: 'ملغي',
};

// ─────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────

/**
 * DTO لإنشاء قسط
 */
export class CreateInstallmentDto {
  @ApiProperty({ description: 'رقم القسط' })
  @IsNumber()
  @Min(1)
  installmentNumber: number;

  @ApiProperty({ description: 'نوع القسط', enum: InstallmentType })
  @IsEnum(InstallmentType)
  type: InstallmentType;

  @ApiProperty({ description: 'مبلغ القسط' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'العملة', default: 'EGP' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'تاريخ الاستحقاق' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لإنشاء جدول أقساط
 */
export class CreatePaymentScheduleDto {
  @ApiProperty({ description: 'معرف الصفقة' })
  @IsUUID()
  @IsNotEmpty()
  dealId: string;

  @ApiProperty({ description: 'المبلغ الإجمالي' })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ description: 'العملة', default: 'EGP' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'الأقساط', type: [CreateInstallmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInstallmentDto)
  installments: CreateInstallmentDto[];

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لإضافة قسط لجدول موجود
 */
export class AddInstallmentDto {
  @ApiProperty({ description: 'رقم القسط' })
  @IsNumber()
  @Min(1)
  installmentNumber: number;

  @ApiProperty({ description: 'نوع القسط', enum: InstallmentType })
  @IsEnum(InstallmentType)
  type: InstallmentType;

  @ApiProperty({ description: 'مبلغ القسط' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'العملة', default: 'EGP' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'تاريخ الاستحقاق' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لإعادة حساب جدول الأقساط
 */
export class RecalculateScheduleDto {
  @ApiProperty({ description: 'المبلغ الإجمالي الجديد' })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ description: 'توزيع تلقائي على الأقساط', default: false })
  @IsOptional()
  autoDistribute?: boolean;
}

/**
 * DTO لفلترة الأقساط القادمة/المتأخرة
 */
export class GetInstallmentsDto {
  @ApiPropertyOptional({ description: 'من تاريخ' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'إلى تاريخ' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'رقم الصفحة', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'عدد العناصر في الصفحة', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

/**
 * DTO لتفاصيل القسط مع معلومات الدفع
 */
export class InstallmentWithPaymentsDto {
  @ApiProperty({ description: 'معرف القسط' })
  id: string;

  @ApiProperty({ description: 'رقم القسط' })
  installmentNumber: number;

  @ApiProperty({ description: 'نوع القسط' })
  type: InstallmentType;

  @ApiProperty({ description: 'نوع القسط بالعربية' })
  typeAr: string;

  @ApiProperty({ description: 'المبلغ' })
  amount: number;

  @ApiProperty({ description: 'العملة' })
  currency: string;

  @ApiProperty({ description: 'تاريخ الاستحقاق' })
  dueDate: Date;

  @ApiProperty({ description: 'حالة القسط' })
  status: InstallmentStatus;

  @ApiProperty({ description: 'حالة القسط بالعربية' })
  statusAr: string;

  @ApiProperty({ description: 'المبلغ المدفوع' })
  paidAmount: number;

  @ApiProperty({ description: 'المبلغ المتبقي' })
  remainingAmount: number;

  @ApiProperty({ description: 'هل القسط متأخر' })
  isOverdue: boolean;

  @ApiPropertyOptional({ description: 'عدد أيام التأخير' })
  daysOverdue?: number;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  notes?: string;
}

/**
 * DTO لملخص جدول الأقساط
 */
export class ScheduleSummaryDto {
  @ApiProperty({ description: 'المبلغ الإجمالي' })
  totalAmount: number;

  @ApiProperty({ description: 'إجمالي المدفوع' })
  totalPaid: number;

  @ApiProperty({ description: 'إجمالي المتبقي' })
  totalRemaining: number;

  @ApiProperty({ description: 'نسبة السداد' })
  paidPercentage: number;

  @ApiProperty({ description: 'عدد الأقساط' })
  installmentsCount: number;

  @ApiProperty({ description: 'عدد الأقساط المدفوعة' })
  paidInstallmentsCount: number;

  @ApiProperty({ description: 'عدد الأقساط المتأخرة' })
  overdueInstallmentsCount: number;
}
