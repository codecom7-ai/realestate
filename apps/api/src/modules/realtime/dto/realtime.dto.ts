// ═══════════════════════════════════════════════════════════════
// Realtime DTOs - Data Transfer Objects for WebSocket Events
// ═══════════════════════════════════════════════════════════════

import { IsString, IsOptional, IsObject, IsBoolean, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ═══════════════════════════════════════════════════════════════
// Base Event DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * Base WebSocket Event
 */
export class BaseWebSocketEvent {
  @ApiProperty({ description: 'Event type/name' })
  @IsString()
  event: string;

  @ApiProperty({ description: 'Timestamp of the event' })
  @IsNumber()
  timestamp: number;

  @ApiPropertyOptional({ description: 'Organization ID for isolation' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Branch ID for filtering' })
  @IsOptional()
  @IsString()
  branchId?: string;
}

/**
 * WebSocket Auth Payload
 */
export class WebSocketAuthPayload {
  @ApiProperty({ description: 'JWT token for authentication' })
  @IsString()
  token: string;
}

// ═══════════════════════════════════════════════════════════════
// Lead Event DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * Lead Updated Event Payload
 */
export class LeadUpdatedPayload {
  @ApiProperty({ description: 'Lead ID' })
  @IsString()
  leadId: string;

  @ApiPropertyOptional({ description: 'Previous status' })
  @IsOptional()
  @IsString()
  previousStatus?: string;

  @ApiProperty({ description: 'New status' })
  @IsString()
  newStatus: string;

  @ApiPropertyOptional({ description: 'Updated fields' })
  @IsOptional()
  @IsObject()
  changes?: Record<string, any>;

  @ApiPropertyOptional({ description: 'User who made the update' })
  @IsOptional()
  @IsString()
  updatedBy?: string;
}

/**
 * Lead Updated Event
 */
export class LeadUpdatedEvent extends BaseWebSocketEvent {
  event: 'lead.updated' = 'lead.updated';
  
  @ApiProperty({ type: LeadUpdatedPayload })
  @ValidateNested()
  @Type(() => LeadUpdatedPayload)
  data: LeadUpdatedPayload;
}

// ═══════════════════════════════════════════════════════════════
// Property Event DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * Property Locked Event Payload
 */
export class PropertyLockedPayload {
  @ApiProperty({ description: 'Property ID' })
  @IsString()
  propertyId: string;

  @ApiProperty({ description: 'Property name/title' })
  @IsString()
  propertyName: string;

  @ApiProperty({ description: 'User who locked the property' })
  @IsString()
  lockedBy: string;

  @ApiPropertyOptional({ description: 'User name who locked' })
  @IsOptional()
  @IsString()
  lockedByName?: string;

  @ApiProperty({ description: 'Lock expiration timestamp' })
  @IsNumber()
  lockedUntil: number;

  @ApiPropertyOptional({ description: 'Reason for lock' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Property Locked Event
 */
export class PropertyLockedEvent extends BaseWebSocketEvent {
  event: 'property.locked' = 'property.locked';

  @ApiProperty({ type: PropertyLockedPayload })
  @ValidateNested()
  @Type(() => PropertyLockedPayload)
  data: PropertyLockedPayload;
}

// ═══════════════════════════════════════════════════════════════
// Payment Event DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * Payment Received Event Payload
 */
export class PaymentReceivedPayload {
  @ApiProperty({ description: 'Payment ID' })
  @IsString()
  paymentId: string;

  @ApiProperty({ description: 'Deal/Contract ID' })
  @IsString()
  dealId: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Currency' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Payment method' })
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'Client ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Client name' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ description: 'Reference number' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;
}

/**
 * Payment Received Event
 */
export class PaymentReceivedEvent extends BaseWebSocketEvent {
  event: 'payment.received' = 'payment.received';

  @ApiProperty({ type: PaymentReceivedPayload })
  @ValidateNested()
  @Type(() => PaymentReceivedPayload)
  data: PaymentReceivedPayload;
}

// ═══════════════════════════════════════════════════════════════
// Notification Event DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * Notification Priority
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Notification New Event Payload
 */
export class NotificationNewPayload {
  @ApiProperty({ description: 'Notification ID' })
  @IsString()
  notificationId: string;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Notification title in Arabic' })
  @IsOptional()
  @IsString()
  titleAr?: string;

  @ApiPropertyOptional({ description: 'Notification body/message' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ description: 'Notification body in Arabic' })
  @IsOptional()
  @IsString()
  bodyAr?: string;

  @ApiProperty({ description: 'Notification type' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Priority level' })
  @IsOptional()
  @IsString()
  priority?: NotificationPriority;

  @ApiPropertyOptional({ description: 'Target user ID (null for broadcast)' })
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @ApiPropertyOptional({ description: 'Related entity type' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Related entity ID' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Additional data' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Notification New Event
 */
export class NotificationNewEvent extends BaseWebSocketEvent {
  event: 'notification.new' = 'notification.new';

  @ApiProperty({ type: NotificationNewPayload })
  @ValidateNested()
  @Type(() => NotificationNewPayload)
  data: NotificationNewPayload;
}

// ═══════════════════════════════════════════════════════════════
// AI Response Event DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * AI Response Chunk Event Payload
 */
export class AIResponseChunkPayload {
  @ApiProperty({ description: 'Conversation/Session ID' })
  @IsString()
  conversationId: string;

  @ApiProperty({ description: 'Message ID being streamed' })
  @IsString()
  messageId: string;

  @ApiProperty({ description: 'Chunk of text content' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Chunk index in sequence' })
  @IsNumber()
  chunkIndex: number;

  @ApiProperty({ description: 'Whether this is the final chunk' })
  @IsBoolean()
  isFinal: boolean;

  @ApiPropertyOptional({ description: 'Total chunks expected' })
  @IsOptional()
  @IsNumber()
  totalChunks?: number;
}

/**
 * AI Response Chunk Event
 */
export class AIResponseChunkEvent extends BaseWebSocketEvent {
  event: 'ai.response.chunk' = 'ai.response.chunk';

  @ApiProperty({ type: AIResponseChunkPayload })
  @ValidateNested()
  @Type(() => AIResponseChunkPayload)
  data: AIResponseChunkPayload;
}

// ═══════════════════════════════════════════════════════════════
// ETA Receipt Event DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * ETA Receipt Validation Status
 */
export enum ETAReceiptValidationStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  PENDING = 'pending',
  ERROR = 'error',
}

/**
 * ETA Receipt Validated Event Payload
 */
export class ETAReceiptValidatedPayload {
  @ApiProperty({ description: 'Receipt submission ID' })
  @IsString()
  submissionId: string;

  @ApiProperty({ description: 'ETA receipt UUID' })
  @IsString()
  receiptUuid: string;

  @ApiProperty({ description: 'Validation status' })
  @IsString()
  status: ETAReceiptValidationStatus;

  @ApiPropertyOptional({ description: 'Receipt total amount' })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Seller name' })
  @IsOptional()
  @IsString()
  sellerName?: string;

  @ApiPropertyOptional({ description: 'Buyer name' })
  @IsOptional()
  @IsString()
  buyerName?: string;

  @ApiPropertyOptional({ description: 'Validation errors' })
  @IsOptional()
  @IsObject()
  errors?: Array<{ code: string; message: string }>;

  @ApiPropertyOptional({ description: 'Raw ETA response' })
  @IsOptional()
  @IsObject()
  rawResponse?: Record<string, any>;
}

/**
 * ETA Receipt Validated Event
 */
export class ETAReceiptValidatedEvent extends BaseWebSocketEvent {
  event: 'eta.receipt.validated' = 'eta.receipt.validated';

  @ApiProperty({ type: ETAReceiptValidatedPayload })
  @ValidateNested()
  @Type(() => ETAReceiptValidatedPayload)
  data: ETAReceiptValidatedPayload;
}

// ═══════════════════════════════════════════════════════════════
// Document OCR Event DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * Document OCR Status
 */
export enum DocumentOCRStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  PROCESSING = 'processing',
}

/**
 * Document OCR Completed Event Payload
 */
export class DocumentOCRCompletedPayload {
  @ApiProperty({ description: 'Document ID' })
  @IsString()
  documentId: string;

  @ApiProperty({ description: 'OCR processing status' })
  @IsString()
  status: DocumentOCRStatus;

  @ApiPropertyOptional({ description: 'Extracted text content' })
  @IsOptional()
  @IsString()
  extractedText?: string;

  @ApiPropertyOptional({ description: 'Structured data extracted' })
  @IsOptional()
  @IsObject()
  structuredData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Confidence score (0-100)' })
  @IsOptional()
  @IsNumber()
  confidence?: number;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'Processing duration in ms' })
  @IsOptional()
  @IsNumber()
  processingTimeMs?: number;
}

/**
 * Document OCR Completed Event
 */
export class DocumentOCRCompletedEvent extends BaseWebSocketEvent {
  event: 'document.ocr_completed' = 'document.ocr_completed';

  @ApiProperty({ type: DocumentOCRCompletedPayload })
  @ValidateNested()
  @Type(() => DocumentOCRCompletedPayload)
  data: DocumentOCRCompletedPayload;
}

// ═══════════════════════════════════════════════════════════════
// Union Types for All Events
// ═══════════════════════════════════════════════════════════════

/**
 * All supported WebSocket event types
 */
export type WebSocketEvent =
  | LeadUpdatedEvent
  | PropertyLockedEvent
  | PaymentReceivedEvent
  | NotificationNewEvent
  | AIResponseChunkEvent
  | ETAReceiptValidatedEvent
  | DocumentOCRCompletedEvent;

/**
 * All supported event names
 */
export type WebSocketEventName =
  | 'lead.updated'
  | 'property.locked'
  | 'payment.received'
  | 'notification.new'
  | 'ai.response.chunk'
  | 'eta.receipt.validated'
  | 'document.ocr_completed';

/**
 * Event name to event type mapping
 */
export interface EventMap {
  'lead.updated': LeadUpdatedPayload;
  'property.locked': PropertyLockedPayload;
  'payment.received': PaymentReceivedPayload;
  'notification.new': NotificationNewPayload;
  'ai.response.chunk': AIResponseChunkPayload;
  'eta.receipt.validated': ETAReceiptValidatedPayload;
  'document.ocr_completed': DocumentOCRCompletedPayload;
}

// ═══════════════════════════════════════════════════════════════
// Room Management DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * Room Join DTO
 */
export class JoinRoomDto {
  @ApiProperty({ description: 'Room name to join' })
  @IsString()
  room: string;
}

/**
 * Room Leave DTO
 */
export class LeaveRoomDto {
  @ApiProperty({ description: 'Room name to leave' })
  @IsString()
  room: string;
}

/**
 * Room Info
 */
export class RoomInfo {
  @ApiProperty({ description: 'Room name' })
  name: string;

  @ApiProperty({ description: 'Number of connected clients' })
  clientCount: number;

  @ApiPropertyOptional({ description: 'Room type' })
  @IsOptional()
  @IsString()
  type?: 'organization' | 'branch' | 'user' | 'entity';
}

// ═══════════════════════════════════════════════════════════════
// Client Info DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * Authenticated Socket Client Info
 */
export class SocketClientInfo {
  @ApiProperty({ description: 'Socket ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User role' })
  role: string;

  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiPropertyOptional({ description: 'Connected rooms' })
  @IsOptional()
  rooms?: string[];

  @ApiPropertyOptional({ description: 'Connection timestamp' })
  @IsOptional()
  @IsNumber()
  connectedAt?: number;
}
