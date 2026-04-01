// ═══════════════════════════════════════════════════════════════
// Create Property DTO - بيانات إنشاء عقار جديد
// ═══════════════════════════════════════════════════════════════

import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType, PropertyStatus, FinishingType } from '@realestate/shared-types';

// أنواع العقارات
export const PROPERTY_TYPES_AR: Record<PropertyType, string> = {
  APARTMENT: 'شقة',
  VILLA: 'فيلا',
  DUPLEX: 'دوبلكس',
  PENTHOUSE: 'بنتهاوس',
  STUDIO: 'استوديو',
  OFFICE: 'مكتب',
  SHOP: 'محل',
  WAREHOUSE: 'مستودع',
  LAND: 'أرض',
  COMPOUND_UNIT: 'وحدة كمباوند',
};

// حالات العقار
export const PROPERTY_STATUS_AR: Record<PropertyStatus, string> = {
  AVAILABLE: 'متاح',
  RESERVED_TEMP: 'محجوز مؤقتاً',
  RESERVED_CONFIRMED: 'محجوز مؤكد',
  SOLD: 'مباع',
  RENTED: 'مؤجر',
  SUSPENDED: 'معلق',
  UNDER_MAINTENANCE: 'تحت الصيانة',
};

// أنواع التشطيب
export const FINISHING_TYPES_AR: Record<FinishingType, string> = {
  FULLY_FINISHED: 'تشطيب كامل',
  SEMI_FINISHED: 'تشطيب جزئي',
  CORE_SHELL: 'هيكل فقط',
  ULTRA_LUXURY: 'تشطيب فاخر',
};

export class CreatePropertyDto {
  @ApiProperty({
    description: 'عنوان العقار',
    example: 'شقة فاخرة في التجمع الخامس',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description: 'عنوان العقار بالعربية',
    example: 'شقة فاخرة في التجمع الخامس',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleAr?: string;

  @ApiPropertyOptional({
    description: 'وصف العقار',
    example: 'شقة فاخرة تشطيب كامل مساحة 180 متر مربع',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'نوع العقار',
    enum: PropertyType,
    example: PropertyType.APARTMENT,
  })
  @IsEnum(PropertyType)
  propertyType: PropertyType;

  @ApiPropertyOptional({
    description: 'نوع التشطيب',
    enum: FinishingType,
    example: FinishingType.FULLY_FINISHED,
  })
  @IsOptional()
  @IsEnum(FinishingType)
  finishingType?: FinishingType;

  @ApiPropertyOptional({
    description: 'حالة العقار',
    enum: PropertyStatus,
    example: PropertyStatus.AVAILABLE,
    default: PropertyStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiProperty({
    description: 'المدينة',
    example: 'القاهرة',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({
    description: 'المنطقة/الحي',
    example: 'التجمع الخامس',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({
    description: 'العنوان التفصيلي',
    example: 'شارع التسعين الشمالي، العمارة 15',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    description: 'الدور',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(-5)
  floor?: number;

  @ApiPropertyOptional({
    description: 'رقم الوحدة',
    example: 'A15',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unitNumber?: string;

  @ApiProperty({
    description: 'المساحة بالمتر المربع',
    example: 180,
  })
  @IsNumber()
  @Min(1)
  areaM2: number;

  @ApiPropertyOptional({
    description: 'عدد غرف النوم',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({
    description: 'عدد الحمامات',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({
    description: 'عدد أماكن الانتظار',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  parking?: number;

  @ApiProperty({
    description: 'السعر المطلوب',
    example: 3500000,
  })
  @IsNumber()
  @Min(0)
  askingPrice: number;

  @ApiPropertyOptional({
    description: 'العملة',
    example: 'EGP',
    default: 'EGP',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({
    description: 'معرف الفرع',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'معرف المشروع',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'معرف المطور',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsUUID()
  developerId?: string;

  @ApiPropertyOptional({
    description: 'هل العقار معروض للبيع',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isListed?: boolean;

  @ApiPropertyOptional({
    description: 'هل العقار على المخطط (off-plan)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isOffPlan?: boolean;

  @ApiPropertyOptional({
    description: 'نسبة العمولة (%)',
    example: 2.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}

export class UpdatePropertyDto {
  @ApiPropertyOptional({
    description: 'عنوان العقار',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'عنوان العقار بالعربية',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleAr?: string;

  @ApiPropertyOptional({
    description: 'وصف العقار',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'نوع التشطيب',
    enum: FinishingType,
  })
  @IsOptional()
  @IsEnum(FinishingType)
  finishingType?: FinishingType;

  @ApiPropertyOptional({
    description: 'حالة العقار',
    enum: PropertyStatus,
  })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiPropertyOptional({
    description: 'السعر المطلوب',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  askingPrice?: number;

  @ApiPropertyOptional({
    description: 'نسبة العمولة (%)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiPropertyOptional({
    description: 'هل العقار معروض',
  })
  @IsOptional()
  @IsBoolean()
  isListed?: boolean;
}

export class LockPropertyDto {
  @ApiProperty({
    description: 'معرف الصفقة التي تحجز العقار',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  dealId: string;

  @ApiProperty({
    description: 'نوع الحجز (temporary - مؤقت، confirmed - مؤكد)',
    example: 'temporary',
    enum: ['temporary', 'confirmed'],
  })
  @IsString()
  lockType: 'temporary' | 'confirmed';

  @ApiPropertyOptional({
    description: 'تاريخ انتهاء الحجز (للحجز المؤقت)',
    example: '2026-03-25T00:00:00Z',
  })
  @IsOptional()
  expiresAt?: string;
}

export class GetPropertiesDto {
  @ApiPropertyOptional({
    description: 'حالة العقار',
    enum: PropertyStatus,
  })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiPropertyOptional({
    description: 'نوع العقار',
    enum: PropertyType,
  })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({
    description: 'المدينة',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'المنطقة/الحي',
  })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({
    description: 'أقل سعر',
  })
  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'أعلى سعر',
  })
  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'أقل مساحة',
  })
  @IsOptional()
  @IsNumber()
  minArea?: number;

  @ApiPropertyOptional({
    description: 'أعلى مساحة',
  })
  @IsOptional()
  @IsNumber()
  maxArea?: number;

  @ApiPropertyOptional({
    description: 'أقل عدد غرف نوم',
  })
  @IsOptional()
  @IsNumber()
  minBedrooms?: number;

  @ApiPropertyOptional({
    description: 'أعلى عدد غرف نوم',
  })
  @IsOptional()
  @IsNumber()
  maxBedrooms?: number;

  @ApiPropertyOptional({
    description: 'البحث في العنوان والوصف',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'رقم الصفحة',
    example: 1,
    default: 1,
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'عدد النتائج في الصفحة',
    example: 20,
    default: 20,
  })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'حقل الترتيب',
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'اتجاه الترتيب',
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
