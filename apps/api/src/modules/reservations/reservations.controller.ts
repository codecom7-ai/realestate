// ═══════════════════════════════════════════════════════════════
// Reservations Controller - وحدة تحكم الحجوزات
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
import { ReservationsService } from './reservations.service';
import {
  CreateReservationDto,
  UpdateReservationDto,
  ExtendReservationDto,
  CancelReservationDto,
  GetReservationsDto,
} from './dto/reservations.dto';

@ApiTags('Reservations - الحجوزات')
@ApiBearerAuth()
@Controller('reservations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // ─────────────────────────────────────────────────────────────────
  // CRUD Endpoints
  // ─────────────────────────────────────────────────────────────────

  /**
   * الحصول على قائمة الحجوزات
   */
  @Get()
  @RequirePermissions(PERMISSIONS.DEALS_READ)
  @ApiOperation({ summary: 'الحصول على قائمة الحجوزات', description: 'جلب جميع الحجوزات مع إمكانية الفلترة' })
  @ApiResponse({ status: 200, description: 'تم جلب الحجوزات بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  async findAll(
    @Query() query: GetReservationsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reservationsService.findAll(organizationId, query);
  }

  /**
   * الحصول على الحجوزات المنتهية
   */
  @Get('expired')
  @RequirePermissions(PERMISSIONS.DEALS_READ)
  @ApiOperation({ summary: 'الحصول على الحجوزات المنتهية', description: 'جلب الحجوزات التي انتهت صلاحيتها' })
  @ApiResponse({ status: 200, description: 'تم جلب الحجوزات المنتهية بنجاح' })
  async getExpired(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reservationsService.getExpiredReservations(organizationId);
  }

  /**
   * الحصول على الحجوزات القريبة من الانتهاء
   */
  @Get('expiring')
  @RequirePermissions(PERMISSIONS.DEALS_READ)
  @ApiOperation({ summary: 'الحصول على الحجوزات القريبة من الانتهاء', description: 'جلب الحجوزات التي ستنتهي صلاحيتها قريباً' })
  @ApiResponse({ status: 200, description: 'تم جلب الحجوزات القريبة من الانتهاء بنجاح' })
  async getExpiring(
    @CurrentUser('organizationId') organizationId: string,
    @Query('days') days?: number,
  ) {
    return this.reservationsService.getExpiringReservations(organizationId, days || 7);
  }

  /**
   * الحصول على حجز صفقة معينة
   */
  @Get('deal/:dealId')
  @RequirePermissions(PERMISSIONS.DEALS_READ)
  @ApiOperation({ summary: 'الحصول على حجز صفقة', description: 'جلب حجز صفقة معينة' })
  @ApiParam({ name: 'dealId', description: 'معرف الصفقة' })
  @ApiResponse({ status: 200, description: 'تم جلب الحجز بنجاح' })
  @ApiResponse({ status: 404, description: 'لا يوجد حجز لهذه الصفقة' })
  async getByDeal(
    @Param('dealId', ParseUUIDPipe) dealId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reservationsService.getByDeal(dealId, organizationId);
  }

  /**
   * الحصول على حجز بالمعرف
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.DEALS_READ)
  @ApiOperation({ summary: 'الحصول على حجز بالمعرف', description: 'جلب تفاصيل حجز محدد' })
  @ApiParam({ name: 'id', description: 'معرف الحجز' })
  @ApiResponse({ status: 200, description: 'تم جلب الحجز بنجاح' })
  @ApiResponse({ status: 404, description: 'الحجز غير موجود' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reservationsService.findOne(id, organizationId);
  }

  /**
   * إنشاء حجز جديد
   */
  @Post()
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'إنشاء حجز جديد', description: 'إنشاء حجز جديد مع حجز العقار (ATOMIC)' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الحجز بنجاح' })
  @ApiResponse({ status: 400, description: 'مرحلة غير صالحة للحجز' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  @ApiResponse({ status: 409, description: 'العقار محجوز مسبقاً' })
  async create(
    @Body() dto: CreateReservationDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.reservationsService.create(dto, organizationId, userId);
  }

  /**
   * تحديث حجز
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'تحديث حجز', description: 'تحديث بيانات حجز موجود' })
  @ApiParam({ name: 'id', description: 'معرف الحجز' })
  @ApiResponse({ status: 200, description: 'تم تحديث الحجز بنجاح' })
  @ApiResponse({ status: 404, description: 'الحجز غير موجود' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReservationDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.reservationsService.update(id, dto, organizationId, userId);
  }

  /**
   * تمديد حجز
   */
  @Patch(':id/extend')
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'تمديد حجز', description: 'تمديد تاريخ انتهاء الحجز' })
  @ApiParam({ name: 'id', description: 'معرف الحجز' })
  @ApiResponse({ status: 200, description: 'تم تمديد الحجز بنجاح' })
  @ApiResponse({ status: 400, description: 'تاريخ غير صالح' })
  @ApiResponse({ status: 404, description: 'الحجز غير موجود' })
  async extend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendReservationDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.reservationsService.extend(id, dto, organizationId, userId);
  }

  /**
   * إلغاء حجز (POST)
   */
  @Post(':id/cancel')
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'إلغاء حجز', description: 'إلغاء حجز وإلغاء حجز العقار' })
  @ApiParam({ name: 'id', description: 'معرف الحجز' })
  @ApiResponse({ status: 200, description: 'تم إلغاء الحجز بنجاح' })
  @ApiResponse({ status: 404, description: 'الحجز غير موجود' })
  async cancelReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelReservationDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.reservationsService.cancel(id, dto, organizationId, userId);
  }

  /**
   * إلغاء حجز (DELETE)
   */
  @Delete(':id')
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'إلغاء حجز', description: 'إلغاء حجز وإلغاء حجز العقار' })
  @ApiParam({ name: 'id', description: 'معرف الحجز' })
  @ApiResponse({ status: 200, description: 'تم إلغاء الحجز بنجاح' })
  @ApiResponse({ status: 404, description: 'الحجز غير موجود' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelReservationDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.reservationsService.cancel(id, dto, organizationId, userId);
  }
}
