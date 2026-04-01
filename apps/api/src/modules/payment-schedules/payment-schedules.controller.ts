// ═══════════════════════════════════════════════════════════════
// Payment Schedules Controller - وحدة تحكم جداول الأقساط
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Post,
  Delete,
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
import { PaymentSchedulesService } from './payment-schedules.service';
import {
  CreatePaymentScheduleDto,
  AddInstallmentDto,
  RecalculateScheduleDto,
  GetInstallmentsDto,
} from './dto/payment-schedules.dto';

@ApiTags('Payment Schedules - جداول الأقساط')
@ApiBearerAuth()
@Controller('payment-schedules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentSchedulesController {
  constructor(private readonly paymentSchedulesService: PaymentSchedulesService) {}

  // ─────────────────────────────────────────────────────────────────
  // Payment Schedule CRUD
  // ─────────────────────────────────────────────────────────────────

  /**
   * إنشاء جدول أقساط جديد
   */
  @Post()
  @RequirePermissions(PERMISSIONS.PAYMENTS_WRITE)
  @ApiOperation({ summary: 'إنشاء جدول أقساط', description: 'إنشاء جدول أقساط جديد لصفقة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء جدول الأقساط بنجاح' })
  @ApiResponse({ status: 400, description: 'مرحلة غير صالحة أو مجموع الأقساط لا يطابق' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  @ApiResponse({ status: 409, description: 'يوجد جدول سابق' })
  async create(
    @Body() dto: CreatePaymentScheduleDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.paymentSchedulesService.create(dto, organizationId, userId);
  }

  /**
   * الحصول على جدول أقساط صفقة
   */
  @Get('deal/:dealId')
  @RequirePermissions(PERMISSIONS.PAYMENTS_READ)
  @ApiOperation({ summary: 'الحصول على جدول أقساط صفقة', description: 'جلب جدول الأقساط لصفقة معينة' })
  @ApiParam({ name: 'dealId', description: 'معرف الصفقة' })
  @ApiResponse({ status: 200, description: 'تم جلب جدول الأقساط بنجاح' })
  @ApiResponse({ status: 404, description: 'لا يوجد جدول أقساط' })
  async getByDeal(
    @Param('dealId', ParseUUIDPipe) dealId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.paymentSchedulesService.getByDeal(dealId, organizationId);
  }

  /**
   * الحصول على جدول أقساط بالمعرف
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.PAYMENTS_READ)
  @ApiOperation({ summary: 'الحصول على جدول أقساط', description: 'جلب جدول الأقساط بالمعرف' })
  @ApiParam({ name: 'id', description: 'معرف جدول الأقساط' })
  @ApiResponse({ status: 200, description: 'تم جلب جدول الأقساط بنجاح' })
  @ApiResponse({ status: 404, description: 'جدول الأقساط غير موجود' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.paymentSchedulesService.findOne(id, organizationId);
  }

  // ─────────────────────────────────────────────────────────────────
  // Installment Management
  // ─────────────────────────────────────────────────────────────────

  /**
   * إضافة قسط لجدول موجود
   */
  @Post(':id/installments')
  @RequirePermissions(PERMISSIONS.PAYMENTS_WRITE)
  @ApiOperation({ summary: 'إضافة قسط', description: 'إضافة قسط جديد لجدول أقساط موجود' })
  @ApiParam({ name: 'id', description: 'معرف جدول الأقساط' })
  @ApiResponse({ status: 201, description: 'تم إضافة القسط بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  @ApiResponse({ status: 404, description: 'جدول الأقساط غير موجود' })
  @ApiResponse({ status: 409, description: 'يوجد قسط بنفس الرقم' })
  async addInstallment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddInstallmentDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.paymentSchedulesService.addInstallment(id, dto, organizationId, userId);
  }

  /**
   * حذف قسط من جدول
   */
  @Delete(':id/installments/:installmentId')
  @RequirePermissions(PERMISSIONS.PAYMENTS_WRITE)
  @ApiOperation({ summary: 'حذف قسط', description: 'حذف قسط من جدول الأقساط' })
  @ApiParam({ name: 'id', description: 'معرف جدول الأقساط' })
  @ApiParam({ name: 'installmentId', description: 'معرف القسط' })
  @ApiResponse({ status: 200, description: 'تم حذف القسط بنجاح' })
  @ApiResponse({ status: 400, description: 'القسط له مدفوعات مسجلة' })
  @ApiResponse({ status: 404, description: 'جدول الأقساط أو القسط غير موجود' })
  async removeInstallment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('installmentId', ParseUUIDPipe) installmentId: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.paymentSchedulesService.removeInstallment(id, installmentId, organizationId, userId);
  }

  /**
   * إعادة حساب جدول الأقساط
   */
  @Post(':id/recalculate')
  @RequirePermissions(PERMISSIONS.PAYMENTS_WRITE)
  @ApiOperation({ summary: 'إعادة حساب جدول الأقساط', description: 'تحديث المبلغ الإجمالي مع إمكانية التوزيع التلقائي' })
  @ApiParam({ name: 'id', description: 'معرف جدول الأقساط' })
  @ApiResponse({ status: 200, description: 'تم إعادة الحساب بنجاح' })
  @ApiResponse({ status: 400, description: 'لا توجد أقساط غير مدفوعة للتوزيع' })
  @ApiResponse({ status: 404, description: 'جدول الأقساط غير موجود' })
  async recalculate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecalculateScheduleDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.paymentSchedulesService.recalculate(id, dto, organizationId, userId);
  }

  // ─────────────────────────────────────────────────────────────────
  // Reports & Analytics
  // ─────────────────────────────────────────────────────────────────

  /**
   * الحصول على الأقساط القادمة
   */
  @Get('upcoming')
  @RequirePermissions(PERMISSIONS.PAYMENTS_READ)
  @ApiOperation({ summary: 'الأقساط القادمة', description: 'جلب الأقساط التي لم يحين موعد استحقاقها بعد' })
  @ApiResponse({ status: 200, description: 'تم جلب الأقساط القادمة بنجاح' })
  async getUpcoming(
    @Query() query: GetInstallmentsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.paymentSchedulesService.getUpcoming(organizationId, query);
  }

  /**
   * الحصول على الأقساط المتأخرة
   */
  @Get('overdue')
  @RequirePermissions(PERMISSIONS.PAYMENTS_READ)
  @ApiOperation({ summary: 'الأقساط المتأخرة', description: 'جلب الأقساط التي تجاوزت تاريخ الاستحقاق' })
  @ApiResponse({ status: 200, description: 'تم جلب الأقساط المتأخرة بنجاح' })
  async getOverdue(
    @Query() query: GetInstallmentsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.paymentSchedulesService.getOverdue(organizationId, query);
  }
}
