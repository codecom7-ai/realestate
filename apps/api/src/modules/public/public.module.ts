// ═══════════════════════════════════════════════════════════════
// Public Module
// وحدة الواجهة العامة (بدون مصادقة)
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}
