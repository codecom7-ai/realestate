// ═══════════════════════════════════════════════════════════════
// Communication DTOs - الرسائل والمحادثات
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
 * حالة المحادثة
 */
export enum ConversationStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
  PENDING = 'PENDING',
}

/**
 * قنوات التواصل
 */
export enum CommunicationChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  EMAIL = 'email',
}

/**
 * أسماء القنوات بالعربية
 */
export const CHANNEL_AR: Record<string, string> = {
  [CommunicationChannel.WHATSAPP]: 'واتساب',
  [CommunicationChannel.SMS]: 'SMS',
  [CommunicationChannel.EMAIL]: 'بريد إلكتروني',
};

/**
 * أسماء حالات المحادثة بالعربية
 */
export const CONVERSATION_STATUS_AR: Record<string, string> = {
  [ConversationStatus.OPEN]: 'مفتوح',
  [ConversationStatus.RESOLVED]: 'تم الحل',
  [ConversationStatus.PENDING]: 'في الانتظار',
};

/**
 * أسماء حالات الرسالة بالعربية
 */
export const MESSAGE_STATUS_AR: Record<string, string> = {
  [MessageStatus.PENDING]: 'قيد الإرسال',
  [MessageStatus.SENT]: 'تم الإرسال',
  [MessageStatus.DELIVERED]: 'تم التسليم',
  [MessageStatus.READ]: 'تمت القراءة',
  [MessageStatus.FAILED]: 'فشل الإرسال',
};

// ═══════════════════════════════════════════════════════════════
// WhatsApp Webhook DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * رسالة واردة من WhatsApp Webhook
 */
export class WhatsAppWebhookDto {
  @ApiProperty({
    description: 'معرف الرسالة من WhatsApp',
    example: 'wamid.HBgM...',
  })
  id: string;

  @ApiProperty({
    description: 'رقم هاتف المرسل',
    example: '201012345678',
  })
  from: string;

  @ApiProperty({
    description: 'نص الرسالة',
    example: 'مرحباً، أريد الاستفسار عن شقة',
  })
  text?: string;

  @ApiPropertyOptional({
    description: 'نوع الرسالة',
    example: 'text',
  })
  type?: string;

  @ApiPropertyOptional({
    description: 'رابط الصورة أو الوسائط',
    example: 'https://...',
  })
  mediaUrl?: string;

  @ApiPropertyOptional({
    description: 'نوع الوسائط',
    example: 'image',
  })
  mediaType?: string;

  @ApiPropertyOptional({
    description: 'وقت الرسالة',
    example: '1704067200',
  })
  timestamp?: string;

  @ApiPropertyOptional({
    description: 'اسم القالب (للرسائل القالبية)',
    example: 'hello_world',
  })
  templateName?: string;
}

/**
 * بيانات Webhook من WhatsApp
 */
export class WhatsAppWebhookPayloadDto {
  @ApiProperty({
    description: 'كائن الرسالة',
  })
  entry: {
    id: string;
    changes: {
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: {
          profile: {
            name?: string;
          };
          wa_id: string;
        }[];
        messages?: {
          id: string;
          from: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          image?: { id: string; mime_type: string; sha256: string };
          video?: { id: string; mime_type: string; sha256: string };
          audio?: { id: string; mime_type: string; sha256: string };
          document?: { id: string; mime_type: string; sha256: string; filename?: string };
          location?: { latitude: number; longitude: number; name?: string; address?: string };
          contacts?: {
            name: {
              formatted_name: string;
              first_name?: string;
              last_name?: string;
            };
            phones: { phone: string; type?: string; wa_id: string }[];
          }[];
        }[];
        statuses?: {
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
          errors?: { code: number; title: string }[];
        }[];
      };
    }[];
  }[];
}

// ═══════════════════════════════════════════════════════════════
// Message DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * إرسال رسالة جديدة
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'معرف المحادثة',
    example: 'uuid-1234',
  })
  conversationId: string;

  @ApiProperty({
    description: 'محتوى الرسالة',
    example: 'مرحباً بك، كيف يمكنني مساعدتك؟',
  })
  content: string;

  @ApiPropertyOptional({
    description: 'اسم القالب (للرسائل القالبية)',
    example: 'hello_world',
  })
  templateName?: string;

  @ApiPropertyOptional({
    description: 'معاملات القالب',
    example: ['أحمد', 'شقة'],
  })
  templateParams?: string[];
}

/**
 * محادثة في القائمة
 */
export class ConversationListItemDto {
  @ApiProperty({
    description: 'معرف المحادثة',
    example: 'uuid-1234',
  })
  id: string;

  @ApiProperty({
    description: 'القناة',
    enum: CommunicationChannel,
    example: CommunicationChannel.WHATSAPP,
  })
  channel: string;

  @ApiProperty({
    description: 'القناة بالعربية',
    example: 'واتساب',
  })
  channelAr: string;

  @ApiProperty({
    description: 'حالة المحادثة',
    enum: ConversationStatus,
    example: ConversationStatus.OPEN,
  })
  status: string;

  @ApiProperty({
    description: 'حالة المحادثة بالعربية',
    example: 'مفتوح',
  })
  statusAr: string;

  @ApiPropertyOptional({
    description: 'اسم العميل',
    example: 'أحمد محمد',
  })
  clientName?: string;

  @ApiPropertyOptional({
    description: 'رقم هاتف العميل',
    example: '01012345678',
  })
  clientPhone?: string;

  @ApiPropertyOptional({
    description: 'آخر رسالة',
    example: 'مرحباً، أريد الاستفسار عن شقة',
  })
  lastMessage?: string;

  @ApiPropertyOptional({
    description: 'وقت آخر رسالة',
    example: '2024-01-15T10:30:00Z',
  })
  lastMessageAt?: Date;

  @ApiProperty({
    description: 'عدد الرسائل غير المقروءة',
    example: 3,
  })
  unreadCount: number;

  @ApiPropertyOptional({
    description: 'اسم المسؤول',
    example: 'محمد علي',
  })
  assignedToName?: string;

  @ApiProperty({
    description: 'وقت الإنشاء',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}

/**
 * رسالة في المحادثة
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
    example: MessageDirection.INCOMING,
  })
  direction: string;

  @ApiProperty({
    description: 'حالة الرسالة',
    enum: MessageStatus,
    example: MessageStatus.DELIVERED,
  })
  status: string;

  @ApiProperty({
    description: 'حالة الرسالة بالعربية',
    example: 'تم التسليم',
  })
  statusAr: string;

  @ApiProperty({
    description: 'محتوى الرسالة',
    example: 'مرحباً، أريد الاستفسار عن شقة',
  })
  content: string;

  @ApiPropertyOptional({
    description: 'رابط الوسائط',
    example: 'https://r2.example.com/image.jpg',
  })
  mediaUrl?: string;

  @ApiPropertyOptional({
    description: 'نوع الوسائط',
    example: 'image',
  })
  mediaType?: string;

  @ApiPropertyOptional({
    description: 'وقت الإرسال',
    example: '2024-01-15T10:30:00Z',
  })
  sentAt?: Date;

  @ApiPropertyOptional({
    description: 'وقت التسليم',
    example: '2024-01-15T10:30:05Z',
  })
  deliveredAt?: Date;

  @ApiPropertyOptional({
    description: 'وقت القراءة',
    example: '2024-01-15T10:35:00Z',
  })
  readAt?: Date;

  @ApiProperty({
    description: 'وقت الإنشاء',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}

/**
 * تفاصيل محادثة كاملة
 */
export class ConversationDetailDto {
  @ApiProperty({
    description: 'معرف المحادثة',
    example: 'uuid-1234',
  })
  id: string;

  @ApiProperty({
    description: 'القناة',
    enum: CommunicationChannel,
  })
  channel: string;

  @ApiProperty({
    description: 'حالة المحادثة',
    enum: ConversationStatus,
  })
  status: string;

  @ApiPropertyOptional({
    description: 'معرف العميل',
  })
  clientId?: string;

  @ApiPropertyOptional({
    description: 'اسم العميل',
  })
  clientName?: string;

  @ApiPropertyOptional({
    description: 'رقم هاتف العميل',
  })
  clientPhone?: string;

  @ApiPropertyOptional({
    description: 'معرف الـ Lead',
  })
  leadId?: string;

  @ApiPropertyOptional({
    description: 'معرف المسؤول',
  })
  assignedToId?: string;

  @ApiPropertyOptional({
    description: 'اسم المسؤول',
  })
  assignedToName?: string;

  @ApiProperty({
    description: 'عدد الرسائل غير المقروءة',
  })
  unreadCount: number;

  @ApiProperty({
    description: 'الرسائل',
    type: [MessageDto],
  })
  messages: MessageDto[];

  @ApiProperty({
    description: 'وقت الإنشاء',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'وقت التحديث',
  })
  updatedAt: Date;
}

/**
 * استعلام المحادثات
 */
export class GetConversationsDto {
  @ApiPropertyOptional({
    description: 'فلترة حسب الحالة',
    enum: ConversationStatus,
  })
  status?: string;

  @ApiPropertyOptional({
    description: 'فلترة حسب القناة',
    enum: CommunicationChannel,
  })
  channel?: string;

  @ApiPropertyOptional({
    description: 'فلترة حسب المسؤول',
  })
  assignedToId?: string;

  @ApiPropertyOptional({
    description: 'بحث',
    example: 'أحمد',
  })
  search?: string;

  @ApiPropertyOptional({
    description: 'الصفحة',
    example: 1,
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'عدد النتائج',
    example: 20,
  })
  limit?: number;
}

/**
 * تحديث المحادثة
 */
export class UpdateConversationDto {
  @ApiPropertyOptional({
    description: 'حالة المحادثة',
    enum: ConversationStatus,
  })
  status?: string;

  @ApiPropertyOptional({
    description: 'معرف المسؤول',
  })
  assignedToId?: string;
}
