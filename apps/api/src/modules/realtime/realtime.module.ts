// ═══════════════════════════════════════════════════════════════
// Realtime Module - WebSocket Realtime Communication
// ═══════════════════════════════════════════════════════════════

import { Module, OnModuleInit, Global } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

/**
 * Realtime Module
 * Provides WebSocket communication with JWT authentication and room management
 * 
 * Features:
 * - JWT-based authentication for WebSocket connections
 * - Organization isolation via rooms
 * - Branch-based filtering
 * - User-specific messaging
 * - Event emission API for other services
 * 
 * Supported Events:
 * - lead.updated: Lead status changes
 * - property.locked: Property lock/unlock notifications
 * - payment.received: Payment confirmations
 * - notification.new: Push notifications
 * - ai.response.chunk: AI streaming responses
 * - eta.receipt.validated: ETA receipt validation results
 * - document.ocr_completed: Document OCR processing completion
 * 
 * Note: JwtService is provided globally by AuthModule
 */
@Global()
@Module({
  imports: [
    // Prisma for user validation
    PrismaModule,
  ],
  providers: [RealtimeGateway, RealtimeService, JwtService],
  exports: [RealtimeService, RealtimeGateway],
})
export class RealtimeModule implements OnModuleInit {
  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * Initialize module and connect gateway to service
   */
  onModuleInit() {
    // Connect gateway reference to service for event emission
    this.realtimeService.setGateway(this.realtimeGateway);
  }
}
