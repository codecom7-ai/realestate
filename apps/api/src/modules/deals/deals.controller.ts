// ═══════════════════════════════════════════════════════════════
// Deals Controller - وحدة تحكم الصفقات
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
import { DealsService } from './deals.service';
import {
  CreateDealDto,
  UpdateDealDto,
  ChangeStageDto,
  CreateReservationDto,
  GetDealsDto,
} from './dto/deals.dto';

@ApiTags('Deals - الصفقات')
@ApiBearerAuth()
@Controller('deals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  // ─────────────────────────────────────────────────────────────────
  // CRUD Endpoints
  // ─────────────────────────────────────────────────────────────────

  /**
   * الحصول على قائمة الصفقات
   */
  @Get()
  @RequirePermissions(PERMISSIONS.DEALS_READ)
  @ApiOperation({ summary: 'الحصول على قائمة الصفقات', description: 'جلب جميع الصفقات مع إمكانية الفلترة والصفحات' })
  @ApiResponse({ status: 200, description: 'تم جلب الصفقات بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  async findAll(
    @Query() query: GetDealsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.dealsService.findAll(organizationId, query);
  }

  /**
   * الحصول على إحصائيات الصفقات
   */
  @Get('stats')
  @RequirePermissions(PERMISSIONS.DEALS_READ)
  @ApiOperation({ summary: 'الحصول على إحصائيات الصفقات', description: 'جلب إحصائيات الصفقات حسب المرحلة' })
  @ApiResponse({ status: 200, description: 'تم جلب الإحصائيات بنجاح' })
  async getStats(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.dealsService.getStats(organizationId);
  }

  /**
   * الحصول على صفقة بالمعرف
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.DEALS_READ)
  @ApiOperation({ summary: 'الحصول على صفقة بالمعرف', description: 'جلب تفاصيل صفقة محددة' })
  @ApiParam({ name: 'id', description: 'معرف الصفقة' })
  @ApiResponse({ status: 200, description: 'تم جلب الصفقة بنجاح' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.dealsService.findOne(id, organizationId);
  }

  /**
   * إنشاء صفقة جديدة
   */
  @Post()
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'إنشاء صفقة جديدة', description: 'إنشاء صفقة جديدة مع ربطها بالعميل والعقار' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الصفقة بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  @ApiResponse({ status: 404, description: 'العميل أو العقار غير موجود' })
  async create(
    @Body() dto: CreateDealDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.dealsService.create(dto, organizationId, userId);
  }

  /**
   * تحديث صفقة
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'تحديث صفقة', description: 'تحديث بيانات صفقة موجودة' })
  @ApiParam({ name: 'id', description: 'معرف الصفقة' })
  @ApiResponse({ status: 200, description: 'تم تحديث الصفقة بنجاح' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDealDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.dealsService.update(id, dto, organizationId, userId);
  }

  /**
   * تغيير مرحلة الصفقة
   */
  @Patch(':id/stage')
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'تغيير مرحلة الصفقة', description: 'تغيير مرحلة الصفقة إلى مرحلة جديدة' })
  @ApiParam({ name: 'id', description: 'معرف الصفقة' })
  @ApiResponse({ status: 200, description: 'تم تغيير المرحلة بنجاح' })
  @ApiResponse({ status: 400, description: 'انتقال غير صالح' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  async changeStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStageDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.dealsService.changeStage(id, dto, organizationId, userId);
  }

  /**
   * حذف صفقة
   */
  @Delete(':id')
  @RequirePermissions(PERMISSIONS.DEALS_DELETE)
  @ApiOperation({ summary: 'حذف صفقة', description: 'حذف صفقة (soft delete)' })
  @ApiParam({ name: 'id', description: 'معرف الصفقة' })
  @ApiResponse({ status: 200, description: 'تم حذف الصفقة بنجاح' })
  @ApiResponse({ status: 400, description: 'لا يمكن حذف صفقة بحجز أو عقد نشط' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.dealsService.remove(id, organizationId, userId);
  }

  // ─────────────────────────────────────────────────────────────────
  // Reservation Endpoints
  // ─────────────────────────────────────────────────────────────────

  /**
   * إنشاء حجز للصفقة
   */
  @Post(':id/reservation')
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'إنشاء حجز', description: 'إنشاء حجز للصفقة مع حجز العقار (ATOMIC)' })
  @ApiParam({ name: 'id', description: 'معرف الصفقة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الحجز بنجاح' })
  @ApiResponse({ status: 400, description: 'مرحلة غير صالحة للحجز' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  @ApiResponse({ status: 409, description: 'العقار محجوز مسبقاً' })
  async createReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReservationDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.dealsService.createReservation(id, dto, organizationId, userId);
  }

  /**
   * إلغاء حجز الصفقة
   */
  @Delete(':id/reservation')
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'إلغاء الحجز', description: 'إلغاء حجز الصفقة وإلغاء حجز العقار' })
  @ApiParam({ name: 'id', description: 'معرف الصفقة' })
  @ApiResponse({ status: 200, description: 'تم إلغاء الحجز بنجاح' })
  @ApiResponse({ status: 400, description: 'لا يوجد حجز نشط' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  async cancelReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.dealsService.cancelReservation(id, organizationId, userId);
  }
}
