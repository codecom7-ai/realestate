// @ts-nocheck
// ═══════════════════════════════════════════════════════════════
// Inbox Events - أحداث صندوق الوارد (المحادثات والرسائل)
// ═══════════════════════════════════════════════════════════════

import { SocketEventDataMap } from '@realestate/shared-types';

/**
 * أنواع أحداث صندوق الوارد
 * Inbox event types
 */
export type InboxEventType = 
  | 'message.received'
  | 'message.sent'
  | 'conversation.updated';

/**
 * حدث استلام رسالة
 * Message received event
 */
export interface MessageReceivedEvent {
  type: 'message.received';
  data: SocketEventDataMap['message.received'];
  timestamp: Date;
  userId: string;
  organizationId: string;
}

/**
 * حدث إرسال رسالة
 * Message sent event
 */
export interface MessageSentEvent {
  type: 'message.sent';
  data: SocketEventDataMap['message.sent'];
  timestamp: Date;
  userId: string;
  organizationId: string;
}

/**
 * حدث تحديث محادثة
 * Conversation updated event
 */
export interface ConversationUpdatedEvent {
  type: 'conversation.updated';
  data: SocketEventDataMap['conversation.updated'];
  timestamp: Date;
  userId: string;
  organizationId: string;
}

/**
 * جميع أحداث صندوق الوارد
 * All inbox events union type
 */
export type InboxEvent = 
  | MessageReceivedEvent 
  | MessageSentEvent 
  | ConversationUpdatedEvent;

/**
 * حالة الرسالة
 * Message status
 */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * أسماء حالات الرسالة بالعربية
 * Message status names in Arabic
 */
export const MESSAGE_STATUS_AR: Record<MessageStatus, string> = {
  pending: 'قيد الإرسال',
  sent: 'تم الإرسال',
  delivered: 'تم التسليم',
  read: 'تمت القراءة',
  failed: 'فشل الإرسال',
};

/**
 * نوع المحتوى
 * Content type
 */
export type MessageContentType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';

/**
 * أسماء أنواع المحتوى بالعربية
 * Content type names in Arabic
 */
export const CONTENT_TYPE_AR: Record<MessageContentType, string> = {
  text: 'نص',
  image: 'صورة',
  video: 'فيديو',
  audio: 'صوت',
  document: 'مستند',
  location: 'موقع',
};

/**
 * قناة المحادثة
 * Conversation channel
 */
export type ConversationChannel = 'whatsapp' | 'sms' | 'email' | 'in_app' | 'telegram';

/**
 * أسماء القنوات بالعربية
 * Channel names in Arabic
 */
export const CHANNEL_AR: Record<ConversationChannel, string> = {
  whatsapp: 'واتساب',
  sms: 'رسائل نصية',
  email: 'بريد إلكتروني',
  in_app: 'داخل التطبيق',
  telegram: 'تيليجرام',
};

/**
 * حالة المحادثة
 * Conversation status
 */
export type ConversationStatus = 'active' | 'closed' | 'archived' | 'pending';

/**
 * أسماء حالات المحادثة بالعربية
 * Conversation status names in Arabic
 */
export const CONVERSATION_STATUS_AR: Record<ConversationStatus, string> = {
  active: 'نشطة',
  closed: 'مغلقة',
  archived: 'مؤرشفة',
  pending: 'معلقة',
};

/**
 * إنشاء رسالة إشعار لرسالة جديدة
 * Create notification message for new message
 */
export function createNewMessageNotification(
  senderName: string,
  contentPreview: string,
  channel: ConversationChannel
): { title: string; body: string; titleAr: string; bodyAr: string } {
  const truncatedContent = contentPreview.length > 50 
    ? `${contentPreview.substring(0, 50)}...` 
    : contentPreview;

  return {
    title: `New Message via ${CHANNEL_AR[channel]}`,
    titleAr: `رسالة جديدة عبر ${CHANNEL_AR[channel]}`,
    body: `${senderName}: ${truncatedContent}`,
    bodyAr: `${senderName}: ${truncatedContent}`,
  };
}

/**
 * إنشاء payload لرسالة مستلمة
 * Create payload for received message
 */
export function createMessageReceivedPayload(
  messageId: string,
  conversationId: string,
  content: string,
  contentType: MessageContentType,
  _sender?: { firstName: string; lastName: string }
): SocketEventDataMap['message.received'] {
  return {
    messageId,
    conversationId,
    content,
    contentType,
    receivedAt: new Date(),
  };
}

/**
 * إنشاء payload لتحديث محادثة
 * Create payload for conversation update
 */
export function createConversationUpdatedPayload(
  conversationId: string,
  _status: ConversationStatus,
  _unreadCount: number
): SocketEventDataMap['conversation.updated'] {
  return {
    conversationId,
  };
}
