// ═══════════════════════════════════════════════════════════════
// ETA Module - وحدة الإيصالات الإلكترونية المصرية
// Professional Receipt v1.2
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ETAController } from './eta.controller';
import { ETAAuthService } from './eta-auth.service';
import { ETAUuidService } from './eta-uuid.service';
import { ETASignerService } from './eta-signer.service';
import { ETAReceiptService } from './eta-receipt.service';
import { ReceiptSubmissionWorker } from './workers/receipt-submission.worker';
import { PrismaModule } from '../../prisma/prisma.module';
import { CacheModule } from '../../cache/cache.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    ConfigModule,
  ],
  controllers: [ETAController],
  providers: [
    ETAAuthService,
    ETAUuidService,
    ETASignerService,
    ETAReceiptService,
    ReceiptSubmissionWorker,
  ],
  exports: [
    ETAAuthService,
    ETAUuidService,
    ETASignerService,
    ETAReceiptService,
  ],
})
export class ETAModule {}
