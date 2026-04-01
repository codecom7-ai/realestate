// ═══════════════════════════════════════════════════════════════
// Audit Query DTO - نظام تشغيل المكتب العقاري المصري
// Phase 5.03 — Audit Log Viewer
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsIn,
} from 'class-validator';

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

/**
 * أنواع الكيانات للـ Audit Log
 */
export enum AuditEntityType {
  CLIENT = 'client',
  LEAD = 'lead',
  PROPERTY = 'property',
  DEAL = 'deal',
  USER = 'user',
  DOCUMENT = 'document',
  CONTRACT = 'contract',
  PAYMENT = 'payment',
  COMMISSION = 'commission',
  COMPLIANCE = 'compliance_record',
  ORGANIZATION = 'organization',
}

/**
 * الترجمة العربية لأنواع الكيانات
 */
export const AUDIT_ENTITY_TYPE_AR: Record<AuditEntityType, string> = {
  [AuditEntityType.CLIENT]: 'عميل',
  [AuditEntityType.LEAD]: 'عميل محتمل',
  [AuditEntityType.PROPERTY]: 'عقار',
  [AuditEntityType.DEAL]: 'صفقة',
  [AuditEntityType.USER]: 'مستخدم',
  [AuditEntityType.DOCUMENT]: 'مستند',
  [AuditEntityType.CONTRACT]: 'عقد',
  [AuditEntityType.PAYMENT]: 'دفعة',
  [AuditEntityType.COMMISSION]: 'عمولة',
  [AuditEntityType.COMPLIANCE]: 'سجل امتثال',
  [AuditEntityType.ORGANIZATION]: 'منظمة',
};

/**
 * أنواع الإجراءات الشائعة
 */
export enum AuditAction {
  // Client actions
  CLIENT_CREATED = 'client.created',
  CLIENT_UPDATED = 'client.updated',
  CLIENT_DELETED = 'client.deleted',
  CLIENT_MERGED = 'client.merged',
  
  // Lead actions
  LEAD_CREATED = 'lead.created',
  LEAD_UPDATED = 'lead.updated',
  LEAD_STAGE_CHANGED = 'lead.stage_changed',
  LEAD_ASSIGNED = 'lead.assigned',
  LEAD_DELETED = 'lead.deleted',
  
  // Property actions
  PROPERTY_CREATED = 'property.created',
  PROPERTY_UPDATED = 'property.updated',
  PROPERTY_DELETED = 'property.deleted',
  PROPERTY_LOCKED = 'property.locked',
  PROPERTY_UNLOCKED = 'property.unlocked',
  
  // Deal actions
  DEAL_CREATED = 'deal.created',
  DEAL_UPDATED = 'deal.updated',
  DEAL_CLOSED = 'deal.closed',
  DEAL_CANCELLED = 'deal.cancelled',
  
  // Document actions
  DOCUMENT_UPLOADED = 'document.uploaded',
  DOCUMENT_VERIFIED = 'document.verified',
  DOCUMENT_REJECTED = 'document.rejected',
  DOCUMENT_DELETED = 'document.deleted',
  DOCUMENT_OCR_COMPLETED = 'document.ocr_completed',
  
  // User actions
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  
  // Compliance actions
  COMPLIANCE_RECORD_CREATED = 'compliance.record_created',
  COMPLIANCE_RECORD_UPDATED = 'compliance.record_updated',
  COMPLIANCE_ALERT = 'compliance.alert',
  
  // Payment actions
  PAYMENT_RECEIVED = 'payment.received',
  PAYMENT_REFUNDED = 'payment.refunded',
  
  // Auth actions
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_MFA_ENABLED = 'auth.mfa_enabled',
  AUTH_PASSWORD_CHANGED = 'auth.password_changed',
}

/**
 * الترجمة العربية للإجراءات
 */
export const AUDIT_ACTION_AR: Record<string, string> = {
  // Client
  'client.created': 'إنشاء عميل',
  'client.updated': 'تحديث عميل',
  'client.deleted': 'حذف عميل',
  'client.merged': 'دمج عميل',
  
  // Lead
  'lead.created': 'إنشاء عميل محتمل',
  'lead.updated': 'تحديث عميل محتمل',
  'lead.stage_changed': 'تغيير مرحلة',
  'lead.assigned': 'تعيين مسؤول',
  'lead.deleted': 'حذف عميل محتمل',
  
  // Property
  'property.created': 'إنشاء عقار',
  'property.updated': 'تحديث عقار',
  'property.deleted': 'حذف عقار',
  'property.locked': 'حجز عقار',
  'property.unlocked': 'إلغاء حجز عقار',
  
  // Deal
  'deal.created': 'إنشاء صفقة',
  'deal.updated': 'تحديث صفقة',
  'deal.closed': 'إغلاق صفقة',
  'deal.cancelled': 'إلغاء صفقة',
  
  // Document
  'document.uploaded': 'رفع مستند',
  'document.verified': 'اعتماد مستند',
  'document.rejected': 'رفض مستند',
  'document.deleted': 'حذف مستند',
  'document.ocr_completed': 'اكتمال OCR',
  'document.classified': 'تصنيف مستند',
  
  // User
  'user.login': 'تسجيل دخول',
  'user.logout': 'تسجيل خروج',
  'user.created': 'إنشاء مستخدم',
  'user.updated': 'تحديث مستخدم',
  'user.deleted': 'حذف مستخدم',
  
  // Compliance
  'compliance.record_created': 'إنشاء سجل امتثال',
  'compliance.record_updated': 'تحديث سجل امتثال',
  'compliance.record_deleted': 'حذف سجل امتثال',
  'compliance.alert': 'تنبيه امتثال',
  
  // Payment
  'payment.received': 'استلام دفعة',
  'payment.refunded': 'استرداد دفعة',
  
  // Auth
  'auth.login': 'تسجيل دخول',
  'auth.logout': 'تسجيل خروج',
  'auth.mfa_enabled': 'تفعيل MFA',
  'auth.password_changed': 'تغيير كلمة المرور',
};

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * DTO لفلترة سجلات الـ Audit
 */
export class GetAuditLogsDto {
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
    default: 50,
    maximum: 200,
    example: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'معرف المستخدم',
    example: 'uuid-of-user',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'الإجراء (بحث جزئي)',
    example: 'document',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'نوع الكيان',
    enum: AuditEntityType,
    example: AuditEntityType.DOCUMENT,
  })
  @IsOptional()
  @IsEnum(AuditEntityType)
  entityType?: AuditEntityType;

  @ApiPropertyOptional({
    description: 'معرف الكيان',
    example: 'uuid-of-entity',
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'تاريخ البدء (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'تاريخ الانتهاء (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * DTO لتصدير سجلات الـ Audit
 */
export class AuditLogExportDto {
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

  @ApiPropertyOptional({
    description: 'نوع الكيان',
    enum: AuditEntityType,
  })
  @IsOptional()
  @IsEnum(AuditEntityType)
  entityType?: AuditEntityType;

  @ApiPropertyOptional({
    description: 'معرف المستخدم',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'تنسيق التصدير',
    enum: ['csv', 'pdf'],
    default: 'csv',
  })
  @IsOptional()
  @IsIn(['csv', 'pdf'])
  format?: 'csv' | 'pdf' = 'csv';
}

/**
 * DTO لإحصائيات الـ Audit
 */
export class AuditStatsDto {
  @ApiProperty({ description: 'إجمالي السجلات' })
  totalLogs: number;

  @ApiProperty({ description: 'سجلات اليوم' })
  todayCount: number;

  @ApiProperty({ description: 'سجلات الأسبوع' })
  weekCount: number;

  @ApiProperty({ description: 'سجلات الشهر' })
  monthCount: number;

  @ApiProperty({ description: 'الإجراءات حسب النوع' })
  byAction: Record<string, number>;

  @ApiProperty({ description: 'السجلات حسب الكيان' })
  byEntityType: Record<string, number>;

  @ApiProperty({ description: 'أنشطة المستخدمين' })
  byUser: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;

  @ApiProperty({ description: 'الاتجاه اليومي (آخر 7 أيام)' })
  dailyTrend: Array<{
    date: string;
    count: number;
  }>;
}

/**
 * DTO لسجل الـ Audit
 */
export class AuditLogResponseDto {
  @ApiProperty({ description: 'معرف السجل' })
  id: string;

  @ApiPropertyOptional({ description: 'معرف المستخدم' })
  userId?: string;

  @ApiPropertyOptional({ description: 'اسم المستخدم' })
  userName?: string;

  @ApiProperty({ description: 'الإجراء' })
  action: string;

  @ApiProperty({ description: 'الإجراء بالعربية' })
  actionAr: string;

  @ApiProperty({ description: 'نوع الكيان' })
  entityType: string;

  @ApiProperty({ description: 'نوع الكيان بالعربية' })
  entityTypeAr: string;

  @ApiPropertyOptional({ description: 'معرف الكيان' })
  entityId?: string;

  @ApiPropertyOptional({ description: 'القيمة القديمة' })
  oldValue?: any;

  @ApiPropertyOptional({ description: 'القيمة الجديدة' })
  newValue?: any;

  @ApiPropertyOptional({ description: 'عنوان IP' })
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User Agent' })
  userAgent?: string;

  @ApiProperty({ description: 'وقت الحدث' })
  occurredAt: Date;
}
