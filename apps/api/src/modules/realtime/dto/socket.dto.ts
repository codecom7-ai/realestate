// ═══════════════════════════════════════════════════════════════
// Socket DTOs - Data Transfer Objects for Socket.io Events
// ═══════════════════════════════════════════════════════════════

import { IsString, IsOptional, IsBoolean, IsNumber, IsObject } from 'class-validator';
import { LeadStage } from '@realestate/shared-types';

// ─────────────────────────────────────────────────────────────────
// Subscribe/Unsubscribe DTOs
// ─────────────────────────────────────────────────────────────────

export class SubscribeEntityDto {
  @IsString()
  entityType: string;

  @IsString()
  entityId: string;
}

export class TypingDto {
  @IsString()
  conversationId: string;
}

export class MarkNotificationReadDto {
  @IsString()
  notificationId: string;
}

// ─────────────────────────────────────────────────────────────────
// Lead Event Payloads
// ─────────────────────────────────────────────────────────────────

export class LeadCreatedPayload {
  lead: Record<string, unknown>;
  
  @IsOptional()
  client?: Record<string, unknown>;
}

export class LeadUpdatedPayload {
  @IsString()
  leadId: string;

  changes: Record<string, unknown>;

  @IsString()
  updatedBy: string;
}

export class LeadStageChangedPayload {
  @IsString()
  leadId: string;

  previousStage: LeadStage;

  newStage: LeadStage;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  client?: { firstName: string; lastName: string };
}

export class LeadAssignedPayload {
  @IsString()
  leadId: string;

  @IsOptional()
  @IsString()
  previousAssigneeId?: string;

  @IsString()
  newAssigneeId: string;

  @IsString()
  assigneeName: string;
}

// ─────────────────────────────────────────────────────────────────
// Property Event Payloads
// ─────────────────────────────────────────────────────────────────

export class PropertyCreatedPayload {
  property: Record<string, unknown>;
}

export class PropertyUpdatedPayload {
  @IsString()
  propertyId: string;

  changes: Record<string, unknown>;

  @IsString()
  updatedBy: string;
}

export class PropertyLockedPayload {
  @IsString()
  propertyId: string;

  @IsString()
  dealId: string;

  lockType: 'temporary' | 'confirmed';

  @IsString()
  lockedBy: string;
}

export class PropertyUnlockedPayload {
  @IsString()
  propertyId: string;

  @IsString()
  dealId: string;

  @IsString()
  unlockedBy: string;
}

// ─────────────────────────────────────────────────────────────────
// Notification Event Payloads
// ─────────────────────────────────────────────────────────────────

export class NotificationNewPayload {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  createdAt: Date;
}

export class NotificationReadPayload {
  @IsString()
  notificationId: string;

  readAt: Date;
}

// ─────────────────────────────────────────────────────────────────
// Message Event Payloads
// ─────────────────────────────────────────────────────────────────

export class MessageReceivedPayload {
  @IsString()
  messageId: string;

  @IsString()
  conversationId: string;

  @IsString()
  content: string;

  @IsString()
  contentType: string;

  @IsOptional()
  sender?: { firstName: string; lastName: string };

  receivedAt: Date;
}

export class MessageSentPayload {
  @IsString()
  messageId: string;

  @IsString()
  conversationId: string;

  status: 'sent' | 'delivered' | 'read';
}

export class ConversationUpdatedPayload {
  @IsString()
  conversationId: string;

  @IsString()
  status: string;

  @IsNumber()
  unreadCount: number;
}

// ─────────────────────────────────────────────────────────────────
// Payment Event Payloads
// ─────────────────────────────────────────────────────────────────

export class PaymentReceivedPayload {
  @IsString()
  paymentId: string;

  @IsString()
  dealId: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  method: string;

  paidAt: Date;
}

export class PaymentPendingPayload {
  @IsString()
  paymentId: string;

  @IsString()
  dealId: string;

  @IsNumber()
  amount: number;

  dueDate: Date;
}

export class PaymentFailedPayload {
  @IsString()
  paymentId: string;

  @IsString()
  dealId: string;

  @IsString()
  reason: string;
}

// ─────────────────────────────────────────────────────────────────
// Commission Event Payloads
// ─────────────────────────────────────────────────────────────────

export class CommissionCalculatedPayload {
  @IsString()
  commissionId: string;

  @IsString()
  dealId: string;

  @IsString()
  userId: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;
}

export class CommissionApprovedPayload {
  @IsString()
  commissionId: string;

  @IsString()
  dealId: string;

  @IsString()
  userId: string;

  @IsString()
  approvedBy: string;

  @IsNumber()
  amount: number;
}

// ─────────────────────────────────────────────────────────────────
// AI Event Payloads
// ─────────────────────────────────────────────────────────────────

export class AIResponseChunkPayload {
  @IsString()
  requestId: string;

  @IsString()
  chunk: string;

  @IsNumber()
  index: number;
}

export class AIResponseCompletePayload {
  @IsString()
  requestId: string;

  @IsString()
  fullResponse: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────
// ETA Event Payloads
// ─────────────────────────────────────────────────────────────────

export class ETAReceiptValidatedPayload {
  @IsString()
  receiptId: string;

  @IsString()
  uuid: string;

  @IsString()
  longId: string;

  @IsString()
  receiptNumber: string;
}

export class ETAReceiptRejectedPayload {
  @IsString()
  receiptId: string;

  @IsString()
  error: string;
}

// ─────────────────────────────────────────────────────────────────
// Document Event Payloads
// ─────────────────────────────────────────────────────────────────

export class DocumentUploadedPayload {
  @IsString()
  documentId: string;

  @IsString()
  fileName: string;

  @IsNumber()
  fileSize: number;

  @IsString()
  uploadedBy: string;
}

export class DocumentOCRCompletedPayload {
  @IsString()
  documentId: string;

  @IsObject()
  extractedData: Record<string, unknown>;

  @IsNumber()
  confidence: number;
}

// ─────────────────────────────────────────────────────────────────
// System Event Payloads
// ─────────────────────────────────────────────────────────────────

export class SystemMaintenancePayload {
  @IsString()
  message: string;

  @IsString()
  messageAr: string;

  @IsOptional()
  scheduledAt?: Date;

  @IsOptional()
  @IsNumber()
  duration?: number;
}

export class UserTypingPayload {
  @IsString()
  conversationId: string;

  @IsString()
  userId: string;

  @IsBoolean()
  isTyping: boolean;
}

export class UserOnlinePayload {
  @IsString()
  userId: string;

  @IsBoolean()
  isOnline: boolean;

  @IsOptional()
  lastSeen?: Date;
}
