// ═══════════════════════════════════════════════════════════════
// POS Devices Controller - نظام تشغيل المكتب العقاري المصري
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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS, POSDeviceStatus } from '@realestate/shared-types';
import { PosDevicesService } from './pos-devices.service';
import {
  RegisterPosDeviceDto,
  UpdatePosDeviceDto,
  PosDeviceResponseDto,
} from './dto/pos-device.dto';

@ApiTags('POS Devices')
@ApiBearerAuth()
@Controller('pos-devices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PosDevicesController {
  constructor(private readonly posDevicesService: PosDevicesService) {}

  /**
   * تسجيل جهاز POS جديد
   */
  @Post('register')
  @RequirePermissions(PERMISSIONS.POS_MANAGE)
  @ApiOperation({
    summary: 'تسجيل جهاز POS جديد',
    description:
      'يسجل جهاز POS جديد ويرجع clientSecret (يُظهر مرة واحدة فقط)',
  })
  @ApiResponse({
    status: 201,
    description: 'تم تسجيل الجهاز بنجاح',
    type: PosDeviceResponseDto,
  })
  @ApiResponse({ status: 409, description: 'الجهاز موجود بالفعل' })
  async registerDevice(
    @Body() dto: RegisterPosDeviceDto,
    @CurrentUser('id') userId: string,
  ): Promise<PosDeviceResponseDto & { clientSecret: string }> {
    return this.posDevicesService.registerDevice(dto, userId);
  }

  /**
   * الحصول على جميع أجهزة POS
   */
  @Get()
  @RequirePermissions(PERMISSIONS.POS_VIEW)
  @ApiOperation({
    summary: 'الحصول على جميع أجهزة POS',
    description: 'يرجع قائمة بجميع أجهزة POS المسجلة',
  })
  @ApiQuery({
    name: 'branchId',
    required: false,
    description: 'فلترة حسب الفرع',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: POSDeviceStatus,
    description: 'فلترة حسب الحالة',
  })
  @ApiResponse({
    status: 200,
    description: 'قائمة أجهزة POS',
    type: [PosDeviceResponseDto],
  })
  async getDevices(
    @Query('branchId') branchId?: string,
    @Query('status') status?: POSDeviceStatus,
  ): Promise<PosDeviceResponseDto[]> {
    return this.posDevicesService.getDevices({
      branchId,
      status,
    });
  }

  /**
   * الحصول على جهاز POS بالمعرف
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.POS_VIEW)
  @ApiOperation({
    summary: 'الحصول على جهاز POS بالمعرف',
  })
  @ApiResponse({
    status: 200,
    description: 'بيانات الجهاز',
    type: PosDeviceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'الجهاز غير موجود' })
  async getDeviceById(@Param('id') id: string): Promise<PosDeviceResponseDto> {
    return this.posDevicesService.getDeviceById(id);
  }

  /**
   * تحديث جهاز POS
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.POS_MANAGE)
  @ApiOperation({
    summary: 'تحديث بيانات جهاز POS',
  })
  @ApiResponse({
    status: 200,
    description: 'تم التحديث بنجاح',
    type: PosDeviceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'الجهاز غير موجود' })
  async updateDevice(
    @Param('id') id: string,
    @Body() dto: UpdatePosDeviceDto,
    @CurrentUser('id') userId: string,
  ): Promise<PosDeviceResponseDto> {
    return this.posDevicesService.updateDevice(id, dto, userId);
  }

  /**
   * تعطيل جهاز POS (تقاعد)
   */
  @Patch(':id/deactivate')
  @RequirePermissions(PERMISSIONS.POS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'تعطيل جهاز POS',
    description: 'يغير حالة الجهاز إلى RETIRED (لا يمكن التراجع)',
  })
  @ApiResponse({
    status: 200,
    description: 'تم تعطيل الجهاز',
    type: PosDeviceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'الجهاز متقاعد بالفعل' })
  @ApiResponse({ status: 404, description: 'الجهاز غير موجود' })
  async deactivateDevice(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason?: string,
  ): Promise<PosDeviceResponseDto> {
    return this.posDevicesService.deactivateDevice(id, userId, reason);
  }

  /**
   * تعليق جهاز POS مؤقتاً
   */
  @Patch(':id/suspend')
  @RequirePermissions(PERMISSIONS.POS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'تعليق جهاز POS مؤقتاً',
    description: 'يغير حالة الجهاز إلى SUSPENDED (يمكن إعادة التنشيط)',
  })
  @ApiResponse({
    status: 200,
    description: 'تم تعليق الجهاز',
    type: PosDeviceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'يمكن تعليق الأجهزة النشطة فقط' })
  @ApiResponse({ status: 404, description: 'الجهاز غير موجود' })
  async suspendDevice(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason?: string,
  ): Promise<PosDeviceResponseDto> {
    return this.posDevicesService.suspendDevice(id, userId, reason);
  }

  /**
   * إعادة تنشيط جهاز POS معلق
   */
  @Patch(':id/reactivate')
  @RequirePermissions(PERMISSIONS.POS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'إعادة تنشيط جهاز POS معلق',
    description: 'يغير حالة الجهاز من SUSPENDED إلى ACTIVE',
  })
  @ApiResponse({
    status: 200,
    description: 'تم إعادة تنشيط الجهاز',
    type: PosDeviceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'يمكن إعادة تنشيط الأجهزة المعلقة فقط',
  })
  @ApiResponse({ status: 404, description: 'الجهاز غير موجود' })
  async reactivateDevice(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<PosDeviceResponseDto> {
    return this.posDevicesService.reactivateDevice(id, userId);
  }
}
