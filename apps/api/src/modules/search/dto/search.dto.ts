// ═══════════════════════════════════════════════════════════════
// Search DTOs - البحث الشامل
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * أنواع الكيانات القابلة للبحث
 */
export enum SearchEntityType {
  CLIENT = 'client',
  LEAD = 'lead',
  PROPERTY = 'property',
  DEAL = 'deal',
}

/**
 * أسماء أنواع الكيانات بالعربية
 */
export const ENTITY_TYPE_AR: Record<SearchEntityType, string> = {
  [SearchEntityType.CLIENT]: 'عميل',
  [SearchEntityType.LEAD]: 'عميل محتمل',
  [SearchEntityType.PROPERTY]: 'عقار',
  [SearchEntityType.DEAL]: 'صفقة',
};

/**
 * DTO للبحث الشامل
 */
export class SearchQueryDto {
  @ApiProperty({
    description: 'نص البحث (يدعم العربية والإنجليزية)',
    example: 'أحمد محمد',
    minLength: 2,
    maxLength: 100,
  })
  q: string;

  @ApiPropertyOptional({
    description: 'أنواع الكيانات للبحث فيها (مفصولة بفاصلة)',
    enum: SearchEntityType,
    example: 'client,lead,property',
    type: String,
  })
  types?: string;

  @ApiPropertyOptional({
    description: 'الحد الأقصى للنتائج لكل نوع',
    example: 5,
    default: 5,
    minimum: 1,
    maximum: 20,
  })
  limit?: number;

  @ApiPropertyOptional({
    description: 'تضمين المحذوفين (للمديرين فقط)',
    example: false,
    default: false,
  })
  includeDeleted?: boolean;
}

/**
 * نتيجة بحث واحدة
 */
export class SearchResultItemDto {
  @ApiProperty({
    description: 'معرف الكيان',
    example: 'uuid-1234',
  })
  id: string;

  @ApiProperty({
    description: 'نوع الكيان',
    enum: SearchEntityType,
    example: SearchEntityType.CLIENT,
  })
  type: SearchEntityType;

  @ApiProperty({
    description: 'نوع الكيان بالعربية',
    example: 'عميل',
  })
  typeAr: string;

  @ApiProperty({
    description: 'العنوان الرئيسي للنتيجة',
    example: 'أحمد محمد علي',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'العنوان الفرعي (مثل الهاتف أو العنوان)',
    example: '01012345678',
  })
  subtitle?: string;

  @ApiPropertyOptional({
    description: 'وصف إضافي',
    example: 'شقة 150م² - مدينة نصر',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'رابط الصورة المصغرة',
    example: 'https://r2.example.com/thumb.jpg',
  })
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'حالة الكيان',
    example: 'AVAILABLE',
  })
  status?: string;

  @ApiPropertyOptional({
    description: 'حالة الكيان بالعربية',
    example: 'متاح',
  })
  statusAr?: string;

  @ApiPropertyOptional({
    description: 'معلومات إضافية',
    example: { price: 1500000, area: 150 },
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'درجة التطابق (0-1)',
    example: 0.85,
  })
  relevance: number;

  @ApiProperty({
    description: 'تاريخ الإنشاء',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}

/**
 * نتائج البحث مجمعة حسب النوع
 */
export class SearchResultsByTypeDto {
  @ApiProperty({
    description: 'نوع الكيان',
    enum: SearchEntityType,
  })
  type: SearchEntityType;

  @ApiProperty({
    description: 'نوع الكيان بالعربية',
  })
  typeAr: string;

  @ApiProperty({
    description: 'عدد النتائج',
  })
  count: number;

  @ApiProperty({
    description: 'النتائج',
    type: [SearchResultItemDto],
  })
  items: SearchResultItemDto[];
}

/**
 * استجابة البحث الشاملة
 */
export class SearchResponseDto {
  @ApiProperty({
    description: 'نص البحث',
    example: 'أحمد',
  })
  query: string;

  @ApiProperty({
    description: 'إجمالي النتائج',
    example: 15,
  })
  totalResults: number;

  @ApiProperty({
    description: 'وقت البحث بالميلي ثانية',
    example: 45,
  })
  searchTimeMs: number;

  @ApiProperty({
    description: 'النتائج مجمعة حسب النوع',
    type: [SearchResultsByTypeDto],
  })
  results: SearchResultsByTypeDto[];

  @ApiProperty({
    description: 'جميع النتائج مسطحة (مرتبة حسب التطابق)',
    type: [SearchResultItemDto],
  })
  allResults: SearchResultItemDto[];
}

/**
 * اقتراحات البحث السريع
 */
export class SearchSuggestionDto {
  @ApiProperty({
    description: 'النص المقترح',
    example: 'أحمد محمد',
  })
  text: string;

  @ApiProperty({
    description: 'نوع الكيان',
    enum: SearchEntityType,
  })
  type: SearchEntityType;

  @ApiProperty({
    description: 'عدد النتائج المحتملة',
    example: 3,
  })
  count: number;
}
