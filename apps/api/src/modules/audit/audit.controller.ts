// ═══════════════════════════════════════════════════════════════
// Audit Controller
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FastifyRequest, FastifyReply } from 'fastify';

import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@realestate/shared-types';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLogs(
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.auditService.getLogs(req.user.organizationId, {
      userId,
      action,
      entityType,
      entityId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });

    return {
      success: true,
      ...result,
      traceId: crypto.randomUUID(),
    };
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Get audit log by ID' })
  async getLogById(@Param('id') id: string, @Req() req: any) {
    const log = await this.auditService.getLogById(id, req.user.organizationId);
    return {
      success: true,
      data: log,
      traceId: crypto.randomUUID(),
    };
  }

  @Get('entity/:entityType/:entityId')
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Get entity history' })
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Req() req: any,
  ) {
    const logs = await this.auditService.getEntityHistory(
      entityType,
      entityId,
      req.user.organizationId,
    );
    return {
      success: true,
      data: logs,
      traceId: crypto.randomUUID(),
    };
  }

  @Get('export/csv')
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Export audit logs as CSV' })
  async exportLogs(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const user = (req as any).user;
    const csv = await this.auditService.exportLogs(user.organizationId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header(
      'Content-Disposition',
      `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send('\uFEFF' + csv); // BOM for Arabic support
  }
}
