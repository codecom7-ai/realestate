// ═══════════════════════════════════════════════════════════════
// Viewings Module - وحدة المعاينات
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { ViewingsService } from './viewings.service';
import { ViewingsController } from './viewings.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ViewingsController],
  providers: [ViewingsService],
  exports: [ViewingsService],
})
export class ViewingsModule {}
