// ═══════════════════════════════════════════════════════════════
// WhatsApp DTOs - التكامل مع واتساب بيزنس API
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * نوع الرسالة الواردة من واتساب
 */
export enum WhatsAppMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  VIDEO = 'video',
  LOCATION = 'location',
  CONTACTS = 'contacts',
  INTERACTIVE = 'interactive',
}

/**
 * حالة الرسالة
 */
export enum WhatsAppMessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

/**
 * Webhook من واتساب - رسالة واردة
 */
export class WhatsAppWebhookDto {
  @ApiProperty({
    description: 'كائن الرسالة من واتساب',
  })
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name?: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: WhatsAppMessageType;
          text?: {
            body: string;
            preview_url?: boolean;
          };
          image?: {
            id: string;
            mime_type: string;
            sha256: string;
            caption?: string;
          };
          document?: {
            id: string;
            mime_type: string;
            sha256: string;
            filename?: string;
            caption?: string;
          };
          location?: {
            latitude: number;
            longitude: number;
            name?: string;
            address?: string;
          };
        }>;
        statuses?: Array<{
          id: string;
          status: WhatsAppMessageStatus;
          timestamp: string;
          recipient_id: string;
          conversation?: {
            id: string;
            origin: {
              type: string;
            };
          };
          errors?: Array<{
            code: number;
            title: string;
            message: string;
          }>;
        }>;
      };
      field: string;
    }>;
  }>;
}

/**
 * إرسال رسالة نصية
 */
export class SendTextMessageDto {
  @ApiProperty({
    description: 'رقم الهاتف المستلم (مع رمز الدولة)',
    example: '201012345678',
  })
  to: string;

  @ApiProperty({
    description: 'نص الرسالة',
    example: 'مرحباً بك في مكتبنا العقاري',
  })
  text: string;

  @ApiPropertyOptional({
    description: 'معرف المحادثة (اختياري)',
    example: 'uuid-1234',
  })
  conversationId?: string;
}

/**
 * إرسال رسالة من قالب
 */
export class SendTemplateMessageDto {
  @ApiProperty({
    description: 'رقم الهاتف المستلم (مع رمز الدولة)',
    example: '201012345678',
  })
  to: string;

  @ApiProperty({
    description: 'اسم القالب',
    example: 'hello_world',
  })
  templateName: string;

  @ApiProperty({
    description: 'كود اللغة',
    example: 'ar',
  })
  languageCode: string;

  @ApiPropertyOptional({
    description: 'المتغيرات للقالب',
    example: ['أحمد', 'شقة'],
  })
  components?: Array<{
    type: 'header' | 'body' | 'button';
    parameters: Array<{
      type: 'text' | 'image' | 'document' | 'video';
      text?: string;
      image?: { id: string };
      document?: { id: string };
      video?: { id: string };
    }>;
  }>;

  @ApiPropertyOptional({
    description: 'معرف المحادثة (اختياري)',
    example: 'uuid-1234',
  })
  conversationId?: string;
}

/**
 * إرسال صورة
 */
export class SendImageMessageDto {
  @ApiProperty({
    description: 'رقم الهاتف المستلم',
    example: '201012345678',
  })
  to: string;

  @ApiProperty({
    description: 'رابط الصورة أو معرف الوسائط',
    example: 'https://example.com/image.jpg',
  })
  image: string;

  @ApiProperty({
    description: 'هل الرابط أم معرف وسائط',
    example: true,
  })
  isUrl: boolean;

  @ApiPropertyOptional({
    description: 'وصف الصورة',
    example: 'صورة العقار',
  })
  caption?: string;

  @ApiPropertyOptional({
    description: 'معرف المحادثة (اختياري)',
  })
  conversationId?: string;
}

/**
 * استجابة إرسال رسالة
 */
export class SendMessageResponseDto {
  @ApiProperty({
    description: 'معرف الرسالة من واتساب',
    example: 'wamid.HBgMMjAxMDEyMzQ1Njc4',
  })
  messageId: string;

  @ApiProperty({
    description: 'معرف الرسالة في النظام',
    example: 'uuid-1234',
  })
  id: string;

  @ApiProperty({
    description: 'حالة الرسالة',
    example: 'sent',
  })
  status: string;

  @ApiProperty({
    description: 'معرف المحادثة',
    example: 'uuid-5678',
  })
  conversationId: string;
}

/**
 * التحقق من Webhook
 */
export class WebhookVerificationDto {
  @ApiProperty({
    description: 'وضع التحقق',
    example: 'subscribe',
  })
  'hub.mode': string;

  @ApiProperty({
    description: 'رمز التحقق',
    example: 'challenge_token',
  })
  'hub.challenge': string;

  @ApiProperty({
    description: 'رمز التحقق من التطبيق',
    example: 'verify_token_123',
  })
  'hub.verify_token': string;
}
