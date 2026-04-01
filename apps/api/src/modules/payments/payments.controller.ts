// ═══════════════════════════════════════════════════════════════
// Payments Controller - وحدة تحكم المدفوعات
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@realestate/shared-types';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentScheduleDto,
  CreatePaymentDto,
  UpdatePaymentDto,
  GetPaymentsDto,
} from './dto/payments.dto';

@ApiTags('Payments - المدفوعات')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ─────────────────────────────────────────────────────────────────
  // Payment Schedule Endpoints
  // ─────────────────────────────────────────────────────────────────

  /**
   * إنشاء جدول أقساط
   */
  @Post('schedule')
  @RequirePermissions(PERMISSIONS.PAYMENTS_WRITE)
  @ApiOperation({ summary: 'إنشاء جدول أقساط', description: 'إنشاء جدول أقساط جديد لصفقة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء جدول الأقساط بنجاح' })
  @ApiResponse({ status: 400, description: 'مرحلة غير صالحة' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  @ApiResponse({ status: 409, description: 'يوجد جدول سابق' })
  async createSchedule(
    @Body() dto: CreatePaymentScheduleDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.paymentsService.createSchedule(dto, organizationId, userId);
  }

  /**
   * الحصول على جدول أقساط صفقة
   */
  @Get('schedule/deal/:dealId')
  @RequirePermissions(PERMISSIONS.PAYMENTS_READ)
  @ApiOperation({ summary: 'الحصول على جدول أقساط صفقة', description: 'جلب جدول الأقساط لصفقة معينة' })
  @ApiParam({ name: 'dealId', description: 'معرف الصفقة' })
  @ApiResponse({ status: 200, description: 'تم جلب جدول الأقساط بنجاح' })
  @ApiResponse({ status: 404, description: 'لا يوجد جدول أقساط' })
  async getSchedule(
    @Param('dealId', ParseUUIDPipe) dealId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.paymentsService.getSchedule(dealId, organizationId);
  }

  /**
   * الحصول على الأقساط المتأخرة
   */
  @Get('overdue')
  @RequirePermissions(PERMISSIONS.PAYMENTS_READ)
  @ApiOperation({ summary: 'الحصول على الأقساط المتأخرة', description: 'جلب الأقساط التي تجاوزت تاريخ الاستحقاق' })
  @ApiResponse({ status: 200, description: 'تم جلب الأقساط المتأخرة بنجاح' })
  async getOverdue(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.paymentsService.getOverdueInstallments(organizationId);
  }

  // ─────────────────────────────────────────────────────────────────
  // Payments Endpoints
  // ─────────────────────────────────────────────────────────────────

  /**
   * الحصول على قائمة المدفوعات
   */
  @Get()
  @RequirePermissions(PERMISSIONS.PAYMENTS_READ)
  @ApiOperation({ summary: 'الحصول على قائمة المدفوعات', description: 'جلب جميع المدفوعات مع إمكانية الفلترة' })
  @ApiResponse({ status: 200, description: 'تم جلب المدفوعات بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  async findAll(
    @Query() query: GetPaymentsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.paymentsService.findAll(organizationId, query);
  }

  /**
   * تسجيل دفعة جديدة
   */
  @Post()
  @RequirePermissions(PERMISSIONS.PAYMENTS_WRITE)
  @ApiOperation({ summary: 'تسجيل دفعة', description: 'تسجيل دفعة جديدة لقسط أو صفقة' })
  @ApiResponse({ status: 201, description: 'تم تسجيل الدفعة بنجاح' })
  @ApiResponse({ status: 404, description: 'القسط أو الصفقة غير موجودة' })
  async recordPayment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.paymentsService.recordPayment(dto, organizationId, userId);
  }

  /**
   * تأكيد دفعة
   */
  @Patch(':id/confirm')
  @RequirePermissions(PERMISSIONS.PAYMENTS_WRITE)
  @ApiOperation({ summary: 'تأكيد دفعة', description: 'تأكيد دفعة معلقة' })
  @ApiParam({ name: 'id', description: 'معرف الدفعة' })
  @ApiResponse({ status: 200, description: 'تم تأكيد الدفعة بنجاح' })
  @ApiResponse({ status: 400, description: 'الدفعة مؤكدة مسبقاً' })
  @ApiResponse({ status: 404, description: 'الدفعة غير موجودة' })
  async confirmPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.paymentsService.confirmPayment(id, organizationId, userId);
  }
}
