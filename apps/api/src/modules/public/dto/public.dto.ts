// ═══════════════════════════════════════════════════════════════
// Public API DTOs
// واجهات البيانات للـ API العام
// ═══════════════════════════════════════════════════════════════

import { IsString, IsOptional, IsEmail, IsPhoneNumber, IsDateString, MinLength, MaxLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ═══════════════════════════════════════════════════════════════
// Create Viewing Request DTO
// ═══════════════════════════════════════════════════════════════

export class CreateViewingRequestDto {
  @ApiProperty({ description: 'Property ID', example: 'uuid' })
  @IsUUID()
  propertyId: string;

  @ApiProperty({ description: 'Full name', example: 'أحمد محمد علي' })
  @IsString()
  @MinLength(3, { message: 'الاسم يجب أن يكون 3 أحرف على الأقل' })
  @MaxLength(100, { message: 'الاسم يجب أن يكون 100 حرف على الأكثر' })
  name: string;

  @ApiProperty({ description: 'Phone number', example: '+201234567890' })
  @IsString()
  @MinLength(10, { message: 'رقم الهاتف غير صحيح' })
  @MaxLength(20, { message: 'رقم الهاتف غير صحيح' })
  phone: string;

  @ApiPropertyOptional({ description: 'Email address', example: 'ahmed@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
  email?: string;

  @ApiPropertyOptional({ description: 'Message or notes', example: 'أريد معاينة العقار' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'الرسالة يجب أن تكون 500 حرف على الأكثر' })
  message?: string;

  @ApiPropertyOptional({ description: 'Preferred date', example: '2024-04-15' })
  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @ApiPropertyOptional({ description: 'Preferred time', example: '10:00' })
  @IsOptional()
  @IsString()
  preferredTime?: string;
}

// ═══════════════════════════════════════════════════════════════
// Confirm Viewing DTO
// ═══════════════════════════════════════════════════════════════

export class ConfirmViewingDto {
  @ApiProperty({ description: 'Client phone number for verification', example: '+201234567890' })
  @IsString()
  phone: string;
}

// ═══════════════════════════════════════════════════════════════
// Response DTOs
// ═══════════════════════════════════════════════════════════════

export class PropertyPublicDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  titleAr: string | null;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  propertyType: string;

  @ApiPropertyOptional()
  finishingType: string | null;

  @ApiProperty()
  city: string;

  @ApiPropertyOptional()
  district: string | null;

  @ApiPropertyOptional()
  address: string | null;

  @ApiPropertyOptional()
  floor: number | null;

  @ApiPropertyOptional()
  unitNumber: string | null;

  @ApiProperty()
  areaM2: number;

  @ApiPropertyOptional()
  bedrooms: number | null;

  @ApiPropertyOptional()
  bathrooms: number | null;

  @ApiPropertyOptional()
  parking: number | null;

  @ApiProperty()
  askingPrice: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ type: 'array' })
  images: {
    id: string;
    url: string;
    isPrimary: boolean;
    order: number;
  }[];
}

export class ClientPublicDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  firstNameAr: string | null;

  @ApiPropertyOptional()
  lastNameAr: string | null;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional()
  email: string | null;

  @ApiProperty()
  isVip: boolean;
}

export class ClientDataDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional()
  email: string | null;

  @ApiProperty({ type: 'array' })
  viewings: any[];

  @ApiProperty({ type: 'array' })
  deals: any[];

  @ApiProperty({ type: 'array' })
  payments: any[];
}

export class ViewingRequestResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  requestId: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  messageAr: string;
}
