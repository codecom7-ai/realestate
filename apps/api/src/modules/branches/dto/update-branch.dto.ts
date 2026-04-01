// ═══════════════════════════════════════════════════════════════
// Update Branch DTO - بيانات تحديث فرع
// ═══════════════════════════════════════════════════════════════

import { PartialType } from '@nestjs/swagger';
import { CreateBranchDto } from './create-branch.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBranchDto extends PartialType(CreateBranchDto) {
  @ApiPropertyOptional({
    description: 'حالة تفعيل الفرع',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
