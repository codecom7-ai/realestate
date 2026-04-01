// ═══════════════════════════════════════════════════════════════
// Conversation DTOs - المحادثات والرسائل
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * حالة المحادثة
 */
export enum ConversationStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
  PENDING = 'PENDING',
}

/**
 * اتجاه الرسالة
 */
export enum MessageDirection {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

/**
 * حالة الرسالة
 */
export enum MessageStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

/**
 * حالة المحادثة بالعربية
 */
export const CONVERSATION_STATUS_AR: Record<ConversationStatus, string> = {
  OPEN: 'مفتوحة',
  RESOLVED: 'تم الحل',
  PENDING: 'قيد الانتظار',
};

/**
 * اتجاه الرسالة بالعربية
 */
export const MESSAGE_DIRECTION_AR: Record<MessageDirection, string> = {
  INCOMING: 'واردة',
  OUTGOING: 'صادرة',
};

/**
 * حالة الرسالة بالعربية
 */
export const MESSAGE_STATUS_AR: Record<MessageStatus, string> = {
  PENDING: 'قيد الإرسال',
  SENT: 'تم الإرسال',
  DELIVERED: 'تم التسليم',
  READ: 'تمت القراءة',
  FAILED: 'فشل الإرسال',
};

/**
 * قناة المحادثة
 */
export enum ConversationChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  EMAIL = 'email',
}

/**
 * قناة المحادثة بالعربية
 */
export const CHANNEL_AR: Record<string, string> = {
  whatsapp: 'واتساب',
  sms: 'رسائل نصية',
  email: 'بريد إلكتروني',
};

// ═══════════════════════════════════════════════════════════════
// Conversation DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * DTO للحصول على المحادثات
 */
export class GetConversationsDto {
  @ApiPropertyOptional({
    description: 'الحالة',
    enum: ConversationStatus,
    example: 'OPEN',
  })
  status?: ConversationStatus;

  @ApiPropertyOptional({
    description: 'معرف العميل',
    example: 'uuid-client-id',
  })
  clientId?: string;

  @ApiPropertyOptional({
    description: 'معرف العميل المحتمل',
    example: 'uuid-lead-id',
  })
  leadId?: string;

  @ApiPropertyOptional({
    description: 'معرف المسؤول',
    example: 'uuid-user-id',
  })
  assignedToId?: string;

  @ApiPropertyOptional({
    description: 'القناة',
    example: 'whatsapp',
  })
  channel?: string;

  @ApiPropertyOptional({
    description: 'رقم الصفحة',
    example: 1,
    default: 1,
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'عدد النتائج في الصفحة',
    example: 20,
    default: 20,
  })
  limit?: number;
}

/**
 * DTO لإنشاء محادثة
 */
export class CreateConversationDto {
  @ApiPropertyOptional({
    description: 'معرف العميل',
    example: 'uuid-client-id',
  })
  clientId?: string;

  @ApiPropertyOptional({
    description: 'معرف العميل المحتمل',
    example: 'uuid-lead-id',
  })
  leadId?: string;

  @ApiPropertyOptional({
    description: 'معرف المسؤول',
    example: 'uuid-user-id',
  })
  assignedToId?: string;

  @ApiProperty({
    description: 'القناة',
    example: 'whatsapp',
    default: 'whatsapp',
  })
  channel?: string = 'whatsapp';

  @ApiPropertyOptional({
    description: 'المعرف الخارجي (مثل رقم الهاتف)',
    example: '+201012345678',
  })
  externalId?: string;
}

/**
 * DTO لتحديث المحادثة
 */
export class UpdateConversationDto {
  @ApiPropertyOptional({
    description: 'الحالة',
    enum: ConversationStatus,
    example: 'RESOLVED',
  })
  status?: ConversationStatus;

  @ApiPropertyOptional({
    description: 'معرف المسؤول',
    example: 'uuid-user-id',
  })
  assignedToId?: string;
}

/**
 * DTO للمحادثة في الاستجابة
 */
export class ConversationResponseDto {
  @ApiProperty({ description: 'معرف المحادثة' })
  id: string;

  @ApiPropertyOptional({ description: 'معرف العميل' })
  clientId?: string;

  @ApiPropertyOptional({ description: 'اسم العميل' })
  clientName?: string;

  @ApiPropertyOptional({ description: 'هاتف العميل' })
  clientPhone?: string;

  @ApiPropertyOptional({ description: 'معرف العميل المحتمل' })
  leadId?: string;

  @ApiPropertyOptional({ description: 'معرف المسؤول' })
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'اسم المسؤول' })
  assignedToName?: string;

  @ApiProperty({ description: 'القناة' })
  channel: string;

  @ApiProperty({ description: 'القناة بالعربية' })
  channelAr: string;

  @ApiPropertyOptional({ description: 'المعرف الخارجي' })
  externalId?: string;

  @ApiProperty({ description: 'الحالة', enum: ConversationStatus })
  status: ConversationStatus;

  @ApiProperty({ description: 'الحالة بالعربية' })
  statusAr: string;

  @ApiProperty({ description: 'عدد الرسائل غير المقروءة' })
  unreadCount: number;

  @ApiPropertyOptional({ description: 'آخر رسالة' })
  lastMessage?: string;

  @ApiPropertyOptional({ description: 'تاريخ آخر رسالة' })
  lastMessageAt?: Date;

  @ApiProperty({ description: 'تاريخ الإنشاء' })
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// Message DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * DTO للحصول على الرسائل
 */
export class GetMessagesDto {
  @ApiPropertyOptional({
    description: 'رقم الصفحة',
    example: 1,
    default: 1,
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'عدد النتائج في الصفحة',
    example: 50,
    default: 50,
  })
  limit?: number;
}

/**
 * DTO لإرسال رسالة
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'معرف المحادثة',
    example: 'uuid-conversation-id',
  })
  conversationId: string;

  @ApiProperty({
    description: 'محتوى الرسالة',
    example: 'مرحباً، كيف يمكنني مساعدتك؟',
  })
  content: string;

  @ApiPropertyOptional({
    description: 'رابط الوسائط',
    example: 'https://example.com/image.jpg',
  })
  mediaUrl?: string;

  @ApiPropertyOptional({
    description: 'نوع الوسائط',
    example: 'image',
  })
  mediaType?: string;

  @ApiPropertyOptional({
    description: 'اسم القالب (لرسائل WhatsApp القالبية)',
    example: 'hello_template',
  })
  templateName?: string;

  @ApiPropertyOptional({
    description: 'معاملات القالب',
    example: { name: 'أحمد' },
  })
  templateParams?: Record<string, any>;
}

/**
 * DTO للرسالة في الاستجابة
 */
export class MessageResponseDto {
  @ApiProperty({ description: 'معرف الرسالة' })
  id: string;

  @ApiProperty({ description: 'معرف المحادثة' })
  conversationId: string;

  @ApiProperty({ description: 'الاتجاه', enum: MessageDirection })
  direction: MessageDirection;

  @ApiProperty({ description: 'الاتجاه بالعربية' })
  directionAr: string;

  @ApiProperty({ description: 'الحالة', enum: MessageStatus })
  status: MessageStatus;

  @ApiProperty({ description: 'الحالة بالعربية' })
  statusAr: string;

  @ApiProperty({ description: 'المحتوى' })
  content: string;

  @ApiPropertyOptional({ description: 'رابط الوسائط' })
  mediaUrl?: string;

  @ApiPropertyOptional({ description: 'نوع الوسائط' })
  mediaType?: string;

  @ApiPropertyOptional({ description: 'تاريخ الإرسال' })
  sentAt?: Date;

  @ApiPropertyOptional({ description: 'تاريخ التسليم' })
  deliveredAt?: Date;

  @ApiPropertyOptional({ description: 'تاريخ القراءة' })
  readAt?: Date;

  @ApiPropertyOptional({ description: 'سبب الفشل' })
  failureReason?: string;

  @ApiPropertyOptional({ description: 'معرف المرسل' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'اسم المرسل' })
  createdByName?: string;

  @ApiProperty({ description: 'تاريخ الإنشاء' })
  createdAt: Date;
}

/**
 * DTO لعدم قراءة المحادثات
 */
export class MarkAsReadDto {
  @ApiProperty({
    description: 'معرف المحادثة',
    example: 'uuid-conversation-id',
  })
  conversationId: string;
}
