// ═══════════════════════════════════════════════════════════════
// Commissions DTO - Data Transfer Objects للعمولات
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  IsBoolean,
  IsDateString,
  Min,
  IsNotEmpty,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommissionStatus } from '@realestate/shared-types';

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

/**
 * نسبة ضريبة القيمة المضافة في مصر
 */
export const VAT_RATE = 0.14; // 14%

/**
 * أنواع العمولات
 */
export enum CommissionType {
  BROKER = 'broker',
  MANAGER = 'manager',
  COMPANY = 'company',
  EXTERNAL = 'external',
}

/**
 * أسماء أنواع العمولات بالعربية
 */
export const COMMISSION_TYPE_AR: Record<CommissionType, string> = {
  [CommissionType.BROKER]: 'سمسار',
  [CommissionType.MANAGER]: 'مدير مبيعات',
  [CommissionType.COMPANY]: 'الشركة',
  [CommissionType.EXTERNAL]: 'وسيط خارجي',
};

/**
 * أسماء حالات العمولة بالعربية
 */
export const COMMISSION_STATUS_AR: Record<CommissionStatus, string> = {
  [CommissionStatus.CALCULATED]: 'محسوبة',
  [CommissionStatus.APPROVED]: 'معتمدة',
  [CommissionStatus.SETTLED]: 'مستقرة',
  [CommissionStatus.PAID]: 'مدفوعة',
  [CommissionStatus.DISPUTED]: 'متنازع عليها',
};

/**
 * نسب توزيع العمولة الافتراضية
 */
export const DEFAULT_COMMISSION_DISTRIBUTION = {
  [CommissionType.BROKER]: 0.50, // 50% للسمسار
  [CommissionType.MANAGER]: 0.10, // 10% لمدير المبيعات
  [CommissionType.COMPANY]: 0.40, // 40% للشركة
  [CommissionType.EXTERNAL]: 0, // لا نسبة افتراضية للوسيط الخارجي
};

// ─────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────

/**
 * DTO لفلترة العمولات
 */
export class GetCommissionsDto {
  @ApiPropertyOptional({ description: 'حالة العمولة', enum: CommissionStatus })
  @IsOptional()
  @IsEnum(CommissionStatus)
  status?: CommissionStatus;

  @ApiPropertyOptional({ description: 'نوع العمولة', enum: CommissionType })
  @IsOptional()
  @IsEnum(CommissionType)
  commissionType?: CommissionType;

  @ApiPropertyOptional({ description: 'معرف الصفقة' })
  @IsOptional()
  @IsUUID()
  dealId?: string;

  @ApiPropertyOptional({ description: 'معرف المستخدم المستحق' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'هل العمولة مؤمنة (مقفلة)' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isLocked?: boolean;

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

/**
 * DTO لحساب العمولة يدوياً
 */
export class CalculateCommissionDto {
  @ApiProperty({ description: 'معرف الصفقة' })
  @IsUUID()
  @IsNotEmpty()
  dealId: string;

  @ApiProperty({ description: 'نوع العمولة', enum: CommissionType })
  @IsEnum(CommissionType)
  @IsNotEmpty()
  commissionType: CommissionType;

  @ApiPropertyOptional({ description: 'معرف المستخدم المستحق (للسمسار أو المدير)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'المبلغ الأساسي للعمولة' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  baseAmount: number;

  @ApiPropertyOptional({ description: 'نسبة العمولة (إن وجدت)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;

  @ApiPropertyOptional({ description: 'العملة', default: 'EGP' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO للموافقة على عمولة
 */
export class ApproveCommissionDto {
  @ApiPropertyOptional({ description: 'ملاحظات الموافقة' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لتسوية عمولة
 */
export class SettleCommissionDto {
  @ApiPropertyOptional({ description: 'ملاحظات التسوية' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لدفع عمولة
 */
export class PayCommissionDto {
  @ApiPropertyOptional({ description: 'تاريخ الدفع' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ description: 'ملاحظات الدفع' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لتحديث عمولة (قبل القفل فقط)
 */
export class UpdateCommissionDto {
  @ApiPropertyOptional({ description: 'المبلغ الأساسي للعمولة' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseAmount?: number;

  @ApiPropertyOptional({ description: 'نسبة العمولة' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;

  @ApiPropertyOptional({ description: 'المبلغ الصافي للعمولة' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لحساب عمولات صفقة تلقائياً
 */
export class CalculateDealCommissionsDto {
  @ApiProperty({ description: 'معرف الصفقة' })
  @IsUUID()
  @IsNotEmpty()
  dealId: string;

  @ApiPropertyOptional({ description: 'نسبة العمولة الإجمالية (تُحسب من العقار إن لم تُحدد)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'تجاهل العمولات الموجودة وإنشاء جديدة' })
  @IsOptional()
  @IsBoolean()
  forceRecalculate?: boolean;

  @ApiPropertyOptional({ description: 'توزيع مخصص للعمولات' })
  @IsOptional()
  customDistribution?: {
    broker?: number;
    manager?: number;
    company?: number;
    external?: number;
  };
}

/**
 * DTO لتفاصيل العمولة
 */
export class CommissionDto {
  @ApiProperty({ description: 'معرف العمولة' })
  id: string;

  @ApiProperty({ description: 'معرف المنظمة' })
  organizationId: string;

  @ApiProperty({ description: 'معرف الصفقة' })
  dealId: string;

  @ApiPropertyOptional({ description: 'معرف المستخدم المستحق' })
  userId?: string;

  @ApiProperty({ description: 'نوع العمولة', enum: CommissionType })
  commissionType: CommissionType;

  @ApiProperty({ description: 'المبلغ الأساسي' })
  baseAmount: number;

  @ApiPropertyOptional({ description: 'نسبة العمولة' })
  percentage?: number;

  @ApiProperty({ description: 'مبلغ العمولة الصافي' })
  amount: number;

  @ApiProperty({ description: 'مبلغ ضريبة القيمة المضافة (14%)' })
  vatAmount: number;

  @ApiProperty({ description: 'المبلغ الإجمالي شامل الضريبة' })
  totalAmount: number;

  @ApiProperty({ description: 'العملة' })
  currency: string;

  @ApiProperty({ description: 'حالة العمولة', enum: CommissionStatus })
  status: CommissionStatus;

  @ApiProperty({ description: 'هل العمولة مؤمنة (مقفولة)' })
  isLocked: boolean;

  @ApiPropertyOptional({ description: 'تاريخ قفل العمولة' })
  lockedAt?: Date;

  @ApiPropertyOptional({ description: 'معرف المستخدم الذي قفل العمولة' })
  lockedById?: string;

  @ApiPropertyOptional({ description: 'تاريخ التسوية' })
  settledAt?: Date;

  @ApiPropertyOptional({ description: 'تاريخ الدفع' })
  paidAt?: Date;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  notes?: string;

  @ApiProperty({ description: 'تاريخ الإنشاء' })
  createdAt: Date;

  @ApiProperty({ description: 'تاريخ التحديث' })
  updatedAt: Date;
}

/**
 * DTO لعمولة مع تفاصيل إضافية
 */
export class CommissionWithDetailsDto extends CommissionDto {
  @ApiPropertyOptional({ description: 'معلومات الصفقة' })
  deal?: {
    id: string;
    stage: string;
    dealType: string;
    agreedPrice?: number;
    currency: string;
    client?: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
    };
    property?: {
      id: string;
      title: string;
      city: string;
    };
  };

  @ApiPropertyOptional({ description: 'معلومات المستخدم المستحق' })
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    firstNameAr?: string;
    lastNameAr?: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'معلومات المستخدم الذي قفل العمولة' })
  lockedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * DTO لإحصائيات العمولات
 */
export class CommissionStatsDto {
  @ApiProperty({ description: 'إجمالي العمولات' })
  total: number;

  @ApiProperty({ description: 'عمولات حسب الحالة' })
  byStatus: Record<CommissionStatus, number>;

  @ApiProperty({ description: 'عمولات حسب النوع' })
  byType: Record<CommissionType, number>;

  @ApiProperty({ description: 'إجمالي المبالغ المحسوبة' })
  totalCalculated: number;

  @ApiProperty({ description: 'إجمالي المبالغ المعتمدة' })
  totalApproved: number;

  @ApiProperty({ description: 'إجمالي المبالغ المستقرة' })
  totalSettled: number;

  @ApiProperty({ description: 'إجمالي المبالغ المدفوعة' })
  totalPaid: number;

  @ApiProperty({ description: 'إجمالي الضريبة' })
  totalVat: number;

  @ApiProperty({ description: 'إجمالي المبالغ المعلقة (غير مدفوعة)' })
  totalPending: number;
}

/**
 * DTO لملخص عمولات صفقة
 */
export class DealCommissionSummaryDto {
  @ApiProperty({ description: 'معرف الصفقة' })
  dealId: string;

  @ApiProperty({ description: 'قائمة العمولات' })
  commissions: CommissionDto[];

  @ApiProperty({ description: 'إجمالي العمولات' })
  totalAmount: number;

  @ApiProperty({ description: 'إجمالي الضريبة' })
  totalVat: number;

  @ApiProperty({ description: 'إجمالي المبلغ الإجمالي' })
  totalWithVat: number;

  @ApiProperty({ description: 'عدد العمولات' })
  count: number;

  @ApiProperty({ description: 'هل جميع العمولات مقفولة' })
  allLocked: boolean;
}
