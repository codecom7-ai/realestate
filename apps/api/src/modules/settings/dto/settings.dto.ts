// ═══════════════════════════════════════════════════════════════
// Settings DTOs - إعدادات التكاملات
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// ─────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────

export enum SettingCategory {
  ETA = 'eta',
  AI = 'ai',
  PAYMENTS = 'payments',
  STORAGE = 'storage',
  WHATSAPP = 'whatsapp',
  FIREBASE = 'firebase',
}

export const SETTING_CATEGORY_AR: Record<SettingCategory, string> = {
  [SettingCategory.ETA]: 'الفوترة الإلكترونية (ETA)',
  [SettingCategory.AI]: 'مزودي الذكاء الاصطناعي',
  [SettingCategory.PAYMENTS]: 'بوابات الدفع',
  [SettingCategory.STORAGE]: 'التخزين السحابي (R2)',
  [SettingCategory.WHATSAPP]: 'واتساب للأعمال',
  [SettingCategory.FIREBASE]: 'Firebase',
};

// ─────────────────────────────────────────────────────────────────
// Setting Keys per Category
// ─────────────────────────────────────────────────────────────────

export const SETTING_KEYS: Record<SettingCategory, { key: string; label: string; labelAr: string; isSecret: boolean }[]> = {
  [SettingCategory.ETA]: [
    { key: 'clientId', label: 'Client ID', labelAr: 'معرف العميل', isSecret: false },
    { key: 'clientSecret', label: 'Client Secret', labelAr: 'السر الخاص بالعميل', isSecret: true },
    { key: 'presharedKey', label: 'Preshared Key', labelAr: 'المفتاح المشترك', isSecret: true },
  ],
  [SettingCategory.AI]: [
    { key: 'anthropicKey', label: 'Anthropic API Key', labelAr: 'مفتاح Anthropic', isSecret: true },
    { key: 'googleAiKey', label: 'Google AI API Key', labelAr: 'مفتاح Google AI', isSecret: true },
    { key: 'openrouterKey', label: 'OpenRouter API Key', labelAr: 'مفتاح OpenRouter', isSecret: true },
  ],
  [SettingCategory.PAYMENTS]: [
    { key: 'paymobKey', label: 'Paymob API Key', labelAr: 'مفتاح Paymob', isSecret: true },
    { key: 'fawryCode', label: 'Fawry Merchant Code', labelAr: 'كود تاجر فوري', isSecret: false },
    { key: 'fawryHash', label: 'Fawry Security Hash', labelAr: 'هاش أمان فوري', isSecret: true },
  ],
  [SettingCategory.STORAGE]: [
    { key: 'accountId', label: 'Account ID', labelAr: 'معرف الحساب', isSecret: false },
    { key: 'accessKey', label: 'Access Key ID', labelAr: 'مفتاح الوصول', isSecret: true },
    { key: 'secretKey', label: 'Secret Access Key', labelAr: 'المفتاح السري', isSecret: true },
    { key: 'bucketName', label: 'Bucket Name', labelAr: 'اسم الحاوية', isSecret: false },
  ],
  [SettingCategory.WHATSAPP]: [
    { key: 'token', label: 'Access Token', labelAr: 'رمز الوصول', isSecret: true },
    { key: 'phoneId', label: 'Phone Number ID', labelAr: 'معرف رقم الهاتف', isSecret: false },
  ],
  [SettingCategory.FIREBASE]: [
    { key: 'projectId', label: 'Project ID', labelAr: 'معرف المشروع', isSecret: false },
    { key: 'privateKey', label: 'Private Key', labelAr: 'المفتاح الخاص', isSecret: true },
    { key: 'clientEmail', label: 'Client Email', labelAr: 'البريد الإلكتروني للعميل', isSecret: false },
  ],
};

// ─────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────

export class UpdateSettingDto {
  @ApiProperty({ description: 'قيمة الإعداد', example: 'sk-ant-xxxxx' })
  @IsString()
  value: string;
}

export class UpdateSettingsCategoryDto {
  @ApiProperty({ description: 'قائمة الإعدادات لتحديثها' })
  @ValidateNested({ each: true })
  @Type(() => UpdateSettingItemDto)
  settings: UpdateSettingItemDto[];
}

export class UpdateSettingItemDto {
  @ApiProperty({ description: 'مفتاح الإعداد', example: 'anthropicKey' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'قيمة الإعداد', example: 'sk-ant-xxxxx' })
  @IsString()
  value: string;
}

// ─────────────────────────────────────────────────────────────────
// Response DTOs
// ─────────────────────────────────────────────────────────────────

export class SettingResponseDto {
  @ApiProperty({ description: 'معرف الإعداد' })
  id: string;

  @ApiProperty({ description: 'الفئة', enum: SettingCategory })
  category: SettingCategory;

  @ApiProperty({ description: 'مفتاح الإعداد' })
  key: string;

  @ApiPropertyOptional({ description: 'القيمة (مخفية إذا كانت سرية)' })
  value?: string;

  @ApiProperty({ description: 'هل القيمة مخفية' })
  isSecret: boolean;

  @ApiPropertyOptional({ description: 'القيمة المعروضة (مخفية جزئياً)' })
  maskedValue?: string;

  @ApiPropertyOptional({ description: 'حالة التحقق' })
  verificationStatus?: string;

  @ApiPropertyOptional({ description: 'تاريخ آخر تحقق' })
  lastVerifiedAt?: Date;

  @ApiPropertyOptional({ description: 'خطأ التحقق' })
  verificationError?: string;

  @ApiProperty({ description: 'تاريخ الإنشاء' })
  createdAt: Date;

  @ApiProperty({ description: 'تاريخ التحديث' })
  updatedAt: Date;
}

export class SettingCategoryResponseDto {
  @ApiProperty({ description: 'الفئة', enum: SettingCategory })
  category: SettingCategory;

  @ApiProperty({ description: 'اسم الفئة بالعربية' })
  categoryAr: string;

  @ApiProperty({ description: 'قائمة الإعدادات', type: [SettingResponseDto] })
  settings: SettingResponseDto[];

  @ApiProperty({ description: 'عدد الإعدادات المُكوَّنة' })
  configuredCount: number;

  @ApiProperty({ description: 'إجمالي الإعدادات' })
  totalCount: number;
}

export class AllSettingsResponseDto {
  @ApiProperty({ description: 'جميع الإعدادات حسب الفئة', type: [SettingCategoryResponseDto] })
  categories: SettingCategoryResponseDto[];
}

export class TestConnectionResponseDto {
  @ApiProperty({ description: 'الفئة', enum: SettingCategory })
  category: SettingCategory;

  @ApiProperty({ description: 'نتيجة الاختبار' })
  success: boolean;

  @ApiPropertyOptional({ description: 'رسالة النجاح' })
  message?: string;

  @ApiPropertyOptional({ description: 'رسالة الخطأ' })
  error?: string;

  @ApiPropertyOptional({ description: 'تفاصيل إضافية' })
  details?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────
// Setting Value Response (for getting a single decrypted value)
// ─────────────────────────────────────────────────────────────────

export class SettingValueResponseDto {
  @ApiProperty({ description: 'المفتاح' })
  key: string;

  @ApiProperty({ description: 'القيمة (فقط إذا طُلب decrypted)' })
  value: string;
}
