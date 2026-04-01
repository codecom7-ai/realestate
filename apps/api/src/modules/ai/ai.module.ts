// ═══════════════════════════════════════════════════════════════
// AI Module - نظام تشغيل المكتب العقاري المصري
// AI-powered features including Copilot, Lead Scoring, and Data Extraction
// ═══════════════════════════════════════════════════════════════

import { Module, forwardRef } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { AIRouterService } from './ai-router.service';
import { DailyDigestCronService } from './cron/daily-digest.cron';
import { IntentDetectionService } from './services/intent-detection.service';
import { NextBestActionService } from './services/next-best-action.service';
import { ChurnRiskService } from './services/churn-risk.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CacheModule } from '../../cache/cache.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [AIController],
  providers: [
    AIService,
    AIRouterService,
    DailyDigestCronService,
    IntentDetectionService,
    NextBestActionService,
    ChurnRiskService,
  ],
  exports: [
    AIService,
    AIRouterService,
    DailyDigestCronService,
    IntentDetectionService,
    NextBestActionService,
    ChurnRiskService,
  ],
})
export class AIModule {}
