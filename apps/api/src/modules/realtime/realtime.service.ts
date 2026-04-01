// ═══════════════════════════════════════════════════════════════
// Realtime Service - Event Emission Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  LeadUpdatedPayload,
  PropertyLockedPayload,
  PaymentReceivedPayload,
  NotificationNewPayload,
  AIResponseChunkPayload,
  ETAReceiptValidatedPayload,
  DocumentOCRCompletedPayload,
  WebSocketEventName,
  EventMap,
  NotificationPriority,
  ETAReceiptValidationStatus,
  DocumentOCRStatus,
} from './dto/realtime.dto';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Internal event names for event-emitter
 */
export const REALTIME_EVENTS = {
  LEAD_UPDATED: 'realtime.lead.updated',
  PROPERTY_LOCKED: 'realtime.property.locked',
  PAYMENT_RECEIVED: 'realtime.payment.received',
  NOTIFICATION_NEW: 'realtime.notification.new',
  AI_RESPONSE_CHUNK: 'realtime.ai.response.chunk',
  ETA_RECEIPT_VALIDATED: 'realtime.eta.receipt.validated',
  DOCUMENT_OCR_COMPLETED: 'realtime.document.ocr_completed',
} as const;

/**
 * Event payload with organization context
 */
export interface EventPayloadWithContext<T> {
  payload: T;
  organizationId: string;
  branchId?: string;
  targetUserId?: string;
}

/**
 * Realtime Service
 * Provides a clean API for other services to emit realtime events
 */
@Injectable()
export class RealtimeService implements OnModuleInit {
  private readonly logger = new Logger(RealtimeService.name);
  private gateway: RealtimeGateway | null = null;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Initialize and get gateway reference
   */
  onModuleInit() {
    this.logger.log('Realtime Service initialized');
  }

  /**
   * Set gateway reference (called by module)
   */
  setGateway(gateway: RealtimeGateway) {
    this.gateway = gateway;
    this.logger.log('Realtime Gateway connected to service');
  }

  /**
   * Ensure gateway is available
   */
  private ensureGateway(): RealtimeGateway {
    if (!this.gateway) {
      throw new Error('RealtimeGateway not initialized');
    }
    return this.gateway;
  }

  // ═══════════════════════════════════════════════════════════════
  // Lead Events
  // ═══════════════════════════════════════════════════════════════

  /**
   * Emit lead updated event
   */
  async emitLeadUpdated(
    organizationId: string,
    payload: LeadUpdatedPayload,
    options?: { branchId?: string; targetUserId?: string },
  ): Promise<void> {
    const eventPayload: EventPayloadWithContext<LeadUpdatedPayload> = {
      payload,
      organizationId,
      ...options,
    };

    // Emit internal event for logging/auditing
    this.eventEmitter.emit(REALTIME_EVENTS.LEAD_UPDATED, eventPayload);

    // Emit via WebSocket
    this.emitEvent('lead.updated', payload, organizationId, options);
    
    this.logger.debug(`Lead updated: ${payload.leadId} in org ${organizationId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // Property Events
  // ═══════════════════════════════════════════════════════════════

  /**
   * Emit property locked event
   */
  async emitPropertyLocked(
    organizationId: string,
    payload: PropertyLockedPayload,
    options?: { branchId?: string },
  ): Promise<void> {
    const eventPayload: EventPayloadWithContext<PropertyLockedPayload> = {
      payload,
      organizationId,
      ...options,
    };

    this.eventEmitter.emit(REALTIME_EVENTS.PROPERTY_LOCKED, eventPayload);

    this.emitEvent('property.locked', payload, organizationId, options);
    
    this.logger.debug(`Property locked: ${payload.propertyId} by ${payload.lockedBy}`);
  }

  /**
   * Emit property unlocked event (uses same structure)
   */
  async emitPropertyUnlocked(
    organizationId: string,
    payload: Omit<PropertyLockedPayload, 'lockedUntil'> & { unlockedBy: string; unlockedAt: number },
    options?: { branchId?: string },
  ): Promise<void> {
    const unlockedPayload: PropertyLockedPayload = {
      ...payload,
      lockedBy: payload.unlockedBy,
      lockedUntil: 0, // Indicates unlocked
    };

    this.emitEvent('property.locked', unlockedPayload, organizationId, options);
    
    this.logger.debug(`Property unlocked: ${payload.propertyId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // Payment Events
  // ═══════════════════════════════════════════════════════════════

  /**
   * Emit payment received event
   */
  async emitPaymentReceived(
    organizationId: string,
    payload: PaymentReceivedPayload,
    options?: { branchId?: string; targetUserId?: string },
  ): Promise<void> {
    const eventPayload: EventPayloadWithContext<PaymentReceivedPayload> = {
      payload,
      organizationId,
      ...options,
    };

    this.eventEmitter.emit(REALTIME_EVENTS.PAYMENT_RECEIVED, eventPayload);

    this.emitEvent('payment.received', payload, organizationId, options);
    
    this.logger.debug(
      `Payment received: ${payload.paymentId} amount ${payload.amount} ${payload.currency}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Notification Events
  // ═══════════════════════════════════════════════════════════════

  /**
   * Emit new notification event
   */
  async emitNotification(
    organizationId: string,
    payload: NotificationNewPayload,
    options?: { branchId?: string; targetUserId?: string },
  ): Promise<void> {
    const eventPayload: EventPayloadWithContext<NotificationNewPayload> = {
      payload,
      organizationId,
      ...options,
    };

    this.eventEmitter.emit(REALTIME_EVENTS.NOTIFICATION_NEW, eventPayload);

    // If target user specified, send only to that user
    if (options?.targetUserId) {
      this.ensureGateway().emitToUser(options.targetUserId, 'notification.new', payload);
    } else {
      this.emitEvent('notification.new', payload, organizationId, options);
    }
    
    this.logger.debug(`Notification sent: ${payload.notificationId} type ${payload.type}`);
  }

  /**
   * Helper to create and emit a notification
   */
  async sendNotification(
    organizationId: string,
    options: {
      title: string;
      titleAr?: string;
      body?: string;
      bodyAr?: string;
      type: string;
      priority?: NotificationPriority;
      targetUserId?: string;
      branchId?: string;
      entityType?: string;
      entityId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    const payload: NotificationNewPayload = {
      notificationId: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: options.title,
      titleAr: options.titleAr,
      body: options.body,
      bodyAr: options.bodyAr,
      type: options.type,
      targetUserId: options.targetUserId,
      entityType: options.entityType,
      entityId: options.entityId,
      metadata: options.metadata,
    };

    await this.emitNotification(organizationId, payload, {
      targetUserId: options.targetUserId,
      branchId: options.branchId,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // AI Response Events
  // ═══════════════════════════════════════════════════════════════

  /**
   * Emit AI response chunk (for streaming)
   */
  async emitAIResponseChunk(
    organizationId: string,
    payload: AIResponseChunkPayload,
    options?: { targetUserId?: string },
  ): Promise<void> {
    const eventPayload: EventPayloadWithContext<AIResponseChunkPayload> = {
      payload,
      organizationId,
      ...options,
    };

    this.eventEmitter.emit(REALTIME_EVENTS.AI_RESPONSE_CHUNK, eventPayload);

    // AI responses should go to specific user
    if (options?.targetUserId) {
      this.ensureGateway().emitToUser(options.targetUserId, 'ai.response.chunk', payload);
    } else {
      this.emitEvent('ai.response.chunk', payload, organizationId);
    }
  }

  /**
   * Stream AI response helper
   */
  async *streamAIResponse(
    organizationId: string,
    conversationId: string,
    messageId: string,
    contentStream: AsyncGenerator<string>,
    targetUserId: string,
  ): AsyncGenerator<void> {
    let chunkIndex = 0;

    for await (const chunk of contentStream) {
      const payload: AIResponseChunkPayload = {
        conversationId,
        messageId,
        content: chunk,
        chunkIndex,
        isFinal: false,
      };

      await this.emitAIResponseChunk(organizationId, payload, { targetUserId });
      chunkIndex++;
      yield;
    }

    // Send final chunk
    const finalPayload: AIResponseChunkPayload = {
      conversationId,
      messageId,
      content: '',
      chunkIndex,
      isFinal: true,
      totalChunks: chunkIndex,
    };

    await this.emitAIResponseChunk(organizationId, finalPayload, { targetUserId });
  }

  // ═══════════════════════════════════════════════════════════════
  // ETA Receipt Events
  // ═══════════════════════════════════════════════════════════════

  /**
   * Emit ETA receipt validated event
   */
  async emitETAReceiptValidated(
    organizationId: string,
    payload: ETAReceiptValidatedPayload,
    options?: { branchId?: string; targetUserId?: string },
  ): Promise<void> {
    const eventPayload: EventPayloadWithContext<ETAReceiptValidatedPayload> = {
      payload,
      organizationId,
      ...options,
    };

    this.eventEmitter.emit(REALTIME_EVENTS.ETA_RECEIPT_VALIDATED, eventPayload);

    this.emitEvent('eta.receipt.validated', payload, organizationId, options);
    
    this.logger.debug(
      `ETA receipt validated: ${payload.submissionId} status ${payload.status}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Document OCR Events
  // ═══════════════════════════════════════════════════════════════

  /**
   * Emit document OCR completed event
   */
  async emitDocumentOCRCompleted(
    organizationId: string,
    payload: DocumentOCRCompletedPayload,
    options?: { branchId?: string; targetUserId?: string },
  ): Promise<void> {
    const eventPayload: EventPayloadWithContext<DocumentOCRCompletedPayload> = {
      payload,
      organizationId,
      ...options,
    };

    this.eventEmitter.emit(REALTIME_EVENTS.DOCUMENT_OCR_COMPLETED, eventPayload);

    this.emitEvent('document.ocr_completed', payload, organizationId, options);
    
    this.logger.debug(
      `Document OCR completed: ${payload.documentId} status ${payload.status}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Utility Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generic event emission helper
   */
  private emitEvent<T extends WebSocketEventName>(
    event: T,
    data: EventMap[T],
    organizationId: string,
    options?: { branchId?: string; targetUserId?: string },
  ): void {
    try {
      const gateway = this.ensureGateway();

      // If target user specified, emit to user only
      if (options?.targetUserId) {
        gateway.emitToUser(options.targetUserId, event, data);
        return;
      }

      // If branch specified, emit to branch
      if (options?.branchId) {
        gateway.emitToBranch(options.branchId, event, data);
        return;
      }

      // Default: emit to entire organization
      gateway.emitToOrganization(organizationId, event, data);
    } catch (error) {
      this.logger.error(`Failed to emit ${event}: ${error.message}`);
    }
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    try {
      return this.ensureGateway().isUserOnline(userId);
    } catch {
      return false;
    }
  }

  /**
   * Get online users in organization
   */
  getOnlineUsers(organizationId: string) {
    try {
      return this.ensureGateway().getOnlineUsersInOrganization(organizationId);
    } catch {
      return [];
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    try {
      return this.ensureGateway().getConnectedClientsCount();
    } catch {
      return 0;
    }
  }

  /**
   * Disconnect user (for security events, etc.)
   */
  async disconnectUser(userId: string, reason?: string): Promise<number> {
    try {
      return this.ensureGateway().disconnectUser(userId, reason);
    } catch (error) {
      this.logger.error(`Failed to disconnect user ${userId}: ${error.message}`);
      return 0;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Event Listeners (for internal event processing)
  // ═══════════════════════════════════════════════════════════════

  @OnEvent(REALTIME_EVENTS.LEAD_UPDATED)
  private handleLeadUpdatedEvent(event: EventPayloadWithContext<LeadUpdatedPayload>) {
    this.logger.debug(
      `Internal: Lead ${event.payload.leadId} updated - Status: ${event.payload.newStatus}`,
    );
  }

  @OnEvent(REALTIME_EVENTS.PROPERTY_LOCKED)
  private handlePropertyLockedEvent(event: EventPayloadWithContext<PropertyLockedPayload>) {
    this.logger.debug(
      `Internal: Property ${event.payload.propertyId} locked by ${event.payload.lockedBy}`,
    );
  }

  @OnEvent(REALTIME_EVENTS.PAYMENT_RECEIVED)
  private handlePaymentReceivedEvent(event: EventPayloadWithContext<PaymentReceivedPayload>) {
    this.logger.debug(
      `Internal: Payment ${event.payload.paymentId} received - Amount: ${event.payload.amount}`,
    );
  }
}
