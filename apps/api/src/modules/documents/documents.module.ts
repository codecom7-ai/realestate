// ═══════════════════════════════════════════════════════════════
// Documents Module - نظام تشغيل المكتب العقاري المصري
// Phase 5.01 — Document Vault + OCR
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
