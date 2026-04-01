// ═══════════════════════════════════════════════════════════════
// Payments DTO - Data Transfer Objects للمدفوعات
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
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
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@realestate/shared-types';

// ─────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────

/**
 * حالة الدفع
 */
export enum PaymentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

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
 * نوع بوابة الدفع
 */
export enum PaymentGateway {
  PAYMOB = 'paymob',
  FAWRY = 'fawry',
}

/**
 * أسماء حالات الدفع بالعربية
 */
export const PAYMENT_STATUS_AR: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'قيد الانتظار',
  [PaymentStatus.CONFIRMED]: 'مؤكد',
  [PaymentStatus.FAILED]: 'فشل',
  [PaymentStatus.REFUNDED]: 'مسترد بالكامل',
  [PaymentStatus.PARTIALLY_REFUNDED]: 'مسترد جزئياً',
};

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

/**
 * أسماء بوابات الدفع بالعربية
 */
export const PAYMENT_GATEWAY_AR: Record<PaymentGateway, string> = {
  [PaymentGateway.PAYMOB]: 'باي موب',
  [PaymentGateway.FAWRY]: 'فوري',
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
 * DTO لتسجيل دفعة
 */
export class CreatePaymentDto {
  @ApiPropertyOptional({ description: 'معرف القسط' })
  @IsOptional()
  @IsUUID()
  installmentId?: string;

  @ApiPropertyOptional({ description: 'معرف الصفقة (للدفعات خارج الجدول)' })
  @IsOptional()
  @IsUUID()
  dealId?: string;

  @ApiProperty({ description: 'المبلغ' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'العملة', default: 'EGP' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'طريقة الدفع', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ description: 'رقم الشيك (للشيكات)' })
  @IsOptional()
  @IsString()
  checkNumber?: string;

  @ApiPropertyOptional({ description: 'اسم البنك' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'مرجع المعاملة' })
  @IsOptional()
  @IsString()
  transactionRef?: string;

  @ApiPropertyOptional({ description: 'تاريخ الدفع' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'مفتاح Idempotency لمنع التكرار' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

/**
 * DTO لتحديث دفعة
 */
export class UpdatePaymentDto {
  @ApiPropertyOptional({ description: 'حالة الدفع', enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'مرجع البوابة' })
  @IsOptional()
  @IsString()
  gatewayRef?: string;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لاسترداد دفعة
 */
export class RefundPaymentDto {
  @ApiProperty({ description: 'مبلغ الاسترداد' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'سبب الاسترداد' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لفلترة المدفوعات
 */
export class GetPaymentsDto {
  @ApiPropertyOptional({ description: 'معرف الصفقة' })
  @IsOptional()
  @IsUUID()
  dealId?: string;

  @ApiPropertyOptional({ description: 'معرف القسط' })
  @IsOptional()
  @IsUUID()
  installmentId?: string;

  @ApiPropertyOptional({ description: 'حالة الدفع', enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'طريقة الدفع', enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

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
 * DTO لفلترة إحصائيات التحصيل
 */
export class PaymentStatsDto {
  @ApiPropertyOptional({ description: 'من تاريخ' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'إلى تاريخ' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'معرف الصفقة' })
  @IsOptional()
  @IsUUID()
  dealId?: string;
}

/**
 * DTO للمطابقة البنكية
 */
export class ReconcilePaymentsDto {
  @ApiProperty({ description: 'قائمة المدفوعات للمطابقة', type: 'array' })
  @IsArray()
  payments: {
    paymentId: string;
    transactionRef: string;
    amount: number;
    paidAt: string;
    bankName?: string;
  }[];
}

/**
 * DTO لاستجابة Webhook Paymob
 */
export class PaymobWebhookDto {
  @ApiProperty({ description: 'بيانات Webhook Paymob' })
  obj: {
    id: number;
    amount_cents: number;
    currency: string;
    success: boolean;
    pending: boolean;
    is_refund: boolean;
    is_void: boolean;
    error_occured: boolean;
    order: {
      id: number;
      merchant_order_id: string;
    };
    source_data: {
      type: string;
      sub_type: string;
      pan: string;
    };
    data: {
      txn_response_code: string;
      acq_response_code: string;
    };
    hmac: string;
    created_at: string;
  };
}

/**
 * DTO لاستجابة Webhook Fawry
 */
export class FawryWebhookDto {
  @ApiProperty({ description: 'بيانات Webhook Fawry' })
  referenceNumber: string;
  merchantRefNumber: string;
  paymentAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  fawryFees: number;
  customerEmail?: string;
  customerMobile?: string;
  signature: string;
  orderExpiryDate?: string;
  orderStatus?: string;
}

/**
 * DTO لتفاصيل دفعة
 */
export class PaymentDetailsDto {
  @ApiProperty({ description: 'معرف الدفعة' })
  id: string;

  @ApiProperty({ description: 'المبلغ' })
  amount: number;

  @ApiProperty({ description: 'العملة' })
  currency: string;

  @ApiProperty({ description: 'طريقة الدفع' })
  method: PaymentMethod;

  @ApiProperty({ description: 'طريقة الدفع بالعربية' })
  methodAr: string;

  @ApiProperty({ description: 'حالة الدفع' })
  status: PaymentStatus;

  @ApiProperty({ description: 'حالة الدفع بالعربية' })
  statusAr: string;

  @ApiPropertyOptional({ description: 'رقم الشيك' })
  checkNumber?: string;

  @ApiPropertyOptional({ description: 'اسم البنك' })
  bankName?: string;

  @ApiPropertyOptional({ description: 'مرجع المعاملة' })
  transactionRef?: string;

  @ApiPropertyOptional({ description: 'مرجع البوابة' })
  gatewayRef?: string;

  @ApiPropertyOptional({ description: 'تاريخ الدفع' })
  paidAt?: Date;

  @ApiPropertyOptional({ description: 'المبلغ المسترد' })
  refundedAmount?: number;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  notes?: string;

  @ApiProperty({ description: 'تاريخ الإنشاء' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'القسط المرتبط' })
  installment?: {
    id: string;
    installmentNumber: number;
    type: string;
    typeAr: string;
  };

  @ApiPropertyOptional({ description: 'الصفقة المرتبطة' })
  deal?: {
    id: string;
    dealType: string;
    agreedPrice?: number;
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

  @ApiPropertyOptional({ description: 'إيصال ETA' })
  etaReceipt?: {
    id: string;
    status: string;
    longId?: string;
    qrCodeData?: string;
  };
}

/**
 * DTO لإحصائيات التحصيل
 */
export class CollectionStatsDto {
  @ApiProperty({ description: 'إجمالي المبلغ المطلوب' })
  totalDue: number;

  @ApiProperty({ description: 'إجمالي المبلغ المحصل' })
  totalCollected: number;

  @ApiProperty({ description: 'إجمالي المبلغ المتبقي' })
  totalRemaining: number;

  @ApiProperty({ description: 'نسبة التحصيل' })
  collectionRate: number;

  @ApiProperty({ description: 'عدد الدفعات المؤكدة' })
  confirmedPaymentsCount: number;

  @ApiProperty({ description: 'عدد الدفعات المعلقة' })
  pendingPaymentsCount: number;

  @ApiProperty({ description: 'عدد الدفعات المستردة' })
  refundedPaymentsCount: number;

  @ApiProperty({ description: 'الدفعات حسب الطريقة' })
  paymentsByMethod: {
    method: PaymentMethod;
    methodAr: string;
    count: number;
    amount: number;
  }[];

  @ApiProperty({ description: 'الدفعات حسب الحالة' })
  paymentsByStatus: {
    status: PaymentStatus;
    statusAr: string;
    count: number;
    amount: number;
  }[];

  @ApiPropertyOptional({ description: 'الأقساط المتأخرة' })
  overdueStats?: {
    count: number;
    totalAmount: number;
    oldestDays: number;
  };
}
