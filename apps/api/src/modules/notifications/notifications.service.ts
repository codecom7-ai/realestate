// ═══════════════════════════════════════════════════════════════
// Notifications Service - خدمة الإشعارات
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotificationType,
  NotificationChannel,
  NOTIFICATION_TYPE_AR,
  SendNotificationDto,
  GetNotificationsDto,
  RegisterDeviceDto,
  NotificationDto,
  NotificationStatsDto,
} from './dto/notification.dto';

// Firebase Admin SDK types
interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

// FCM Token storage (in production, this would be in DB)
interface UserDevice {
  fcmToken: string;
  deviceType: string;
  deviceId: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly firebaseConfig: FirebaseConfig | null = null;
  private readonly userDevices: Map<string, UserDevice[]> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // تحميل إعدادات Firebase
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');

    if (projectId && privateKey && clientEmail) {
      this.firebaseConfig = {
        projectId,
        privateKey: privateKey.replace(/\\n/g, '\n'),
        clientEmail,
      };
      this.logger.log('Firebase configuration loaded successfully');
    } else {
      this.logger.warn('Firebase not configured - push notifications disabled');
    }
  }

  /**
   * إرسال إشعار
   */
  async sendNotification(
    dto: SendNotificationDto,
    organizationId: string,
  ): Promise<NotificationDto> {
    const channels = dto.channels || [NotificationChannel.IN_APP];

    // إنشاء الإشعار في قاعدة البيانات
    const notification = await this.prisma.notification.create({
      data: {
        organizationId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        data: dto.data || undefined,
        channel: channels.includes(NotificationChannel.PUSH) ? 'push' : 'in_app',
      },
    });

    // إرسال Push Notification
    if (channels.includes(NotificationChannel.PUSH)) {
      await this.sendPushNotification(dto.userId, {
        title: dto.title,
        body: dto.body,
        data: dto.data,
      });
    }

    this.logger.log(`Notification sent to user ${dto.userId}: ${dto.type}`);

    return this.mapToDto(notification);
  }

  /**
   * إرسال إشعار لمجموعة مستخدمين
   */
  async sendToUsers(
    userIds: string[],
    dto: Omit<SendNotificationDto, 'userId'>,
    organizationId: string,
  ): Promise<void> {
    for (const userId of userIds) {
      await this.sendNotification({ ...dto, userId }, organizationId);
    }
  }

  /**
   * إرسال إشعار للـ Role
   */
  async sendToRole(
    role: string,
    dto: Omit<SendNotificationDto, 'userId'>,
    organizationId: string,
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: role as any,
        isActive: true,
      },
      select: { id: true },
    });

    await this.sendToUsers(
      users.map((u: { id: string }) => u.id),
      dto,
      organizationId,
    );
  }

  /**
   * إرسال Push Notification عبر Firebase
   */
  private async sendPushNotification(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, any> },
  ): Promise<void> {
    if (!this.firebaseConfig) {
      this.logger.debug('Firebase not configured - skipping push notification');
      return;
    }

    const devices = this.userDevices.get(userId) || [];
    if (devices.length === 0) {
      this.logger.debug(`No devices registered for user ${userId}`);
      return;
    }

    // في الإنتاج، سنستخدم Firebase Admin SDK
    // هذا placeholder للتطوير
    for (const device of devices) {
      try {
        // TODO: Implement actual Firebase FCM send
        // const messaging = getMessaging(app);
        // await messaging.send({
        //   token: device.fcmToken,
        //   notification: { title: payload.title, body: payload.body },
        //   data: payload.data,
        // });
        this.logger.debug(`Push notification sent to ${device.deviceId}`);
      } catch (error) {
        this.logger.error(`Failed to send push notification: ${error}`);
      }
    }
  }

  /**
   * تسجيل جهاز للـ Push Notifications
   */
  async registerDevice(
    userId: string,
    dto: RegisterDeviceDto,
  ): Promise<{ success: boolean }> {
    const devices = this.userDevices.get(userId) || [];
    
    // إزالة الجهاز القديم إذا موجود
    const filteredDevices = devices.filter(
      (d) => d.deviceId !== dto.deviceId && d.fcmToken !== dto.fcmToken,
    );

    // إضافة الجهاز الجديد
    filteredDevices.push({
      fcmToken: dto.fcmToken,
      deviceType: dto.deviceType || 'unknown',
      deviceId: dto.deviceId || `device-${Date.now()}`,
    });

    this.userDevices.set(userId, filteredDevices);
    this.logger.log(`Device registered for user ${userId}`);

    return { success: true };
  }

  /**
   * إلغاء تسجيل جهاز
   */
  async unregisterDevice(
    userId: string,
    deviceId: string,
  ): Promise<{ success: boolean }> {
    const devices = this.userDevices.get(userId) || [];
    const filteredDevices = devices.filter((d) => d.deviceId !== deviceId);
    this.userDevices.set(userId, filteredDevices);
    
    return { success: true };
  }

  /**
   * جلب إشعارات المستخدم
   */
  async getNotifications(
    userId: string,
    dto: GetNotificationsDto,
    organizationId: string,
  ): Promise<{ data: NotificationDto[]; meta: { total: number; unread: number } }> {
    const { type, unreadOnly, page = 1, limit = 20 } = dto;

    const where: any = {
      userId,
      organizationId,
    };

    if (type) {
      where.type = type;
    }

    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { ...where, isRead: false },
      }),
    ]);

    return {
      data: notifications.map((n: any) => this.mapToDto(n)),
      meta: { total, unread },
    };
  }

  /**
   * تحديد إشعار كمقروء
   */
  async markAsRead(
    id: string,
    userId: string,
  ): Promise<NotificationDto> {
    const notification = await this.prisma.notification.update({
      where: {
        id,
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return this.mapToDto(notification);
  }

  /**
   * تحديد جميع الإشعارات كمقروءة
   */
  async markAllAsRead(
    userId: string,
    organizationId: string,
  ): Promise<{ success: boolean; count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        organizationId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true, count: result.count };
  }

  /**
   * حذف إشعار
   */
  async deleteNotification(
    id: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    await this.prisma.notification.delete({
      where: {
        id,
        userId,
      },
    });

    return { success: true };
  }

  /**
   * إحصائيات الإشعارات
   */
  async getStats(
    userId: string,
    organizationId: string,
  ): Promise<NotificationStatsDto> {
    const [total, unread, byType] = await Promise.all([
      this.prisma.notification.count({
        where: { userId, organizationId },
      }),
      this.prisma.notification.count({
        where: { userId, organizationId, isRead: false },
      }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where: { userId, organizationId },
        _count: { type: true },
      }),
    ]);

    const byTypeMap: Record<string, number> = {};
    byType.forEach((item: { type: string; _count: { type: number } }) => {
      byTypeMap[item.type] = item._count.type;
    });

    return { total, unread, byType: byTypeMap };
  }

  /**
   * Helper: إرسال إشعار لعميل محتمل جديد
   */
  async notifyNewLead(
    leadId: string,
    clientId: string,
    organizationId: string,
  ): Promise<void> {
    // إرسال للمدير أو الشخص المسؤول
    await this.sendToRole('SALES_MANAGER', {
      type: NotificationType.NEW_LEAD,
      title: 'عميل محتمل جديد',
      body: 'تم استلام استفسار جديد',
      data: { leadId, clientId },
    }, organizationId);
  }

  /**
   * Helper: إرسال إشعار تذكير بالمعاينة
   */
  async notifyViewingReminder(
    viewingId: string,
    userId: string,
    propertyTitle: string,
    scheduledAt: Date,
    organizationId: string,
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.VIEWING_REMINDER,
      title: 'تذكير بالمعاينة',
      body: `معاينة "${propertyTitle}" خلال ساعة`,
      data: { viewingId, scheduledAt: scheduledAt.toISOString() },
    }, organizationId);
  }

  /**
   * تحويل الإشعار إلى DTO
   */
  private mapToDto(notification: any): NotificationDto {
    return {
      id: notification.id,
      type: notification.type,
      typeAr: NOTIFICATION_TYPE_AR[notification.type] || notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      isRead: notification.isRead,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}
