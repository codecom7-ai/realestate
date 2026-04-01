// ═══════════════════════════════════════════════════════════════
// ETA DTOs - نظام الفواتير الإلكترونية المصرية
// Professional Receipt v1.2
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  IsEmail,
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

/**
 * نوع المشتري - شخص طبيعي أو اعتباري
 * P = شخص طبيعي (Person)
 * B = شخص اعتباري (Business)
 */
export enum BuyerType {
  P = 'P', // شخص طبيعي
  B = 'B', // شخص اعتباري
}

/**
 * حالة الإيصال في ETA
 */
export enum ETAReceiptStatus {
  PENDING = 'PENDING', // في انتظار الإرسال
  VALID = 'VALID', // مقبول
  INVALID = 'INVALID', // مرفوض
  CANCELLED = 'CANCELLED', // ملغي
  QUEUED_FOR_RETRY = 'QUEUED_FOR_RETRY', // في قائمة إعادة المحاولة
}

/**
 * ترجمة حالات الإيصال للعربية
 */
export const ETA_RECEIPT_STATUS_AR: Record<ETAReceiptStatus, string> = {
  [ETAReceiptStatus.PENDING]: 'في انتظار الإرسال',
  [ETAReceiptStatus.VALID]: 'مقبول',
  [ETAReceiptStatus.INVALID]: 'مرفوض',
  [ETAReceiptStatus.CANCELLED]: 'ملغي',
  [ETAReceiptStatus.QUEUED_FOR_RETRY]: 'في قائمة إعادة المحاولة',
};

/**
 * نوع المشتري بالعربية
 */
export const BUYER_TYPE_AR: Record<BuyerType, string> = {
  [BuyerType.P]: 'شخص طبيعي',
  [BuyerType.B]: 'شخص اعتباري',
};

// ═══════════════════════════════════════════════════════════════
// AUTH DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * استجابة التوكن من ETA
 */
export class ETAAuthResponseDto {
  @ApiProperty({ description: 'JWT Bearer token' })
  @IsString()
  access_token: string;

  @ApiProperty({ description: 'نوع التوكن', example: 'Bearer' })
  @IsString()
  token_type: string;

  @ApiProperty({ description: 'مدة الصلاحية بالثواني', example: 3600 })
  @IsNumber()
  expires_in: number;

  @ApiProperty({ description: 'نطاق الصلاحيات', example: 'InvoicingAPI' })
  @IsString()
  scope: string;
}

/**
 * حالة التوكن
 */
export class ETATokenStatusDto {
  @ApiProperty({ description: 'هل التوكن صالح' })
  @IsBoolean()
  isValid: boolean;

  @ApiPropertyOptional({ description: 'وقت انتهاء الصلاحية' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'الثواني المتبقية' })
  @IsOptional()
  @IsNumber()
  secondsRemaining?: number;

  @ApiProperty({ description: 'حالة التوكن بالعربية' })
  @IsString()
  statusAr: string;
}

// ═══════════════════════════════════════════════════════════════
// RECEIPT ITEM DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * بند الإيصال - Professional Receipt v1.2
 */
export class ReceiptItemDto {
  @ApiProperty({ description: 'رمز البند/الخدمة', example: ' brokerage_services' })
  @IsString()
  @Length(1, 300)
  internalCode: string;

  @ApiProperty({ description: 'وصف البند', example: 'عمولة سمسرة عقارية - بيع شقة' })
  @IsString()
  @Length(1, 500)
  description: string;

  @ApiProperty({ description: 'نوع الضريبة', example: 'VAT' })
  @IsString()
  @Matches(/^(VAT|EXEMPT|NONE)$/)
  taxType: string;

  @ApiProperty({ description: 'نسبة الضريبة', example: 14 })
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate: number;

  @ApiProperty({ description: 'الكمية', example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'سعر الوحدة', example: 50000.0 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: 'الخصم على البند', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiProperty({ description: 'إجمالي البند قبل الضريبة' })
  @IsNumber()
  @Min(0)
  netAmount: number;

  @ApiProperty({ description: 'قيمة الضريبة' })
  @IsNumber()
  @Min(0)
  taxAmount: number;

  @ApiProperty({ description: 'إجمالي البند شامل الضريبة' })
  @IsNumber()
  @Min(0)
  totalAmount: number;
}

/**
 * بند خصم إضافي
 */
export class ExtraReceiptDiscountDto {
  @ApiProperty({ description: 'سبب الخصم', example: 'خصم خاص' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'قيمة الخصم', example: 1000 })
  @IsNumber()
  @Min(0)
  amount: number;
}

// ═══════════════════════════════════════════════════════════════
// PROFESSIONAL RECEIPT DTO (v1.2)
// ═══════════════════════════════════════════════════════════════

/**
 * المُصدِر (المكتب العقاري)
 */
export class ReceiptIssuerDto {
  @ApiProperty({ description: 'الرقم التعريفي للمُصدِر (RIN)', example: '674859545' })
  @IsString()
  @Length(1, 20)
  id: string;

  @ApiProperty({ description: 'اسم المُصدِر', example: 'مكتب الأمل للسمسرة العقارية' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({ description: 'النوع (B = شخص اعتباري)', example: 'B' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'كود الفرع في ETA' })
  @IsOptional()
  @IsString()
  branchId?: string;
}

/**
 * المُستلِم (المشتري/العميل)
 */
export class ReceiptReceiverDto {
  @ApiProperty({ description: 'نوع المستلم', enum: BuyerType })
  @IsEnum(BuyerType)
  type: BuyerType;

  @ApiPropertyOptional({ description: 'الرقم التعريفي (RIN/رقم قومي)', example: '29501011234567' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  id?: string;

  @ApiPropertyOptional({ description: 'اسم المستلم' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @ApiPropertyOptional({ description: 'الرقم القومي (إلزامي عند >= 150,000 EGP و buyerType = P)' })
  @IsOptional()
  @IsString()
  @Length(14, 14)
  nationalId?: string;

  @ApiPropertyOptional({ description: 'العنوان' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  address?: string;

  @ApiPropertyOptional({ description: 'البريد الإلكتروني' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'رقم الهاتف' })
  @IsOptional()
  @IsString()
  phone?: string;
}

/**
 * Professional Receipt v1.2 - الإيصال الاحترافي
 */
export class ProfessionalReceiptDto {
  @ApiProperty({ description: 'UUID الإيصال (SHA256 hex - 64 حرف)' })
  @IsString()
  @Length(64, 64)
  uuid: string;

  @ApiProperty({ description: 'نوع الوثيقة', example: 'R' })
  @IsString()
  documentType: string;

  @ApiProperty({ description: 'إصدار الوثيقة', example: '1.2' })
  @IsString()
  documentTypeVersion: string;

  @ApiPropertyOptional({ description: 'UUID الإيصال السابق من نفس الـ POS' })
  @IsOptional()
  @IsString()
  @Length(64, 64)
  previousUUID?: string;

  @ApiPropertyOptional({ description: 'UUID الإيصال الأصلي (للتصحيح)' })
  @IsOptional()
  @IsString()
  @Length(64, 64)
  referenceOldUUID?: string;

  @ApiProperty({ description: 'الرقم الداخلي للإيصال' })
  @IsString()
  @Length(1, 50)
  internalId: string;

  @ApiProperty({ description: 'تاريخ ووقت الإصدار (ISO 8601 UTC)' })
  @IsDateString()
  issuanceDateTime: string;

  @ApiProperty({ description: 'المُصدِر' })
  @ValidateNested()
  @Type(() => ReceiptIssuerDto)
  issuer: ReceiptIssuerDto;

  @ApiProperty({ description: 'المُستلِم' })
  @ValidateNested()
  @Type(() => ReceiptReceiverDto)
  receiver: ReceiptReceiverDto;

  @ApiProperty({ description: 'قائمة البنود', type: [ReceiptItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptItemDto)
  items: ReceiptItemDto[];

  @ApiPropertyOptional({ description: 'الخصومات الإضافية', type: [ExtraReceiptDiscountDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraReceiptDiscountDto)
  extraReceiptDiscounts?: ExtraReceiptDiscountDto[];

  @ApiProperty({ description: 'إجمالي الخصومات' })
  @IsNumber()
  @Min(0)
  totalDiscountAmount: number;

  @ApiProperty({ description: 'إجمالي المبلغ قبل الضريبة' })
  @IsNumber()
  @Min(0)
  totalNetAmount: number;

  @ApiProperty({ description: 'إجمالي الضريبة' })
  @IsNumber()
  @Min(0)
  totalTaxAmount: number;

  @ApiProperty({ description: 'إجمالي المبلغ شامل الضريبة' })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ description: 'نسبة الخصم الإضافي' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  extraDiscountPercentage?: number;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  remarks?: string;
}

// ═══════════════════════════════════════════════════════════════
// SUBMISSION DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * التوقيع الرقمي
 */
export class ReceiptSignatureDto {
  @ApiProperty({ description: 'نوع المُوقِّع (I = Issuer)', example: 'I' })
  @IsString()
  signatureType: string;

  @ApiProperty({ description: 'التوقيع الرقمي CAdES-BES بترميز Base64' })
  @IsString()
  value: string;
}

/**
 * طلب إرسال الإيصالات
 */
export class ReceiptSubmissionDto {
  @ApiProperty({ description: 'قائمة الإيصالات', type: [ProfessionalReceiptDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfessionalReceiptDto)
  receipts: ProfessionalReceiptDto[];

  @ApiProperty({ description: 'قائمة التوقيعات', type: [ReceiptSignatureDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptSignatureDto)
  signatures: ReceiptSignatureDto[];
}

/**
 * مستند مقبول
 */
export class AcceptedDocumentDto {
  @ApiProperty({ description: 'UUID الإيصال' })
  @IsString()
  uuid: string;

  @ApiProperty({ description: 'Long ID من ETA' })
  @IsString()
  longId: string;

  @ApiProperty({ description: 'الرقم الداخلي' })
  @IsString()
  receiptNumber: string;
}

/**
 * خطأ في مستند
 */
export class RejectedDocumentErrorDto {
  @ApiProperty({ description: 'رسالة الخطأ' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'الهدف' })
  @IsOptional()
  @IsString()
  target?: string;

  @ApiPropertyOptional({ description: 'مسار الحقل' })
  @IsOptional()
  @IsString()
  propertyPath?: string;

  @ApiPropertyOptional({ description: 'تفاصيل إضافية', type: [Object] })
  @IsOptional()
  @IsArray()
  details?: any[];
}

/**
 * مستند مرفوض
 */
export class RejectedDocumentDto {
  @ApiProperty({ description: 'الرقم الداخلي' })
  @IsString()
  receiptNumber: string;

  @ApiProperty({ description: 'UUID الإيصال' })
  @IsString()
  uuid: string;

  @ApiProperty({ description: 'تفاصيل الخطأ' })
  @ValidateNested()
  @Type(() => RejectedDocumentErrorDto)
  error: RejectedDocumentErrorDto;
}

/**
 * استجابة إرسال الإيصالات (202 Accepted)
 */
export class SubmissionResponseDto {
  @ApiProperty({ description: 'معرف الطلب' })
  @IsString()
  submissionUUID: string;

  @ApiProperty({ description: 'المستندات المقبولة', type: [AcceptedDocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AcceptedDocumentDto)
  acceptedDocuments: AcceptedDocumentDto[];

  @ApiProperty({ description: 'المستندات المرفوضة', type: [RejectedDocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RejectedDocumentDto)
  rejectedDocuments: RejectedDocumentDto[];
}

// ═══════════════════════════════════════════════════════════════
// INTERNAL DTOs (للاستخدام داخل النظام)
// ═══════════════════════════════════════════════════════════════

/**
 * طلب إنشاء إيصال جديد
 */
export class CreateETAReceiptDto {
  @ApiProperty({ description: 'معرف الدفعة' })
  @IsString()
  paymentId: string;

  @ApiProperty({ description: 'معرف جهاز POS' })
  @IsString()
  posDeviceId: string;

  @ApiProperty({ description: 'وصف الخدمة', example: 'عمولة سمسرة عقارية - بيع شقة' })
  @IsString()
  @Length(1, 500)
  serviceDescription: string;

  @ApiProperty({ description: 'المبلغ الأساسي (قبل الضريبة)' })
  @IsNumber()
  @Min(0.01)
  netAmount: number;

  @ApiPropertyOptional({ description: 'نسبة الضريبة', example: 14 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  @IsOptional()
  @IsString()
  remarks?: string;
}

/**
 * استجابة إنشاء إيصال
 */
export class ETAReceiptResponseDto {
  @ApiProperty({ description: 'معرف الإيصال' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'UUID الإيصال' })
  @IsString()
  documentUUID: string;

  @ApiProperty({ description: 'حالة الإيصال', enum: ETAReceiptStatus })
  @IsEnum(ETAReceiptStatus)
  status: ETAReceiptStatus;

  @ApiPropertyOptional({ description: 'submission UUID من ETA' })
  @IsOptional()
  @IsString()
  submissionUUID?: string;

  @ApiPropertyOptional({ description: 'Long ID من ETA' })
  @IsOptional()
  @IsString()
  longId?: string;

  @ApiPropertyOptional({ description: 'الرقم الداخلي' })
  @IsOptional()
  @IsString()
  internalId?: string;

  @ApiPropertyOptional({ description: 'بيانات QR Code' })
  @IsOptional()
  @IsString()
  qrCodeData?: string;

  @ApiPropertyOptional({ description: 'رسالة الخطأ' })
  @IsOptional()
  @IsString()
  lastError?: string;

  @ApiProperty({ description: 'تاريخ الإنشاء' })
  @IsDateString()
  createdAt: string;
}

/**
 * فلاتر البحث عن الإيصالات
 */
export class GetETAReceiptsDto {
  @ApiPropertyOptional({ description: 'صفحة', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'عدد العناصر في الصفحة', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'تصفية حسب الحالة', enum: ETAReceiptStatus })
  @IsOptional()
  @IsEnum(ETAReceiptStatus)
  status?: ETAReceiptStatus;

  @ApiPropertyOptional({ description: 'تاريخ البداية' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'تاريخ النهاية' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'معرف جهاز POS' })
  @IsOptional()
  @IsString()
  posDeviceId?: string;
}

/**
 * إحصائيات الإيصالات
 */
export class ETAReceiptStatsDto {
  @ApiProperty({ description: 'إجمالي الإيصالات' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'إيصالات مقبولة' })
  @IsNumber()
  valid: number;

  @ApiProperty({ description: 'إيصالات مرفوضة' })
  @IsNumber()
  invalid: number;

  @ApiProperty({ description: 'إيصالات في الانتظار' })
  @IsNumber()
  pending: number;

  @ApiProperty({ description: 'إيصالات في قائمة إعادة المحاولة' })
  @IsNumber()
  queuedForRetry: number;

  @ApiProperty({ description: 'إجمالي المبالغ' })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({ description: 'إجمالي الضرائب' })
  @IsNumber()
  totalTaxAmount: number;
}

/**
 * طلب إعادة المحاولة
 */
export class RetryReceiptDto {
  @ApiPropertyOptional({ description: 'تغيير جهاز POS' })
  @IsOptional()
  @IsString()
  posDeviceId?: string;

  @ApiPropertyOptional({ description: 'ملاحظات جديدة' })
  @IsOptional()
  @IsString()
  remarks?: string;
}
