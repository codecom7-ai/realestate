import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBranchDto {
  @ApiProperty({ description: 'اسم الفرع' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'اسم الفرع بالعربية' })
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiPropertyOptional({ description: 'كود الفرع في ETA' })
  @IsOptional()
  @IsString()
  etaBranchCode?: string;

  @ApiPropertyOptional({ description: 'العنوان' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'المدينة' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'الهاتف' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'معرف المدير' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ description: 'المقر الرئيسي', default: false })
  @IsOptional()
  @IsBoolean()
  isHeadquarters?: boolean;
}

export class UpdateBranchDto extends PartialType(CreateBranchDto) {
  @ApiPropertyOptional({ description: 'نشط' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GetBranchesDto {
  @ApiPropertyOptional({ description: 'رقم الصفحة', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'عدد العناصر', default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'نشط فقط' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
