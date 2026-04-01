// ═══════════════════════════════════════════════════════════════
// Documents DTO - نظام تشغيل المكتب العقاري المصري
// Phase 5.01 — Document Vault + OCR
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsInt,
  IsBoolean,
  Min,
  Max,
  IsIn,
} from 'class-validator';

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

/**
 * أنواع الكيانات للربط بالمستندات (لأغراض الرفع)
 */
export enum EntityType {
  CLIENT = 'client',
  USER = 'user',
  PROPERTY = 'property',
  DEAL = 'deal',
  CONTRACT = 'contract',
  ORGANIZATION = 'organization',
}

/**
 * أنواع المستندات المدعومة
 */
export enum DocumentType {
  NATIONAL_ID = 'national_id',
  PASSPORT = 'passport',
  DRIVER_LICENSE = 'driver_license',
  BROKER_LICENSE = 'broker_license',
  COMMERCIAL_REG = 'commercial_reg',
  TAX_ID = 'tax_id',
  CONTRACT = 'contract',
  RESERVATION = 'reservation',
  PROPERTY_DEED = 'property_deed',
  POWER_OF_ATTORNEY = 'power_of_attorney',
  BANK_STATEMENT = 'bank_statement',
  UTILITY_BILL = 'utility_bill',
  OTHER = 'other',
}

/**
 * حالة المستند - استخدام القيم من Prisma
 */
export const DocumentStatus = {
  PENDING_REVIEW: 'PENDING_REVIEW',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;

export type DocumentStatus = typeof DocumentStatus[keyof typeof DocumentStatus];

/**
 * حالة OCR
 */
export const OCRStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type OCRStatus = typeof OCRStatus[keyof typeof OCRStatus];

/**
 * الترجمة العربية لأنواع الكيانات
 */
export const ENTITY_TYPE_AR: Record<EntityType, string> = {
  [EntityType.CLIENT]: 'عميل',
  [EntityType.USER]: 'مستخدم',
  [EntityType.PROPERTY]: 'عقار',
  [EntityType.DEAL]: 'صفقة',
  [EntityType.CONTRACT]: 'عقد',
  [EntityType.ORGANIZATION]: 'منظمة',
};

/**
 * الترجمة العربية لأنواع المستندات
 */
export const DOCUMENT_TYPE_AR: Record<DocumentType, string> = {
  [DocumentType.NATIONAL_ID]: 'بطاقة الرقم القومي',
  [DocumentType.PASSPORT]: 'جواز السفر',
  [DocumentType.DRIVER_LICENSE]: 'رخصة القيادة',
  [DocumentType.BROKER_LICENSE]: 'رخصة السمسرة',
  [DocumentType.COMMERCIAL_REG]: 'السجل التجاري',
  [DocumentType.TAX_ID]: 'البطاقة الضريبية',
  [DocumentType.CONTRACT]: 'عقد',
  [DocumentType.RESERVATION]: 'محضر حجز',
  [DocumentType.PROPERTY_DEED]: 'عقد ملكية العقار',
  [DocumentType.POWER_OF_ATTORNEY]: 'توكيل',
  [DocumentType.BANK_STATEMENT]: 'كشف حساب بنكي',
  [DocumentType.UTILITY_BILL]: 'فاتورة مرافق',
  [DocumentType.OTHER]: 'أخرى',
};

/**
 * الترجمة العربية لحالات المستند
 */
export const DOCUMENT_STATUS_AR: Record<DocumentStatus, string> = {
  [DocumentStatus.PENDING_REVIEW]: 'في انتظار المراجعة',
  [DocumentStatus.VERIFIED]: 'معتمد',
  [DocumentStatus.REJECTED]: 'مرفوض',
  [DocumentStatus.EXPIRED]: 'منتهي الصلاحية',
};

/**
 * الترجمة العربية لحالات OCR
 */
export const OCR_STATUS_AR: Record<OCRStatus, string> = {
  [OCRStatus.PENDING]: 'في الانتظار',
  [OCRStatus.PROCESSING]: 'جاري المعالجة',
  [OCRStatus.COMPLETED]: 'مكتمل',
  [OCRStatus.FAILED]: 'فشل',
};

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * DTO لرفع مستند جديد
 */
export class CreateDocumentDto {
  @ApiProperty({
    description: 'نوع الكيان المرتبط (client, user, property, deal, contract, organization)',
    enum: EntityType,
    example: EntityType.CLIENT,
  })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({
    description: 'معرف الكيان المرتبط',
    example: 'uuid-of-entity',
  })
  @IsUUID()
  entityId: string;

  @ApiProperty({
    description: 'نوع المستند',
    enum: DocumentType,
    example: DocumentType.NATIONAL_ID,
  })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({
    description: 'عنوان المستند',
    example: 'بطاقة الرقم القومي - أحمد محمد',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'رابط الملف (من R2)',
    example: 'https://cdn.example.com/docs/file.pdf',
  })
  @IsString()
  fileUrl: string;

  @ApiProperty({
    description: 'مفتاح الملف في R2',
    example: 'docs/org-123/client-456/national-id.pdf',
  })
  @IsString()
  fileKey: string;

  @ApiProperty({
    description: 'نوع MIME للملف',
    example: 'application/pdf',
  })
  @IsString()
  mimeType: string;

  @ApiProperty({
    description: 'حجم الملف بالبايت',
    example: 1024000,
  })
  @IsInt()
  @Min(1)
  sizeBytes: number;

  @ApiPropertyOptional({
    description: 'تاريخ انتهاء صلاحية المستند',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'ملاحظات على المستند',
    example: 'صورة واضحة من الأمام والخلف',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لتحديث مستند
 */
export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @ApiPropertyOptional({
    description: 'حالة المستند',
    enum: DocumentStatus,
    example: DocumentStatus.VERIFIED,
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({
    description: 'ملاحظات المراجعة',
    example: 'تم التحقق من صحة البيانات',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لفلترة المستندات
 */
export class GetDocumentsDto {
  @ApiPropertyOptional({
    description: 'رقم الصفحة',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'عدد العناصر في الصفحة',
    default: 20,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'نوع الكيان',
    enum: EntityType,
    example: EntityType.CLIENT,
  })
  @IsOptional()
  @IsEnum(EntityType)
  entityType?: EntityType;

  @ApiPropertyOptional({
    description: 'معرف الكيان',
    example: 'uuid-of-entity',
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'نوع المستند',
    enum: DocumentType,
    example: DocumentType.NATIONAL_ID,
  })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiPropertyOptional({
    description: 'حالة المستند',
    enum: DocumentStatus,
    example: DocumentStatus.VERIFIED,
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({
    description: 'حالة OCR',
    enum: OCRStatus,
    example: OCRStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(OCRStatus)
  ocrStatus?: OCRStatus;

  @ApiPropertyOptional({
    description: 'بحث في العنوان',
    example: 'بطاقة',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'المستندات المنتهية خلال X يوم',
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  expiringWithinDays?: number;

  @ApiPropertyOptional({
    description: 'تاريخ البدء',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'تاريخ الانتهاء',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * DTO لتصنيف مستند
 */
export class ClassifyDocumentDto {
  @ApiProperty({
    description: 'نوع المستند المصنف',
    enum: DocumentType,
    example: DocumentType.NATIONAL_ID,
  })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiPropertyOptional({
    description: 'ملاحظات التصنيف',
    example: 'تم التعرف على بطاقة الرقم القومي المصرية',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO للمستندات المنتهية
 */
export class ExpiringDocumentsDto {
  @ApiPropertyOptional({
    description: 'عدد الأيام للفحص',
    default: 30,
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  days?: number = 30;
}

/**
 * DTO لاستجابة المستند
 */
export class DocumentResponseDto {
  @ApiProperty({ description: 'معرف المستند' })
  id: string;

  @ApiProperty({ description: 'معرف المنظمة' })
  organizationId: string;

  @ApiProperty({ description: 'نوع الكيان', enum: EntityType })
  entityType: EntityType;

  @ApiProperty({ description: 'معرف الكيان' })
  entityId: string;

  @ApiProperty({ description: 'نوع المستند', enum: DocumentType })
  documentType: DocumentType;

  @ApiProperty({ description: 'عنوان المستند' })
  title: string;

  @ApiProperty({ description: 'رابط الملف' })
  fileUrl: string;

  @ApiProperty({ description: 'نوع MIME' })
  mimeType: string;

  @ApiProperty({ description: 'حجم الملف بالبايت' })
  sizeBytes: number;

  @ApiProperty({ description: 'حالة المستند', enum: DocumentStatus })
  status: DocumentStatus;

  @ApiPropertyOptional({ description: 'حالة OCR', enum: OCRStatus })
  ocrStatus?: OCRStatus;

  @ApiPropertyOptional({ description: 'بيانات OCR (JSON)' })
  ocrData?: any;

  @ApiPropertyOptional({ description: 'تاريخ انتهاء الصلاحية' })
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'معرف الرافع' })
  uploadedById?: string;

  @ApiPropertyOptional({ description: 'معرف المحقق' })
  verifiedById?: string;

  @ApiPropertyOptional({ description: 'تاريخ التحقق' })
  verifiedAt?: Date;

  @ApiPropertyOptional({ description: 'ملاحظات' })
  notes?: string;

  @ApiProperty({ description: 'تاريخ الإنشاء' })
  createdAt: Date;

  @ApiProperty({ description: 'تاريخ التحديث' })
  updatedAt: Date;

  // Translations
  @ApiPropertyOptional({ description: 'اسم الكيان بالعربية' })
  entityNameAr?: string;

  @ApiProperty({ description: 'نوع المستند بالعربية' })
  documentTypeAr: string;

  @ApiProperty({ description: 'حالة المستند بالعربية' })
  statusAr: string;

  @ApiPropertyOptional({ description: 'حالة OCR بالعربية' })
  ocrStatusAr?: string;
}

/**
 * DTO لنتيجة OCR
 */
export class OCRResultDto {
  @ApiProperty({ description: 'معرف المستند' })
  documentId: string;

  @ApiProperty({ description: 'حالة OCR', enum: OCRStatus })
  status: OCRStatus;

  @ApiPropertyOptional({ description: 'النص المستخرج' })
  extractedText?: string;

  @ApiPropertyOptional({ description: 'البيانات المهيكلة' })
  structuredData?: {
    nationalId?: string;
    fullName?: string;
    fullNameAr?: string;
    birthDate?: string;
    address?: string;
    issueDate?: string;
    expiryDate?: string;
    gender?: string;
    jobTitle?: string;
    // For broker license
    licenseNumber?: string;
    classification?: string;
    // For commercial registration
    regNumber?: string;
    companyName?: string;
    companyType?: string;
  };

  @ApiPropertyOptional({ description: 'نوع المستند المقترح', enum: DocumentType })
  suggestedDocumentType?: DocumentType;

  @ApiPropertyOptional({ description: 'درجة الثقة (0-1)' })
  confidence?: number;

  @ApiPropertyOptional({ description: 'رسالة الخطأ' })
  errorMessage?: string;

  @ApiProperty({ description: 'وقت المعالجة' })
  processedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// Upload URL DTOs (API Contracts Module 9)
// ═══════════════════════════════════════════════════════════════

/**
 * DTO لطلب رابط رفع موقّع
 */
export class GetUploadUrlDto {
  @ApiProperty({
    description: 'نوع الكيان المرتبط (client, user, property, deal, contract, organization)',
    enum: EntityType,
    example: EntityType.CLIENT,
  })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({
    description: 'معرف الكيان المرتبط',
    example: 'uuid-of-entity',
  })
  @IsUUID()
  entityId: string;

  @ApiProperty({
    description: 'نوع المستند',
    enum: DocumentType,
    example: DocumentType.NATIONAL_ID,
  })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({
    description: 'عنوان المستند',
    example: 'بطاقة الرقم القومي - أحمد محمد',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'نوع MIME للملف',
    example: 'application/pdf',
  })
  @IsString()
  mimeType: string;

  @ApiProperty({
    description: 'حجم الملف بالبايت',
    example: 1024000,
  })
  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024) // 20 MB max
  sizeBytes: number;
}

/**
 * DTO لتأكيد الرفع
 */
export class ConfirmUploadDto {
  @ApiProperty({
    description: 'معرف المستند (من استجابة upload-url)',
    example: 'uuid-of-document',
  })
  @IsUUID()
  documentId: string;
}

/**
 * استجابة رابط الرفع الموقّع
 */
export class UploadUrlResponseDto {
  @ApiProperty({ description: 'رابط الرفع الموقّع (صالح لمدة ساعة)' })
  uploadUrl: string;

  @ApiProperty({ description: 'مفتاح الملف في R2' })
  fileKey: string;

  @ApiProperty({ description: 'معرف المستند (للاستخدام في تأكيد الرفع)' })
  documentId: string;
}
