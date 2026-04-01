// ═══════════════════════════════════════════════════════════════
// Notifications Controller - واجهة API الإشعارات
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import {
  GetNotificationsDto,
  NotificationDto,
  NotificationStatsDto,
  RegisterDeviceDto,
} from './dto/notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * الحصول على معرف المؤسسة (مكتب واحد فقط)
   */
  private getOrganizationId(): string {
    return this.configService.get<string>('app.orgId') || '';
  }

  @Get()
  @ApiOperation({
    summary: 'جلب إشعارات المستخدم',
    description: 'Returns paginated list of notifications for the current user.',
  })
  @ApiQuery({ name: 'type', required: false, description: 'فلترة حسب نوع الإشعار' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean, description: 'الإشعارات غير المقروءة فقط' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'قائمة الإشعارات',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid-1234',
            type: 'new_lead',
            typeAr: 'عميل محتمل جديد',
            title: 'عميل محتمل جديد',
            body: 'تم استلام استفسار جديد',
            isRead: false,
            createdAt: '2024-01-15T10:30:00Z',
          },
        ],
        meta: {
          total: 50,
          unread: 12,
        },
      },
    },
  })
  async getNotifications(
    @CurrentUser('sub') userId: string,
    @Query() dto: GetNotificationsDto,
  ) {
    return this.notificationsService.getNotifications(
      userId,
      dto,
      this.getOrganizationId(),
    );
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'عدد الإشعارات غير المقروءة',
    description: 'Returns the count of unread notifications for the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'عدد الإشعارات غير المقروءة',
    schema: {
      example: {
        success: true,
        data: {
          unread: 12,
          total: 50,
        },
      },
    },
  })
  async getUnreadCount(@CurrentUser('sub') userId: string): Promise<{ unread: number; total: number }> {
    const stats = await this.notificationsService.getStats(
      userId,
      this.getOrganizationId(),
    );
    return {
      unread: stats.unread,
      total: stats.total,
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'إحصائيات الإشعارات',
    description: 'Returns notification statistics for the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'إحصائيات الإشعارات',
    type: NotificationStatsDto,
  })
  async getStats(
    @CurrentUser('sub') userId: string,
  ): Promise<NotificationStatsDto> {
    return this.notificationsService.getStats(
      userId,
      this.getOrganizationId(),
    );
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'تحديد إشعار كمقروء',
    description: 'Marks a specific notification as read.',
  })
  @ApiParam({ name: 'id', description: 'معرف الإشعار' })
  @ApiResponse({
    status: 200,
    description: 'تم تحديد الإشعار كمقروء',
    type: NotificationDto,
  })
  @ApiResponse({
    status: 404,
    description: 'الإشعار غير موجود',
    schema: {
      example: {
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found',
          messageAr: 'الإشعار غير موجود',
        },
      },
    },
  })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<NotificationDto> {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'تحديد جميع الإشعارات كمقروءة',
    description: 'Marks all notifications as read for the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'تم تحديد جميع الإشعارات كمقروءة',
    schema: {
      example: {
        success: true,
        count: 12,
      },
    },
  })
  async markAllAsRead(
    @CurrentUser('sub') userId: string,
  ): Promise<{ success: boolean; count: number }> {
    return this.notificationsService.markAllAsRead(
      userId,
      this.getOrganizationId(),
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'حذف إشعار',
    description: 'Deletes a specific notification.',
  })
  @ApiParam({ name: 'id', description: 'معرف الإشعار' })
  @ApiResponse({
    status: 200,
    description: 'تم حذف الإشعار',
    schema: {
      example: {
        success: true,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'الإشعار غير موجود',
  })
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ success: boolean }> {
    return this.notificationsService.deleteNotification(id, userId);
  }

  @Post('register-device')
  @ApiOperation({
    summary: 'تسجيل جهاز للـ Push Notifications',
    description: 'Registers a device token for push notifications.',
  })
  @ApiResponse({
    status: 201,
    description: 'تم تسجيل الجهاز',
    schema: {
      example: {
        success: true,
      },
    },
  })
  async registerDevice(
    @CurrentUser('sub') userId: string,
    @Body() dto: RegisterDeviceDto,
  ): Promise<{ success: boolean }> {
    return this.notificationsService.registerDevice(userId, dto);
  }

  @Delete('unregister-device/:deviceId')
  @ApiOperation({
    summary: 'إلغاء تسجيل جهاز',
    description: 'Unregisters a device from push notifications.',
  })
  @ApiParam({ name: 'deviceId', description: 'معرف الجهاز' })
  @ApiResponse({
    status: 200,
    description: 'تم إلغاء تسجيل الجهاز',
    schema: {
      example: {
        success: true,
      },
    },
  })
  async unregisterDevice(
    @CurrentUser('sub') userId: string,
    @Param('deviceId') deviceId: string,
  ): Promise<{ success: boolean }> {
    return this.notificationsService.unregisterDevice(userId, deviceId);
  }
}
