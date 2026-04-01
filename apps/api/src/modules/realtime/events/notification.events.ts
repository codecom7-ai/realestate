// @ts-nocheck
// ═══════════════════════════════════════════════════════════════
// Notification Events - أحداث الإشعارات
// ═══════════════════════════════════════════════════════════════

import { SocketEventDataMap } from '@realestate/shared-types';

/**
 * أنواع أحداث الإشعارات
 * Notification event types
 */
export type NotificationEventType = 
  | 'notification.new'
  | 'notification.read';

/**
 * حدث إشعار جديد
 * New notification event
 */
export interface NotificationNewEvent {
  type: 'notification.new';
  data: SocketEventDataMap['notification.new'];
  timestamp: Date;
  userId: string;
  organizationId: string;
}

/**
 * حدث قراءة إشعار
 * Notification read event
 */
export interface NotificationReadEvent {
  type: 'notification.read';
  data: SocketEventDataMap['notification.read'];
  timestamp: Date;
  userId: string;
  organizationId: string;
}

/**
 * جميع أحداث الإشعارات
 * All notification events union type
 */
export type NotificationEvent = 
  | NotificationNewEvent 
  | NotificationReadEvent;

/**
 * أنواع الإشعارات المتاحة
 * Available notification types
 */
export type NotificationType =
  | 'NEW_LEAD'
  | 'LEAD_ASSIGNED'
  | 'LEAD_STAGE_CHANGED'
  | 'VIEWING_REMINDER'
  | 'VIEWING_CONFIRMED'
  | 'PROPERTY_LOCKED'
  | 'PROPERTY_UNLOCKED'
  | 'PAYMENT_RECEIVED'
  | 'COMMISSION_APPROVED'
  | 'DOCUMENT_UPLOADED'
  | 'ETA_RECEIPT'
  | 'SYSTEM_ALERT';

/**
 * أسماء أنواع الإشعارات بالعربية
 * Notification type names in Arabic
 */
export const NOTIFICATION_TYPE_AR: Record<NotificationType, string> = {
  NEW_LEAD: 'عميل محتمل جديد',
  LEAD_ASSIGNED: 'تعيين عميل',
  LEAD_STAGE_CHANGED: 'تغيير مرحلة العميل',
  VIEWING_REMINDER: 'تذكير بالمعاينة',
  VIEWING_CONFIRMED: 'تأكيد المعاينة',
  PROPERTY_LOCKED: 'حجز عقار',
  PROPERTY_UNLOCKED: 'إلغاء حجز عقار',
  PAYMENT_RECEIVED: 'استلام دفعة',
  COMMISSION_APPROVED: 'اعتماد عمولة',
  DOCUMENT_UPLOADED: 'رفع مستند',
  ETA_RECEIPT: 'إيصال إلكتروني',
  SYSTEM_ALERT: 'تنبيه النظام',
};

/**
 * أولوية الإشعار
 * Notification priority
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * أسماء الأولويات بالعربية
 * Priority names in Arabic
 */
export const NOTIFICATION_PRIORITY_AR: Record<NotificationPriority, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
};

/**
 * إنشاء إشعار جديد
 * Create new notification
 */
export function createNotificationPayload(
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>
): SocketEventDataMap['notification.new'] {
  return {
    id: crypto.randomUUID(),
    type,
    title,
    body,
    data,
    createdAt: new Date(),
  };
}
