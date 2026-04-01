// ═══════════════════════════════════════════════════════════════
// Compliance Controller - نظام تشغيل المكتب العقاري المصري
// Phase 5.02 — Compliance Center (578/2025)
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
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';

import { ComplianceService } from './compliance.service';
import {
  CreateComplianceRecordDto,
  UpdateComplianceRecordDto,
  GetComplianceRecordsDto,
  ExpiringRecordsDto,
} from './dto/compliance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@realestate/shared-types';

@ApiTags('Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  /**
   * GET /compliance
   * قائمة سجلات الامتثال
   */
  @Get()
  @RequirePermissions(PERMISSIONS.COMPLIANCE_READ)
  @ApiOperation({ summary: 'قائمة سجلات الامتثال مع الفلترة' })
  @ApiResponse({ status: 200, description: 'قائمة سجلات الامتثال' })
  async findAll(
    @CurrentUser() user: any,
    @Query() query: GetComplianceRecordsDto,
  ) {
    const result = await this.complianceService.findAll(user.organizationId, query);
    return {
      success: true,
      ...result,
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * GET /compliance/status
   * حالة الامتثال الكاملة
   */
  @Get('status')
  @RequirePermissions(PERMISSIONS.COMPLIANCE_READ)
  @ApiOperation({ summary: 'حالة الامتثال الكاملة للمكتب' })
  @ApiResponse({ status: 200, description: 'حالة الامتثال' })
  async getStatus(@CurrentUser() user: any) {
    const status = await this.complianceService.getComplianceStatus(user.organizationId);
    return {
      success: true,
      data: status,
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * GET /compliance/brokers
   * سجل السماسرة
   */
  @Get('brokers')
  @RequirePermissions(PERMISSIONS.COMPLIANCE_READ)
  @ApiOperation({ summary: 'سجل السماسرة وحالة امتثالهم' })
  @ApiResponse({ status: 200, description: 'سجل السماسرة' })
  async getBrokerRegistry(@CurrentUser() user: any) {
    const brokers = await this.complianceService.getBrokerRegistry(user.organizationId);
    return {
      success: true,
      data: brokers,
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * GET /compliance/alerts
   * تنبيهات الامتثال
   */
  @Get('alerts')
  @RequirePermissions(PERMISSIONS.COMPLIANCE_READ)
  @ApiOperation({ summary: 'تنبيهات الامتثال (90/30/7 أيام)' })
  @ApiResponse({ status: 200, description: 'قائمة التنبيهات' })
  async getAlerts(@CurrentUser() user: any) {
    const alerts = await this.complianceService.generateAlerts(user.organizationId);
    return {
      success: true,
      data: alerts,
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * GET /compliance/expiring
   * المستندات المنتهية أو القريبة من الانتهاء
   */
  @Get('expiring')
  @RequirePermissions(PERMISSIONS.COMPLIANCE_READ)
  @ApiOperation({ summary: 'المستندات المنتهية أو القريبة من الانتهاء' })
  @ApiResponse({ status: 200, description: 'قائمة المستندات' })
  async getExpiring(
    @CurrentUser() user: any,
    @Query() query: ExpiringRecordsDto,
  ) {
    const result = await this.complianceService.checkExpiringDocuments(
      user.organizationId,
      query.days || 30,
    );
    return {
      success: true,
      data: result,
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * GET /compliance/:id
   * تفاصيل سجل
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.COMPLIANCE_READ)
  @ApiOperation({ summary: 'تفاصيل سجل امتثال' })
  @ApiParam({ name: 'id', description: 'معرف السجل' })
  @ApiResponse({ status: 200, description: 'تفاصيل السجل' })
  @ApiResponse({ status: 404, description: 'السجل غير موجود' })
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const record = await this.complianceService.findOne(id, user.organizationId);
    return {
      success: true,
      data: record,
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * POST /compliance
   * إنشاء سجل امتثال جديد
   */
  @Post()
  @RequirePermissions(PERMISSIONS.COMPLIANCE_WRITE)
  @ApiOperation({ summary: 'إنشاء سجل امتثال جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء السجل بنجاح' })
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateComplianceRecordDto,
    @Req() req: FastifyRequest,
  ) {
    const record = await this.complianceService.create(
      user.organizationId,
      user.id,
      dto,
      req.ip,
    );
    return {
      success: true,
      data: record,
      message: 'Compliance record created successfully',
      messageAr: 'تم إنشاء سجل الامتثال بنجاح',
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * PATCH /compliance/:id
   * تحديث سجل امتثال
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.COMPLIANCE_WRITE)
  @ApiOperation({ summary: 'تحديث سجل امتثال' })
  @ApiParam({ name: 'id', description: 'معرف السجل' })
  @ApiResponse({ status: 200, description: 'تم تحديث السجل بنجاح' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateComplianceRecordDto,
    @Req() req: FastifyRequest,
  ) {
    const record = await this.complianceService.update(
      id,
      user.organizationId,
      user.id,
      dto,
      req.ip,
    );
    return {
      success: true,
      data: record,
      message: 'Compliance record updated successfully',
      messageAr: 'تم تحديث سجل الامتثال بنجاح',
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * DELETE /compliance/:id
   * حذف سجل امتثال
   */
  @Delete(':id')
  @RequirePermissions(PERMISSIONS.COMPLIANCE_WRITE)
  @ApiOperation({ summary: 'حذف سجل امتثال' })
  @ApiParam({ name: 'id', description: 'معرف السجل' })
  @ApiResponse({ status: 200, description: 'تم حذف السجل بنجاح' })
  async remove(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ) {
    await this.complianceService.remove(id, user.organizationId, user.id, req.ip);
    return {
      success: true,
      message: 'Compliance record deleted successfully',
      messageAr: 'تم حذف سجل الامتثال بنجاح',
      traceId: crypto.randomUUID(),
    };
  }
}
