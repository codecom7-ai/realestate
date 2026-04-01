// ═══════════════════════════════════════════════════════════════
// Properties Controller - واجهة API العقارات
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
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
import { PropertiesService } from './properties.service';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  LockPropertyDto,
  GetPropertiesDto,
} from './dto/create-property.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS, PropertyType, PropertyStatus, FinishingType } from '@realestate/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Properties')
@ApiBearerAuth()
@Controller('properties')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly configService: ConfigService,
  ) {}

  private getOrganizationId(): string {
    return this.configService.get<string>('app.orgId') || '';
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PROPERTIES_WRITE)
  @ApiOperation({
    summary: 'إنشاء عقار جديد',
    description: 'Creates a new property listing',
  })
  @ApiResponse({
    status: 201,
    description: 'تم إنشاء العقار بنجاح',
  })
  @ApiResponse({
    status: 400,
    description: 'بيانات غير صالحة',
  })
  async create(
    @Body() createPropertyDto: CreatePropertyDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.propertiesService.create(
      createPropertyDto,
      this.getOrganizationId(),
      userId,
    );
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PROPERTIES_READ)
  @ApiOperation({
    summary: 'الحصول على قائمة العقارات',
    description: 'Returns paginated list of properties with filters',
  })
  @ApiQuery({ name: 'status', required: false, enum: PropertyStatus, description: 'فلترة حسب الحالة' })
  @ApiQuery({ name: 'propertyType', required: false, enum: PropertyType, description: 'فلترة حسب النوع' })
  @ApiQuery({ name: 'city', required: false, description: 'فلترة حسب المدينة' })
  @ApiQuery({ name: 'district', required: false, description: 'فلترة حسب المنطقة' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'أقل سعر' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'أعلى سعر' })
  @ApiQuery({ name: 'minArea', required: false, type: Number, description: 'أقل مساحة' })
  @ApiQuery({ name: 'maxArea', required: false, type: Number, description: 'أعلى مساحة' })
  @ApiQuery({ name: 'minBedrooms', required: false, type: Number, description: 'أقل غرف نوم' })
  @ApiQuery({ name: 'maxBedrooms', required: false, type: Number, description: 'أكثر غرف نوم' })
  @ApiQuery({ name: 'search', required: false, description: 'البحث في العنوان والوصف' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  async findAll(@Query() query: GetPropertiesDto) {
    return this.propertiesService.findAll(this.getOrganizationId(), query);
  }

  @Get('stats')
  @RequirePermissions(PERMISSIONS.PROPERTIES_READ)
  @ApiOperation({
    summary: 'إحصائيات العقارات',
    description: 'Returns property statistics',
  })
  async getStats() {
    return this.propertiesService.getStats(this.getOrganizationId());
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PROPERTIES_READ)
  @ApiOperation({
    summary: 'تفاصيل العقار',
    description: 'Returns property details with images and history',
  })
  @ApiParam({ name: 'id', description: 'معرف العقار' })
  @ApiResponse({
    status: 200,
    description: 'تفاصيل العقار',
  })
  @ApiResponse({
    status: 404,
    description: 'العقار غير موجود',
  })
  async findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id, this.getOrganizationId());
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PROPERTIES_WRITE)
  @ApiOperation({
    summary: 'تحديث العقار',
    description: 'Updates property information',
  })
  @ApiParam({ name: 'id', description: 'معرف العقار' })
  async update(
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.propertiesService.update(
      id,
      updatePropertyDto,
      this.getOrganizationId(),
      userId,
    );
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PROPERTIES_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'حذف العقار',
    description: 'Soft deletes a property',
  })
  @ApiParam({ name: 'id', description: 'معرف العقار' })
  @ApiResponse({
    status: 204,
    description: 'تم حذف العقار',
  })
  @ApiResponse({
    status: 400,
    description: 'لا يمكن حذف عقار محجوز',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.propertiesService.remove(id, this.getOrganizationId(), userId);
  }

  @Post(':id/lock')
  @RequirePermissions(PERMISSIONS.PROPERTIES_WRITE)
  @ApiOperation({
    summary: 'حجز العقار',
    description: 'Locks a property for a deal (ATOMIC - prevents double booking)',
  })
  @ApiParam({ name: 'id', description: 'معرف العقار' })
  @ApiResponse({
    status: 200,
    description: 'تم حجز العقار بنجاح',
  })
  @ApiResponse({
    status: 409,
    description: 'العقار محجوز مسبقاً',
    schema: {
      example: {
        success: false,
        error: {
          code: 'UNIT_ALREADY_LOCKED',
          message: 'Property is already locked',
          messageAr: 'العقار محجوز مسبقاً',
          lockedByDealId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    },
  })
  async lock(
    @Param('id') id: string,
    @Body() lockPropertyDto: LockPropertyDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.propertiesService.lock(
      id,
      lockPropertyDto,
      this.getOrganizationId(),
      userId,
    );
  }

  @Delete(':id/lock')
  @RequirePermissions(PERMISSIONS.PROPERTIES_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'إلغاء حجز العقار',
    description: 'Unlocks a property',
  })
  @ApiParam({ name: 'id', description: 'معرف العقار' })
  @ApiQuery({ name: 'dealId', required: true, description: 'معرف الصفقة صاحبة الحجز' })
  @ApiResponse({
    status: 204,
    description: 'تم إلغاء الحجز',
  })
  async unlock(
    @Param('id') id: string,
    @Query('dealId') dealId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.propertiesService.unlock(
      id,
      dealId,
      this.getOrganizationId(),
      userId,
    );
  }
}
