// @ts-nocheck
// ═══════════════════════════════════════════════════════════════
// Realtime Controller - واجهة REST للوقت الحقيقي
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RealtimeService } from './realtime.service';
import { RealtimeGateway } from './realtime.gateway';

@ApiTags('Realtime')
@ApiBearerAuth()
@Controller('realtime')
@UseGuards(JwtAuthGuard)
export class RealtimeController {
  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * الحصول على إحصائيات الاتصال
   * Get connection statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'الحصول على إحصائيات الاتصال', description: 'Get connection statistics' })
  @ApiResponse({ status: 200, description: 'Connection statistics' })
  getConnectionStats() {
    return this.realtimeService.getConnectionStats();
  }

  /**
   * الحصول على عدد المتصلين
   * Get connected users count
   */
  @Get('connected-count')
  @ApiOperation({ summary: 'عدد المتصلين حالياً', description: 'Get currently connected users count' })
  @ApiResponse({ status: 200, description: 'Connected users count' })
  getConnectedCount() {
    return {
      count: this.realtimeService.getConnectedCount(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * بث رسالة صيانة للجميع
   * Broadcast maintenance message to all
   */
  @Post('broadcast/maintenance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'بث رسالة صيانة', description: 'Broadcast maintenance message' })
  @ApiResponse({ status: 200, description: 'Maintenance message broadcasted' })
  broadcastMaintenance(
    @CurrentUser('organizationId') organizationId: string,
    @Body() body: { message: string; scheduledAt?: Date; duration?: number },
  ) {
    this.realtimeGateway.broadcastToOrganization(organizationId, 'system:maintenance', {
      message: body.message,
      scheduledAt: body.scheduledAt,
    });

    return {
      success: true,
      message: 'Maintenance message broadcasted successfully',
    };
  }

  /**
   * بث إشعار لمستخدم معين
   * Broadcast notification to specific user
   */
  @Post('broadcast/notification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'إرسال إشعار لمستخدم', description: 'Send notification to user' })
  @ApiResponse({ status: 200, description: 'Notification sent' })
  sendNotification(
    @Body() body: { userId: string; type: string; title: string; body: string; data?: Record<string, unknown> },
  ) {
    this.realtimeGateway.broadcastNotification(body.userId, {
      id: crypto.randomUUID(),
      type: body.type,
      title: body.title,
      body: body.body,
      data: body.data,
    });

    return {
      success: true,
      message: 'Notification sent successfully',
    };
  }
}
