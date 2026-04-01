// ═══════════════════════════════════════════════════════════════
// Branch DTOs
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'فرع مدينة نصر' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'فرع مدينة نصر' })
  @IsString()
  @IsOptional()
  nameAr?: string;

  @ApiPropertyOptional({ example: 'BR001', description: 'ETA branch code - إلزامي للفواتير الإلكترونية' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  etaBranchCode?: string;

  @ApiPropertyOptional({ example: 'شارع عباس العقاد' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'القاهرة' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: '0224156789' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'User ID of branch manager' })
  @IsString()
  @IsOptional()
  managerId?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isHeadquarters?: boolean;
}

export class UpdateBranchDto {
  @ApiPropertyOptional({ example: 'فرع مدينة نصر' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'فرع مدينة نصر' })
  @IsString()
  @IsOptional()
  nameAr?: string;

  @ApiPropertyOptional({ example: 'BR001' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  etaBranchCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  managerId?: string;
}

export class MoveUserDto {
  @ApiProperty({ description: 'User ID to move' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Current branch ID' })
  @IsString()
  fromBranchId: string;

  @ApiProperty({ description: 'Target branch ID' })
  @IsString()
  toBranchId: string;
}
