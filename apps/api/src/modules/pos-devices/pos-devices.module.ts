// ═══════════════════════════════════════════════════════════════
// POS Devices Module - نظام تشغيل المكتب العقاري المصري
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { PosDevicesController } from './pos-devices.controller';
import { PosDevicesService } from './pos-devices.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [PosDevicesController],
  providers: [PosDevicesService],
  exports: [PosDevicesService],
})
export class PosDevicesModule {}
