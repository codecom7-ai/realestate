// ═══════════════════════════════════════════════════════════════
// Upload DTOs - بيانات رفع الملفات
// ═══════════════════════════════════════════════════════════════

import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// أنواع الكيانات التي يمكن رفع صور لها
export enum UploadEntityType {
  PROPERTY = 'property',
  CLIENT = 'client',
  DEAL = 'deal',
  CONTRACT = 'contract',
  DOCUMENT = 'document',
  USER_AVATAR = 'user_avatar',
  ORGANIZATION_LOGO = 'organization_logo',
}

export const ENTITY_TYPE_AR: Record<UploadEntityType, string> = {
  [UploadEntityType.PROPERTY]: 'عقار',
  [UploadEntityType.CLIENT]: 'عميل',
  [UploadEntityType.DEAL]: 'صفقة',
  [UploadEntityType.CONTRACT]: 'عقد',
  [UploadEntityType.DOCUMENT]: 'مستند',
  [UploadEntityType.USER_AVATAR]: 'صورة المستخدم',
  [UploadEntityType.ORGANIZATION_LOGO]: 'شعار المنظمة',
};

// أنواع الملفات المسموحة
export enum AllowedMimeType {
  IMAGE_JPEG = 'image/jpeg',
  IMAGE_PNG = 'image/png',
  IMAGE_WEBP = 'image/webp',
  IMAGE_GIF = 'image/gif',
  APPLICATION_PDF = 'application/pdf',
}

export const ALLOWED_IMAGE_TYPES = [
  AllowedMimeType.IMAGE_JPEG,
  AllowedMimeType.IMAGE_PNG,
  AllowedMimeType.IMAGE_WEBP,
  AllowedMimeType.IMAGE_GIF,
];

export const ALLOWED_DOCUMENT_TYPES = [
  AllowedMimeType.APPLICATION_PDF,
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_PROPERTY_IMAGES = 20;

// DTO لطلب presigned URL
export class GetPresignedUrlDto {
  @ApiProperty({
    description: 'نوع الملف (image/jpeg, image/png, image/webp, application/pdf)',
    enum: AllowedMimeType,
    example: AllowedMimeType.IMAGE_JPEG,
  })
  @IsEnum(AllowedMimeType)
  mimeType: AllowedMimeType;

  @ApiProperty({
    description: 'نوع الكيان المرتبط',
    enum: UploadEntityType,
    example: UploadEntityType.PROPERTY,
  })
  @IsEnum(UploadEntityType)
  entityType: UploadEntityType;

  @ApiProperty({
    description: 'معرف الكيان المرتبط',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  entityId: string;

  @ApiPropertyOptional({
    description: 'اسم الملف الأصلي',
    example: 'property-photo.jpg',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalFileName?: string;

  @ApiPropertyOptional({
    description: 'حجم الملف بالبايت (للتحقق)',
    example: 1024000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_FILE_SIZE)
  fileSize?: number;
}

// DTO لتأكيد الرفع
export class ConfirmUploadDto {
  @ApiProperty({
    description: 'المفتاح الفريد للملف في R2',
    example: 'properties/123e4567-e89b-12d3-a456-426614174000/abc123.jpg',
  })
  @IsString()
  key: string;

  @ApiProperty({
    description: 'نوع الكيان المرتبط',
    enum: UploadEntityType,
    example: UploadEntityType.PROPERTY,
  })
  @IsEnum(UploadEntityType)
  entityType: UploadEntityType;

  @ApiProperty({
    description: 'معرف الكيان المرتبط',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  entityId: string;

  @ApiPropertyOptional({
    description: 'ترتيب الصورة (للعقارات)',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    description: 'هل الصورة رئيسية',
    example: false,
  })
  @IsOptional()
  isPrimary?: boolean;
}

// DTO لحذف صورة
export class DeleteImageDto {
  @ApiProperty({
    description: 'معرف الصورة',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  imageId: string;

  @ApiProperty({
    description: 'نوع الكيان',
    enum: UploadEntityType,
    example: UploadEntityType.PROPERTY,
  })
  @IsEnum(UploadEntityType)
  entityType: UploadEntityType;
}

// DTO لترتيب الصور
export class ReorderImagesDto {
  @ApiProperty({
    description: 'معرف الكيان',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  entityId: string;

  @ApiProperty({
    description: 'قائمة معرفات الصور بالترتيب الجديد',
    type: [String],
    example: ['id1', 'id2', 'id3'],
  })
  @IsUUID('4', { each: true })
  imageIds: string[];

  @ApiPropertyOptional({
    description: 'معرف الصورة الرئيسية',
    example: 'id1',
  })
  @IsOptional()
  @IsUUID()
  primaryImageId?: string;
}
