// ═══════════════════════════════════════════════════════════════
// Viewings Controller - واجهة المعاينات
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ViewingsService } from './viewings.service';
import {
  ScheduleViewingDto,
  UpdateViewingDto,
  CancelViewingDto,
  ViewingStatsDto,
  GetViewingsDto,
} from './dto/viewings.dto';

@ApiTags('المعاينات')
@ApiBearerAuth()
@Controller('viewings')
@UseGuards(JwtAuthGuard)
export class ViewingsController {
  constructor(private readonly viewingsService: ViewingsService) {}

  /**
   * GET /viewings
   * قائمة المعاينات
   */
  @Get()
  @ApiOperation({
    summary: 'قائمة المعاينات',
    description: 'الحصول على قائمة المعاينات مع الفلترة',
  })
  @ApiResponse({
    status: 200,
    description: 'قائمة المعاينات',
  })
  async findAll(
    @Query() query: GetViewingsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.viewingsService.findAll(organizationId, query);
  }

  /**
   * GET /viewings/stats
   * إحصائيات المعاينات
   */
  @Get('stats')
  @ApiOperation({
    summary: 'إحصائيات المعاينات',
    description: 'الحصول على إحصائيات المعاينات',
  })
  @ApiResponse({
    status: 200,
    description: 'إحصائيات المعاينات',
    type: ViewingStatsDto,
  })
  async getStats(
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<ViewingStatsDto> {
    return this.viewingsService.getStats(organizationId);
  }

  /**
   * GET /viewings/:id
   * تفاصيل معاينة
   */
  @Get(':id')
  @ApiOperation({
    summary: 'تفاصيل معاينة',
    description: 'الحصول على تفاصيل معاينة',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف المعاينة',
  })
  @ApiResponse({
    status: 200,
    description: 'تفاصيل المعاينة',
  })
  @ApiResponse({
    status: 404,
    description: 'المعاينة غير موجودة',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.viewingsService.findOne(id, organizationId);
  }

  /**
   * POST /viewings
   * جدولة معاينة جديدة
   */
  @Post()
  @ApiOperation({
    summary: 'جدولة معاينة',
    description: 'جدولة معاينة جديدة مع التحقق من التعارض',
  })
  @ApiResponse({
    status: 201,
    description: 'تم جدولة المعاينة',
  })
  @ApiResponse({
    status: 404,
    description: 'العميل أو العقار غير موجود',
  })
  @ApiResponse({
    status: 409,
    description: 'يوجد تعارض في الموعد',
  })
  async schedule(
    @Body() dto: ScheduleViewingDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.viewingsService.schedule(organizationId, dto, userId);
  }

  /**
   * PATCH /viewings/:id
   * تحديث معاينة
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'تحديث معاينة',
    description: 'تحديث بيانات المعاينة',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف المعاينة',
  })
  @ApiResponse({
    status: 200,
    description: 'تم تحديث المعاينة',
  })
  @ApiResponse({
    status: 404,
    description: 'المعاينة غير موجودة',
  })
  @ApiResponse({
    status: 409,
    description: 'يوجد تعارض في الموعد الجديد',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateViewingDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.viewingsService.update(id, organizationId, dto, userId);
  }

  /**
   * POST /viewings/:id/cancel
   * إلغاء معاينة
   */
  @Post(':id/cancel')
  @ApiOperation({
    summary: 'إلغاء معاينة',
    description: 'إلغاء معاينة مجدولة',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف المعاينة',
  })
  @ApiResponse({
    status: 200,
    description: 'تم إلغاء المعاينة',
  })
  @ApiResponse({
    status: 404,
    description: 'المعاينة غير موجودة',
  })
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelViewingDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.viewingsService.cancel(id, organizationId, dto, userId);
  }
}
