// ═══════════════════════════════════════════════════════════════
// Update User DTO
// ═══════════════════════════════════════════════════════════════

import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email'] as const),
) {
  // Additional update-only fields
  isActive?: boolean;
  brokerLicenseExp?: Date;
  brokerClassification?: string;
}
