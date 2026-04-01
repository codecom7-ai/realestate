// ═══════════════════════════════════════════════════════════════
// Automation Module - وحدة قواعد الأتمتة
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { RulesEngineService } from './rules-engine.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AutomationController],
  providers: [AutomationService, RulesEngineService],
  exports: [AutomationService, RulesEngineService],
})
export class AutomationModule {}
