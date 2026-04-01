// ═══════════════════════════════════════════════════════════════
// Deals Module - وحدة الصفقات
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
