// ═══════════════════════════════════════════════════════════════
// Compliance DTO - نظام تشغيل المكتب العقاري المصري
// Phase 5.02 — Compliance Center (578/2025)
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

// ═══════════════════════════════════════════════════════════════
// ENUMS - قانون 578/2025
// ═══════════════════════════════════════════════════════════════

/**
 * تصنيف السمسرة حسب قانون 578/2025
 * - الممتاز (A): رأس مال لا يقل عن مليون جنيه
 * - الأول (B): رأس مال لا يقل عن 500 ألف جنيه
 * - الثاني (C): رأس مال لا يقل عن 250 ألف جنيه
 */
export enum BrokerClassification {
  CLASS_A = 'A', // ممتاز - Premium
  CLASS_B = 'B', // أول - First
  CLASS_C = 'C', // ثاني - Second
}

/**
 * الترجمة العربية لتصنيفات السمسرة
 */
export const BROKER_CLASSIFICATION_AR: Record<BrokerClassification, string> = {
  [BrokerClassification.CLASS_A]: 'ممتاز (أ)',
  [BrokerClassification.CLASS_B]: 'أول (ب)',
  [BrokerClassification.CLASS_C]: 'ثاني (ج)',
};

/**
 * أنواع سجلات الامتثال
 */
export enum ComplianceRecordType {
  BROKER_LICENSE = 'broker_license',
  COMMERCIAL_REG = 'commercial_reg',
  TAX_REGISTRATION = 'tax_registration',
  ACTIVITY_LICENSE = 'activity_license',
  CHAMBER_MEMBERSHIP = 'chamber_membership',
  PROFESSIONAL_INDEMNITY = 'professional_indemnity',
  ANNUAL_RENEWAL = 'annual_renewal',
  TRAINING_CERT = 'training_cert',
  OTHER = 'other',
}

/**
 * الترجمة العربية لأنواع السجلات
 */
export const COMPLIANCE_RECORD_TYPE_AR: Record<ComplianceRecordType, string> = {
  [ComplianceRecordType.BROKER_LICENSE]: 'رخصة السمسرة',
  [ComplianceRecordType.COMMERCIAL_REG]: 'السجل التجاري',
  [ComplianceRecordType.TAX_REGISTRATION]: 'التسجيل الضريبي',
  [ComplianceRecordType.ACTIVITY_LICENSE]: 'ترخيص النشاط',
  [ComplianceRecordType.CHAMBER_MEMBERSHIP]: 'عضوية الغرفة التجارية',
  [ComplianceRecordType.PROFESSIONAL_INDEMNITY]: 'التأمين ضد المسؤولية المهنية',
  [ComplianceRecordType.ANNUAL_RENEWAL]: 'التجديد السنوي',
  [ComplianceRecordType.TRAINING_CERT]: 'شهادة التدريب',
  [ComplianceRecordType.OTHER]: 'أخرى',
};

/**
 * حالة سجل الامتثال
 */
export enum ComplianceRecordStatus {
  VALID = 'valid',
  EXPIRING_SOON = 'expiring_soon',
  EXPIRED = 'expired',
  PENDING_RENEWAL = 'pending_renewal',
  SUSPENDED = 'suspended',
}

/**
 * الترجمة العربية لحالات السجل
 */
export const COMPLIANCE_RECORD_STATUS_AR: Record<ComplianceRecordStatus, string> = {
  [ComplianceRecordStatus.VALID]: 'ساري',
  [ComplianceRecordStatus.EXPIRING_SOON]: 'قريب الانتهاء',
  [ComplianceRecordStatus.EXPIRED]: 'منتهي',
  [ComplianceRecordStatus.PENDING_RENEWAL]: 'في انتظار التجديد',
  [ComplianceRecordStatus.SUSPENDED]: 'موقوف',
};

/**
 * نوع التنبيه
 */
export enum AlertType {
  EXPIRING_90_DAYS = 'expiring_90_days',
  EXPIRING_30_DAYS = 'expiring_30_days',
  EXPIRING_7_DAYS = 'expiring_7_days',
  EXPIRED = 'expired',
  MISSING_DOCUMENT = 'missing_document',
  VERIFICATION_REQUIRED = 'verification_required',
}

/**
 * الترجمة العربية لأنواع التنبيهات
 */
export const ALERT_TYPE_AR: Record<AlertType, string> = {
  [AlertType.EXPIRING_90_DAYS]: 'ينتهي خلال 90 يوم',
  [AlertType.EXPIRING_30_DAYS]: 'ينتهي خلال 30 يوم',
  [AlertType.EXPIRING_7_DAYS]: 'ينتهي خلال 7 أيام',
  [AlertType.EXPIRED]: 'منتهي الصلاحية',
  [AlertType.MISSING_DOCUMENT]: 'مستند مفقود',
  [AlertType.VERIFICATION_REQUIRED]: 'يتطلب تحقق',
};

/**
 * أنواع الكيانات للامتثال
 */
export enum ComplianceEntityType {
  ORGANIZATION = 'organization',
  USER = 'user',
  BRANCH = 'branch',
}

/**
 * الترجمة العربية لأنواع الكيانات
 */
export const COMPLIANCE_ENTITY_TYPE_AR: Record<ComplianceEntityType, string> = {
  [ComplianceEntityType.ORGANIZATION]: 'المنظمة',
  [ComplianceEntityType.USER]: 'مستخدم',
  [ComplianceEntityType.BRANCH]: 'فرع',
};

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * DTO لإنشاء سجل امتثال
 */
export class CreateComplianceRecordDto {
  @ApiProperty({
    description: 'نوع الكيان',
    enum: ComplianceEntityType,
    example: ComplianceEntityType.USER,
  })
  @IsEnum(ComplianceEntityType)
  entityType: ComplianceEntityType;

  @ApiProperty({
    description: 'معرف الكيان',
    example: 'uuid-of-entity',
  })
  @IsUUID()
  entityId: string;

  @ApiProperty({
    description: 'نوع السجل',
    enum: ComplianceRecordType,
    example: ComplianceRecordType.BROKER_LICENSE,
  })
  @IsEnum(ComplianceRecordType)
  recordType: ComplianceRecordType;

  @ApiPropertyOptional({
    description: 'رقم المرجع (رقم الترخيص، رقم السجل...)',
    example: 'BR-2024-001234',
  })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({
    description: 'تاريخ الإصدار',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @ApiPropertyOptional({
    description: 'تاريخ الانتهاء',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'رابط المستند',
    example: 'https://cdn.example.com/docs/license.pdf',
  })
  @IsOptional()
  @IsString()
  documentUrl?: string;

  @ApiPropertyOptional({
    description: 'ملاحظات',
    example: 'تم التجديد في يناير',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO لتحديث سجل امتثال
 */
export class UpdateComplianceRecordDto extends PartialType(CreateComplianceRecordDto) {
  @ApiPropertyOptional({
    description: 'حالة السجل',
    enum: ComplianceRecordStatus,
    example: ComplianceRecordStatus.VALID,
  })
  @IsOptional()
  @IsEnum(ComplianceRecordStatus)
  status?: ComplianceRecordStatus;
}

/**
 * DTO لفلترة سجلات الامتثال
 */
export class GetComplianceRecordsDto {
  @ApiPropertyOptional({
    description: 'رقم الصفحة',
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'عدد العناصر في الصفحة',
    default: 20,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'نوع الكيان',
    enum: ComplianceEntityType,
  })
  @IsOptional()
  @IsEnum(ComplianceEntityType)
  entityType?: ComplianceEntityType;

  @ApiPropertyOptional({
    description: 'معرف الكيان',
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'نوع السجل',
    enum: ComplianceRecordType,
  })
  @IsOptional()
  @IsEnum(ComplianceRecordType)
  recordType?: ComplianceRecordType;

  @ApiPropertyOptional({
    description: 'حالة السجل',
    enum: ComplianceRecordStatus,
  })
  @IsOptional()
  @IsEnum(ComplianceRecordStatus)
  status?: ComplianceRecordStatus;

  @ApiPropertyOptional({
    description: 'المستندات المنتهية خلال X يوم',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  expiringWithinDays?: number;
}

/**
 * DTO للتنبيهات
 */
export class ComplianceAlertDto {
  @ApiProperty({ description: 'معرف التنبيه' })
  id: string;

  @ApiProperty({ description: 'نوع التنبيه', enum: AlertType })
  type: AlertType;

  @ApiProperty({ description: 'نوع التنبيه بالعربية' })
  typeAr: string;

  @ApiProperty({ description: 'العنوان' })
  title: string;

  @ApiProperty({ description: 'العنوان بالعربية' })
  titleAr: string;

  @ApiProperty({ description: 'الرسالة' })
  message: string;

  @ApiProperty({ description: 'الرسالة بالعربية' })
  messageAr: string;

  @ApiProperty({ description: 'نوع الكيان' })
  entityType: string;

  @ApiProperty({ description: 'معرف الكيان' })
  entityId: string;

  @ApiProperty({ description: 'اسم الكيان' })
  entityName: string;

  @ApiPropertyOptional({ description: 'نوع السجل' })
  recordType?: string;

  @ApiPropertyOptional({ description: 'تاريخ الانتهاء' })
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'الأيام المتبقية' })
  daysRemaining?: number;

  @ApiProperty({ description: 'الأولوية (1=عالي، 2=متوسط، 3=منخفض)' })
  priority: number;

  @ApiProperty({ description: 'تاريخ الإنشاء' })
  createdAt: Date;

  @ApiProperty({ description: 'تم القراءة' })
  isRead: boolean;
}

/**
 * DTO لسجل السمسرة
 */
export class BrokerRegistryDto {
  @ApiProperty({ description: 'معرف المستخدم' })
  userId: string;

  @ApiProperty({ description: 'اسم السمسري' })
  name: string;

  @ApiProperty({ description: 'الاسم بالعربية' })
  nameAr: string;

  @ApiProperty({ description: 'البريد الإلكتروني' })
  email: string;

  @ApiPropertyOptional({ description: 'رقم الهاتف' })
  phone?: string;

  @ApiPropertyOptional({ description: 'رقم رخصة السمسرة' })
  brokerLicenseNo?: string;

  @ApiPropertyOptional({
    description: 'تصنيف السمسرة',
    enum: BrokerClassification,
  })
  brokerClassification?: BrokerClassification;

  @ApiPropertyOptional({ description: 'تاريخ انتهاء الرخصة' })
  brokerLicenseExp?: Date;

  @ApiProperty({ description: 'حالة الامتثال' })
  complianceStatus: 'compliant' | 'warning' | 'non_compliant';

  @ApiProperty({ description: 'حالة الامتثال بالعربية' })
  complianceStatusAr: string;

  @ApiPropertyOptional({ description: 'الأيام حتى انتهاء الرخصة' })
  daysUntilExpiry?: number;

  @ApiProperty({ description: 'المستندات المفقودة' })
  missingDocuments: string[];

  @ApiProperty({ description: 'المستندات المنتهية' })
  expiredDocuments: string[];
}

/**
 * DTO للمستندات المنتهية
 */
export class ExpiringRecordsDto {
  @ApiPropertyOptional({
    description: 'عدد الأيام للفحص',
    default: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  days?: number = 30;
}

/**
 * DTO لحالة الامتثال الكاملة
 */
export class ComplianceStatusDto {
  @ApiProperty({ description: 'حالة المنظمة الكلية' })
  organizationStatus: 'compliant' | 'warning' | 'non_compliant';

  @ApiProperty({ description: 'حالة المنظمة بالعربية' })
  organizationStatusAr: string;

  @ApiProperty({ description: 'نسبة الامتثال' })
  compliancePercentage: number;

  @ApiProperty({ description: 'إجمالي السجلات' })
  totalRecords: number;

  @ApiProperty({ description: 'السجلات السارية' })
  validRecords: number;

  @ApiProperty({ description: 'السجلات المنتهية قريباً' })
  expiringRecords: number;

  @ApiProperty({ description: 'السجلات المنتهية' })
  expiredRecords: number;

  @ApiProperty({ description: 'عدد السماسرة' })
  totalBrokers: number;

  @ApiProperty({ description: 'السماسرة الممتثلين' })
  compliantBrokers: number;

  @ApiProperty({ description: 'التنبيهات النشطة' })
  activeAlerts: number;

  @ApiProperty({ description: 'تصنيف المكتب', enum: BrokerClassification })
  officeClassification?: BrokerClassification;

  @ApiPropertyOptional({ description: 'تاريخ انتهاء رخصة المكتب' })
  officeLicenseExpiry?: Date;

  @ApiPropertyOptional({ description: 'الأيام حتى انتهاء رخصة المكتب' })
  officeLicenseDaysRemaining?: number;
}
