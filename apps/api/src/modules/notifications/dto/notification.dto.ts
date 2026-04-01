// ═══════════════════════════════════════════════════════════════
// Notifications DTOs - الإشعارات
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * أنواع الإشعارات
 */
export enum NotificationType {
  NEW_LEAD = 'new_lead',
  LEAD_ASSIGNED = 'lead_assigned',
  VIEWING_REMINDER = 'viewing_reminder',
  PAYMENT_RECEIVED = 'payment_received',
  CONTRACT_EXPIRING = 'contract_expiring',
  MESSAGE_RECEIVED = 'message_received',
  COMMISSION_APPROVED = 'commission_approved',
  STALE_LEAD = 'stale_lead',
  PROPERTY_INQUIRY = 'property_inquiry',
}

/**
 * قنوات الإشعارات
 */
export enum NotificationChannel {
  IN_APP = 'in_app',
  PUSH = 'push',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

/**
 * أسماء أنواع الإشعارات بالعربية
 */
export const NOTIFICATION_TYPE_AR: Record<string, string> = {
  [NotificationType.NEW_LEAD]: 'عميل محتمل جديد',
  [NotificationType.LEAD_ASSIGNED]: 'تم تعيين عميل محتمل لك',
  [NotificationType.VIEWING_REMINDER]: 'تذكير بالمعاينة',
  [NotificationType.PAYMENT_RECEIVED]: 'تم استلام دفعة',
  [NotificationType.CONTRACT_EXPIRING]: 'عقد على وشك الانتهاء',
  [NotificationType.MESSAGE_RECEIVED]: 'رسالة جديدة',
  [NotificationType.COMMISSION_APPROVED]: 'تمت الموافقة على العمولة',
  [NotificationType.STALE_LEAD]: 'عميل محتمل بدون متابعة',
  [NotificationType.PROPERTY_INQUIRY]: 'استفسار عن عقار',
};

/**
 * إرسال إشعار
 */
export class SendNotificationDto {
  @ApiProperty({
    description: 'معرف المستخدم',
    example: 'uuid-1234',
  })
  userId: string;

  @ApiProperty({
    description: 'نوع الإشعار',
    enum: NotificationType,
    example: NotificationType.NEW_LEAD,
  })
  type: string;

  @ApiProperty({
    description: 'عنوان الإشعار',
    example: 'عميل محتمل جديد',
  })
  title: string;

  @ApiProperty({
    description: 'محتوى الإشعار',
    example: 'تم استلام استفسار جديد من أحمد محمد',
  })
  body: string;

  @ApiPropertyOptional({
    description: 'بيانات إضافية',
    example: { leadId: 'uuid', clientId: 'uuid' },
  })
  data?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'قنوات الإرسال',
    example: ['in_app', 'push'],
  })
  channels?: string[];
}

/**
 * إشعار
 */
export class NotificationDto {
  @ApiProperty({
    description: 'معرف الإشعار',
    example: 'uuid-1234',
  })
  id: string;

  @ApiProperty({
    description: 'نوع الإشعار',
    enum: NotificationType,
  })
  type: string;

  @ApiProperty({
    description: 'نوع الإشعار بالعربية',
    example: 'عميل محتمل جديد',
  })
  typeAr: string;

  @ApiProperty({
    description: 'العنوان',
    example: 'عميل محتمل جديد',
  })
  title: string;

  @ApiProperty({
    description: 'المحتوى',
    example: 'تم استلام استفسار جديد',
  })
  body: string;

  @ApiPropertyOptional({
    description: 'بيانات إضافية',
  })
  data?: Record<string, any>;

  @ApiProperty({
    description: 'هل تمت القراءة',
    example: false,
  })
  isRead: boolean;

  @ApiPropertyOptional({
    description: 'وقت القراءة',
  })
  readAt?: Date;

  @ApiProperty({
    description: 'وقت الإنشاء',
  })
  createdAt: Date;
}

/**
 * استعلام الإشعارات
 */
export class GetNotificationsDto {
  @ApiPropertyOptional({
    description: 'فلترة حسب النوع',
    enum: NotificationType,
  })
  type?: string;

  @ApiPropertyOptional({
    description: 'الإشعارات غير المقروءة فقط',
    example: true,
  })
  unreadOnly?: boolean;

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
 * تسجيل جهاز للـ Push Notifications
 */
export class RegisterDeviceDto {
  @ApiProperty({
    description: 'FCM token',
    example: 'dXXXXXXXXX:APA91b...',
  })
  fcmToken: string;

  @ApiPropertyOptional({
    description: 'نوع الجهاز',
    example: 'web',
  })
  deviceType?: string;

  @ApiPropertyOptional({
    description: 'معرف الجهاز',
    example: 'browser-uuid',
  })
  deviceId?: string;
}

/**
 * إحصائيات الإشعارات
 */
export class NotificationStatsDto {
  @ApiProperty({
    description: 'إجمالي الإشعارات',
    example: 50,
  })
  total: number;

  @ApiProperty({
    description: 'غير مقروءة',
    example: 12,
  })
  unread: number;

  @ApiProperty({
    description: 'إحصائيات حسب النوع',
  })
  byType: Record<string, number>;
}
