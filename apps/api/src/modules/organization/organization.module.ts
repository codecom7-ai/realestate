// ═══════════════════════════════════════════════════════════════
// Organization Module - وحدة المنظمة/المكتب
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';

import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
