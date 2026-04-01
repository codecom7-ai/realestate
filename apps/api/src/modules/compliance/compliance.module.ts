// ═══════════════════════════════════════════════════════════════
// Compliance Module - نظام تشغيل المكتب العقاري المصري
// Phase 5.02 — Compliance Center (578/2025)
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { ComplianceCronService } from './cron/compliance.cron';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ComplianceController],
  providers: [ComplianceService, ComplianceCronService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
