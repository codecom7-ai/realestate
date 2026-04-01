// ═══════════════════════════════════════════════════════════════
// Leads Controller - واجهة API Leads Pipeline
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
import { LeadsService } from './leads.service';
import { CreateLeadDto, ChangeStageDto, AssignLeadDto, UpdateLeadDto } from './dto/create-lead.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS, LeadStage } from '@realestate/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Leads')
@ApiBearerAuth()
@Controller('leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * الحصول على معرف المؤسسة (مكتب واحد فقط)
   */
  private getOrganizationId(): string {
    return this.configService.get<string>('app.orgId') || '';
  }

  @Post()
  @RequirePermissions(PERMISSIONS.LEADS_WRITE)
  @ApiOperation({
    summary: 'إنشاء Lead جديد',
    description: 'Creates a new lead with optional client and assignee.',
  })
  @ApiResponse({
    status: 201,
    description: 'تم إنشاء الـ Lead بنجاح',
  })
  @ApiResponse({
    status: 404,
    description: 'العميل أو المستخدم غير موجود',
    schema: {
      example: {
        success: false,
        error: {
          code: 'CLIENT_NOT_FOUND',
          message: 'Client not found',
          messageAr: 'العميل غير موجود',
        },
      },
    },
  })
  async create(
    @Body() createLeadDto: CreateLeadDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.leadsService.create(
      createLeadDto,
      this.getOrganizationId(),
      userId,
    );
  }

  @Get()
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @ApiOperation({
    summary: 'قائمة الـ Leads',
    description: 'Returns paginated list of leads with filters and search.',
  })
  @ApiQuery({ name: 'stage', required: false, enum: LeadStage, description: 'فلترة حسب المرحلة' })
  @ApiQuery({ name: 'assignedToId', required: false, description: 'فلترة حسب المسؤول' })
  @ApiQuery({ name: 'clientId', required: false, description: 'فلترة حسب العميل' })
  @ApiQuery({ name: 'search', required: false, description: 'البحث (اسم، هاتف، ملاحظات)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  async findAll(
    @Query('stage') stage?: LeadStage,
    @Query('assignedToId') assignedToId?: string,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.leadsService.findAll(this.getOrganizationId(), {
      stage,
      assignedToId,
      clientId,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    });
  }

  @Get('stats')
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @ApiOperation({
    summary: 'إحصائيات Pipeline',
    description: 'Returns pipeline statistics with counts per stage.',
  })
  async getStats() {
    return this.leadsService.getPipelineStats(this.getOrganizationId());
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @ApiOperation({
    summary: 'تفاصيل الـ Lead',
    description: 'Returns lead details with client, assignee, and activities.',
  })
  @ApiParam({ name: 'id', description: 'معرف الـ Lead' })
  @ApiResponse({
    status: 404,
    description: 'الـ Lead غير موجود',
    schema: {
      example: {
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found',
          messageAr: 'الـ Lead غير موجود',
        },
      },
    },
  })
  async findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id, this.getOrganizationId());
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.LEADS_WRITE)
  @ApiOperation({
    summary: 'تحديث الـ Lead',
    description: 'Updates lead information (budget, areas, preferences).',
  })
  @ApiParam({ name: 'id', description: 'معرف الـ Lead' })
  async update(
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.leadsService.update(
      id,
      updateLeadDto,
      this.getOrganizationId(),
      userId,
    );
  }

  @Patch(':id/stage')
  @RequirePermissions(PERMISSIONS.LEADS_WRITE)
  @ApiOperation({
    summary: 'تغيير مرحلة الـ Lead',
    description: 'Changes lead stage with validation for allowed transitions.',
  })
  @ApiParam({ name: 'id', description: 'معرف الـ Lead' })
  @ApiResponse({
    status: 400,
    description: 'انتقال غير صالح',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_STAGE_TRANSITION',
          message: 'Cannot transition from NEW to CLOSED_WON',
          messageAr: 'لا يمكن الانتقال من جديد إلى مغلق رابح',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'سبب الإغلاق مطلوب',
    schema: {
      example: {
        success: false,
        error: {
          code: 'LOST_REASON_REQUIRED',
          message: 'Reason is required when closing a lead as lost',
          messageAr: 'سبب الإغلاق مطلوب عند إغلاق الـ Lead كخاسر',
        },
      },
    },
  })
  async changeStage(
    @Param('id') id: string,
    @Body() changeStageDto: ChangeStageDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.leadsService.changeStage(
      id,
      changeStageDto,
      this.getOrganizationId(),
      userId,
    );
  }

  @Patch(':id/assign')
  @RequirePermissions(PERMISSIONS.LEADS_ASSIGN)
  @ApiOperation({
    summary: 'تعيين مسؤول للـ Lead',
    description: 'Assigns or reassigns a lead to a user.',
  })
  @ApiParam({ name: 'id', description: 'معرف الـ Lead' })
  @ApiResponse({
    status: 404,
    description: 'المستخدم غير موجود',
    schema: {
      example: {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          messageAr: 'المستخدم غير موجود',
        },
      },
    },
  })
  async assign(
    @Param('id') id: string,
    @Body() assignLeadDto: AssignLeadDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.leadsService.assign(
      id,
      assignLeadDto,
      this.getOrganizationId(),
      userId,
    );
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.LEADS_DELETE)
  @ApiOperation({
    summary: 'حذف الـ Lead',
    description: 'Soft deletes a lead.',
  })
  @ApiParam({ name: 'id', description: 'معرف الـ Lead' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.leadsService.remove(id, this.getOrganizationId(), userId);
  }
}
