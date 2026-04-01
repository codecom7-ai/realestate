// ═══════════════════════════════════════════════════════════════
// Organization DTOs - بيانات المنظمة/المكتب
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';

// ═══════════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════════

export enum BrokerClassification {
  A = 'A',
  B = 'B',
  C = 'C',
}

export enum SupportedCurrency {
  EGP = 'EGP',
  USD = 'USD',
  EUR = 'EUR',
  SAR = 'SAR',
}

export enum SupportedLocale {
  AR = 'ar',
  EN = 'en',
}

export enum SupportedTimezone {
  AFRICA_CAIRO = 'Africa/Cairo',
  ASIA_RIYADH = 'Asia/Riyadh',
  ASIA_DUBAI = 'Asia/Dubai',
}

// ═══════════════════════════════════════════════════════════════
// Organization Settings Types
// ═══════════════════════════════════════════════════════════════

export interface WorkingHours {
  start: string;
  end: string;
}

export interface OrganizationSettings {
  workingHours?: WorkingHours;
  workingDays?: string[];
  defaultCommissionRate?: number;
  vatRate?: number;
  receiptPrefix?: string;
  contractPrefix?: string;
  leadAutoAssign?: boolean;
  notificationSettings?: {
    email?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  };
  etaSettings?: {
    taxpayerActivityCode?: string;
    branchID?: string;
    defaultReceiptType?: string;
  };
  customFields?: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: 'العقاري للمقاولات' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'العقاري للمقاولات والاستثمار العقاري' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({ example: 'el-aqari-real-estate' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({ example: 'العقاري للمقاولات والاستثمار العقاري ش.م.م' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  commercialRegNo?: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({ example: '578-12345' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  brokerLicenseNo?: string;

  @ApiPropertyOptional({ enum: BrokerClassification })
  @IsOptional()
  @IsEnum(BrokerClassification)
  classification?: BrokerClassification;

  @ApiPropertyOptional({ example: '+201234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: 'info@elaqari.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '123 شارع التحرير، الدور الخامس' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'القاهرة' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ enum: SupportedCurrency, default: 'EGP' })
  @IsOptional()
  @IsEnum(SupportedCurrency)
  primaryCurrency?: SupportedCurrency;

  @ApiPropertyOptional({ enum: SupportedTimezone, default: 'Africa/Cairo' })
  @IsOptional()
  @IsEnum(SupportedTimezone)
  timezone?: SupportedTimezone;

  @ApiPropertyOptional({ enum: SupportedLocale, default: 'ar' })
  @IsOptional()
  @IsEnum(SupportedLocale)
  locale?: SupportedLocale;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSetupDone?: boolean;
}

export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional({
    example: { start: '09:00', end: '18:00' },
  })
  @IsOptional()
  workingHours?: WorkingHours;

  @ApiPropertyOptional({
    example: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
  })
  @IsOptional()
  workingDays?: string[];

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  defaultCommissionRate?: number;

  @ApiPropertyOptional({ example: 14 })
  @IsOptional()
  vatRate?: number;

  @ApiPropertyOptional({ example: 'INV' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  receiptPrefix?: string;

  @ApiPropertyOptional({ example: 'CON' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  contractPrefix?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  leadAutoAssign?: boolean;

  @ApiPropertyOptional({
    example: { email: true, sms: false, whatsapp: true },
  })
  @IsOptional()
  notificationSettings?: {
    email?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  };

  @ApiPropertyOptional({
    example: {
      taxpayerActivityCode: '123456',
      branchID: 'BR001',
      defaultReceiptType: 'professional',
    },
  })
  @IsOptional()
  etaSettings?: {
    taxpayerActivityCode?: string;
    branchID?: string;
    defaultReceiptType?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  customFields?: Record<string, any>;
}

export class UploadLogoDto {
  @ApiProperty({ example: 'organizations/logo-uuid.png' })
  @IsString()
  @MinLength(1)
  key: string;
}

// ═══════════════════════════════════════════════════════════════
// Response Types (for Swagger documentation)
// ═══════════════════════════════════════════════════════════════

export class OrganizationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  nameAr?: string;

  @ApiPropertyOptional()
  slug?: string;

  @ApiPropertyOptional()
  legalName?: string;

  @ApiPropertyOptional()
  commercialRegNo?: string;

  @ApiPropertyOptional()
  taxId?: string;

  @ApiPropertyOptional()
  brokerLicenseNo?: string;

  @ApiPropertyOptional({ enum: BrokerClassification })
  classification?: BrokerClassification;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiProperty({ enum: SupportedCurrency })
  primaryCurrency: string;

  @ApiProperty({ enum: SupportedTimezone })
  timezone: string;

  @ApiProperty({ enum: SupportedLocale })
  locale: string;

  @ApiProperty()
  isSetupDone: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class OrganizationSettingsResponseDto {
  @ApiPropertyOptional()
  workingHours?: WorkingHours;

  @ApiPropertyOptional({ type: [String] })
  workingDays?: string[];

  @ApiPropertyOptional()
  defaultCommissionRate?: number;

  @ApiPropertyOptional()
  vatRate?: number;

  @ApiPropertyOptional()
  receiptPrefix?: string;

  @ApiPropertyOptional()
  contractPrefix?: string;

  @ApiPropertyOptional()
  leadAutoAssign?: boolean;

  @ApiPropertyOptional()
  notificationSettings?: {
    email?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  };

  @ApiPropertyOptional()
  etaSettings?: {
    taxpayerActivityCode?: string;
    branchID?: string;
    defaultReceiptType?: string;
  };

  @ApiPropertyOptional()
  customFields?: Record<string, any>;
}
