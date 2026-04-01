// ═══════════════════════════════════════════════════════════════
// Create Branch DTO - بيانات إنشاء فرع جديد
// ═══════════════════════════════════════════════════════════════

import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
  IsUUID,
  IsJSON,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({
    description: 'اسم الفرع',
    example: 'فرع المعادي',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'اسم الفرع بالعربية',
    example: 'فرع المعادي',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameAr?: string;

  @ApiPropertyOptional({
    description: 'كود الفرع في ETA (مطلوب للإرسال للضرائب)',
    example: 'BR001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  etaBranchCode?: string;

  @ApiPropertyOptional({
    description: 'عنوان الفرع',
    example: 'شارع حسنين دسوقي، المعادي',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    description: 'المدينة',
    example: 'القاهرة',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'رقم هاتف الفرع',
    example: '0225167890',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'معرف مدير الفرع',
    example: 'uuid-of-manager',
  })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({
    description: 'هل هذا هو المقر الرئيسي',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isHeadquarters?: boolean;

  @ApiPropertyOptional({
    description: 'إعدادات الفرع (JSON)',
    example: { workingHours: { start: '09:00', end: '17:00' } },
  })
  @IsOptional()
  @IsJSON()
  settings?: Record<string, any>;
}
