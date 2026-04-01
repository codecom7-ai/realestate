// ═══════════════════════════════════════════════════════════════
// WhatsApp Module - وحدة واتساب
// ═══════════════════════════════════════════════════════════════

import { Module, forwardRef } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => ConversationsModule),
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
