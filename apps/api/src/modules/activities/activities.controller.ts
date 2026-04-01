// ═══════════════════════════════════════════════════════════════
// Activities Controller - واجهة API الأنشطة
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
import { ActivitiesService } from './activities.service';
import {
  CreateActivityDto,
  UpdateActivityDto,
  GetTimelineDto,
  ActivityType,
  EntityType,
} from './dto/create-activity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@realestate/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activities')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly configService: ConfigService,
  ) {}

  private getOrganizationId(): string {
    return this.configService.get<string>('app.orgId') || '';
  }

  @Post()
  @RequirePermissions(PERMISSIONS.LEADS_WRITE)
  @ApiOperation({
    summary: 'إنشاء نشاط جديد',
    description: 'Creates a new activity (call, whatsapp, email, meeting, note, etc.)',
  })
  @ApiResponse({
    status: 201,
    description: 'تم إنشاء النشاط بنجاح',
  })
  @ApiResponse({
    status: 404,
    description: 'الكيان أو المستخدم غير موجود',
  })
  async create(
    @Body() createActivityDto: CreateActivityDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.activitiesService.create(
      createActivityDto,
      this.getOrganizationId(),
      userId,
    );
  }

  @Get()
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @ApiOperation({
    summary: 'الحصول على Timeline موحد',
    description: 'Returns unified timeline with pagination and filters.',
  })
  @ApiQuery({ name: 'entityType', required: false, enum: EntityType, description: 'فلترة حسب نوع الكيان' })
  @ApiQuery({ name: 'entityId', required: false, description: 'فلترة حسب معرف الكيان' })
  @ApiQuery({ name: 'activityType', required: false, enum: ActivityType, description: 'فلترة حسب نوع النشاط' })
  @ApiQuery({ name: 'userId', required: false, description: 'فلترة حسب المستخدم' })
  @ApiQuery({ name: 'startDate', required: false, description: 'تاريخ البداية' })
  @ApiQuery({ name: 'endDate', required: false, description: 'تاريخ النهاية' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async getTimeline(
    @Query('entityType') entityType?: EntityType,
    @Query('entityId') entityId?: string,
    @Query('activityType') activityType?: ActivityType,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activitiesService.getTimeline(this.getOrganizationId(), {
      entityType,
      entityId,
      activityType,
      userId,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('entity/:entityType/:entityId')
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @ApiOperation({
    summary: 'الحصول على أنشطة كيان معين',
    description: 'Returns timeline for a specific entity (lead, client, property, deal).',
  })
  @ApiParam({ name: 'entityType', enum: EntityType, description: 'نوع الكيان' })
  @ApiParam({ name: 'entityId', description: 'معرف الكيان' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async getEntityTimeline(
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activitiesService.getEntityTimeline(
      entityType,
      entityId,
      this.getOrganizationId(),
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      },
    );
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @ApiOperation({
    summary: 'تفاصيل النشاط',
    description: 'Returns activity details.',
  })
  @ApiParam({ name: 'id', description: 'معرف النشاط' })
  async findOne(@Param('id') id: string) {
    return this.activitiesService.findOne(id, this.getOrganizationId());
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.LEADS_WRITE)
  @ApiOperation({
    summary: 'تحديث النشاط',
    description: 'Updates activity title, body, or metadata.',
  })
  @ApiParam({ name: 'id', description: 'معرف النشاط' })
  async update(
    @Param('id') id: string,
    @Body() updateActivityDto: UpdateActivityDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.activitiesService.update(
      id,
      updateActivityDto,
      this.getOrganizationId(),
      userId,
    );
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.LEADS_DELETE)
  @ApiOperation({
    summary: 'حذف النشاط',
    description: 'Deletes an activity.',
  })
  @ApiParam({ name: 'id', description: 'معرف النشاط' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.activitiesService.remove(id, this.getOrganizationId(), userId);
  }
}
