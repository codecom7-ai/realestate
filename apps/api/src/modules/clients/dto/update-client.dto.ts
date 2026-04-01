// ═══════════════════════════════════════════════════════════════
// Update Client DTO - بيانات تحديث العميل
// ═══════════════════════════════════════════════════════════════

import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';

export class UpdateClientDto extends PartialType(
  OmitType(CreateClientDto, ['phone'] as const),
) {
  // phone لا يمكن تغييره لأنه المفتاح الأساسي للبحث
}
