// ═══════════════════════════════════════════════════════════════
// Conversations DTOs - المحادثات والرسائل
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

/**
 * قنوات المحادثة
 */
export enum ConversationChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  EMAIL = 'email',
}

/**
 * حالة المحادثة
 */
export enum ConversationStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

/**
 * اتجاه الرسالة
 */
export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

/**
 * نوع محتوى الرسالة
 */
export enum MessageContentType {
  TEXT = 'text',
  IMAGE = 'image',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  VIDEO = 'video',
  LOCATION = 'location',
  TEMPLATE = 'template',
}

/**
 * حالة الرسالة
 */
export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

/**
 * استعلام قائمة المحادثات
 */
export class GetConversationsDto {
  @ApiPropertyOptional({
    description: 'القناة',
    enum: ConversationChannel,
    example: 'whatsapp',
  })
  channel?: ConversationChannel;

  @ApiPropertyOptional({
    description: 'الحالة',
    enum: ConversationStatus,
    example: 'active',
  })
  status?: ConversationStatus;

  @ApiPropertyOptional({
    description: 'معرف العميل',
    example: 'uuid-1234',
  })
  clientId?: string;

  @ApiPropertyOptional({
    description: 'معرف العميل المحتمل',
    example: 'uuid-5678',
  })
  leadId?: string;

  @ApiPropertyOptional({
    description: 'البحث في المحتوى',
    example: 'شقة',
  })
  search?: string;

  @ApiPropertyOptional({
    description: 'رقم الصفحة',
    example: 1,
    default: 1,
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'عدد العناصر',
    example: 20,
    default: 20,
  })
  limit?: number;
}

/**
 * إنشاء محادثة جديدة
 */
export class CreateConversationDto {
  @ApiPropertyOptional({
    description: 'معرف العميل',
    example: 'uuid-1234',
  })
  clientId?: string;

  @ApiPropertyOptional({
    description: 'معرف العميل المحتمل',
    example: 'uuid-5678',
  })
  leadId?: string;

  @ApiProperty({
    description: 'القناة',
    enum: ConversationChannel,
    example: 'whatsapp',
  })
  channel: ConversationChannel;

  @ApiProperty({
    description: 'المعرف الخارجي (رقم الهاتف)',
    example: '201012345678',
  })
  externalId: string;
}

/**
 * تحديث المحادثة
 */
export class UpdateConversationDto extends PartialType(CreateConversationDto) {
  @ApiPropertyOptional({
    description: 'الحالة',
    enum: ConversationStatus,
    example: 'closed',
  })
  status?: ConversationStatus;
}

/**
 * رسالة
 */
export class MessageDto {
  @ApiProperty({
    description: 'معرف الرسالة',
    example: 'uuid-1234',
  })
  id: string;

  @ApiProperty({
    description: 'اتجاه الرسالة',
    enum: MessageDirection,
  })
  direction: MessageDirection;

  @ApiProperty({
    description: 'محتوى الرسالة',
    example: 'مرحباً، أريد الاستفسار عن الشقة',
  })
  content: string;

  @ApiProperty({
    description: 'نوع المحتوى',
    enum: MessageContentType,
  })
  contentType: MessageContentType;

  @ApiPropertyOptional({
    description: 'رابط الوسائط',
    example: 'https://example.com/image.jpg',
  })
  mediaUrl?: string;

  @ApiProperty({
    description: 'حالة الرسالة',
    enum: MessageStatus,
  })
  status: MessageStatus;

  @ApiPropertyOptional({
    description: 'المعرف الخارجي',
    example: 'wamid.HBgMMjAxMDEyMzQ1Njc4',
  })
  externalId?: string;

  @ApiProperty({
    description: 'تاريخ الإرسال',
    example: '2024-01-15T10:30:00Z',
  })
  sentAt: Date;

  @ApiProperty({
    description: 'تاريخ الإنشاء',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}

/**
 * محادثة مع رسائل
 */
export class ConversationWithMessagesDto {
  @ApiProperty({
    description: 'معرف المحادثة',
    example: 'uuid-1234',
  })
  id: string;

  @ApiProperty({
    description: 'القناة',
    enum: ConversationChannel,
  })
  channel: ConversationChannel;

  @ApiProperty({
    description: 'الحالة',
    enum: ConversationStatus,
  })
  status: ConversationStatus;

  @ApiProperty({
    description: 'المعرف الخارجي',
    example: '201012345678',
  })
  externalId: string;

  @ApiPropertyOptional({
    description: 'العميل المرتبط',
  })
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };

  @ApiPropertyOptional({
    description: 'العميل المحتمل المرتبط',
  })
  lead?: {
    id: string;
    stage: string;
    client?: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };

  @ApiProperty({
    description: 'عدد الرسائل غير المقروءة',
    example: 3,
  })
  unreadCount: number;

  @ApiProperty({
    description: 'تاريخ آخر رسالة',
    example: '2024-01-15T10:30:00Z',
  })
  lastMessageAt: Date;

  @ApiProperty({
    description: 'آخر رسالة',
  })
  lastMessage?: MessageDto;

  @ApiProperty({
    description: 'الرسائل',
    type: [MessageDto],
  })
  messages?: MessageDto[];

  @ApiProperty({
    description: 'تاريخ الإنشاء',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}

/**
 * قائمة المحادثات
 */
export class ConversationListDto {
  @ApiProperty({
    description: 'المحادثات',
    type: [ConversationWithMessagesDto],
  })
  data: ConversationWithMessagesDto[];

  @ApiProperty({
    description: 'معلومات التقسيم',
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * إرسال رسالة في محادثة
 */
export class SendMessageInConversationDto {
  @ApiProperty({
    description: 'محتوى الرسالة',
    example: 'شكراً لتواصلكم، سنتواصل معكم قريباً',
  })
  content: string;

  @ApiPropertyOptional({
    description: 'نوع المحتوى',
    enum: MessageContentType,
    default: 'text',
  })
  contentType?: MessageContentType;

  @ApiPropertyOptional({
    description: 'رابط الوسائط',
    example: 'https://example.com/image.jpg',
  })
  mediaUrl?: string;
}

/**
 * عدد المحادثات حسب الحالة
 */
export class ConversationCountsDto {
  @ApiProperty({
    description: 'المحادثات النشطة',
    example: 15,
  })
  active: number;

  @ApiProperty({
    description: 'المحادثات المغلقة',
    example: 45,
  })
  closed: number;

  @ApiProperty({
    description: 'المحادثات المؤرشفة',
    example: 20,
  })
  archived: number;

  @ApiProperty({
    description: 'إجمالي الرسائل غير المقروءة',
    example: 8,
  })
  totalUnread: number;
}
