// ═══════════════════════════════════════════════════════════════
// Payment Schedules Module - وحدة جداول الأقساط
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { PaymentSchedulesController } from './payment-schedules.controller';
import { PaymentSchedulesService } from './payment-schedules.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [PaymentSchedulesController],
  providers: [PaymentSchedulesService],
  exports: [PaymentSchedulesService],
})
export class PaymentSchedulesModule {}
