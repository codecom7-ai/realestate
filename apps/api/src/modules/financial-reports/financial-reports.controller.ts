// ═══════════════════════════════════════════════════════════════
// Financial Reports Controller - نظام تشغيل المكتب العقاري المصري
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Query,
  UseGuards,
  Response,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FinancialReportsService } from './financial-reports.service';

@ApiTags('Financial Reports')
@ApiBearerAuth()
@Controller('financial-reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinancialReportsController {
  constructor(private readonly reportsService: FinancialReportsService) {}

  @Get()
  @RequirePermissions('financial-reports:read')
  @ApiOperation({ summary: 'الحصول على التقارير المالية' })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'month', required: false })
  async getReports(
    @CurrentUser('organizationId') organizationId: string,
    @Query('period') period?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.reportsService.getFinancialReports(organizationId, {
      period: period as 'month' | 'quarter' | 'year',
      year: year ? parseInt(year) : undefined,
      month: month ? parseInt(month) : undefined,
    });
  }

  @Get('revenue')
  @RequirePermissions('financial-reports:read')
  @ApiOperation({ summary: 'تقرير الإيرادات' })
  async getRevenueReport(
    @CurrentUser('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getRevenueReport(organizationId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('commissions')
  @RequirePermissions('financial-reports:read')
  @ApiOperation({ summary: 'تقرير العمولات' })
  async getCommissionsReport(
    @CurrentUser('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getCommissionsReport(organizationId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('eta-summary')
  @RequirePermissions('financial-reports:read')
  @ApiOperation({ summary: 'ملخص فواتير ETA' })
  async getETASummary(
    @CurrentUser('organizationId') organizationId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.reportsService.getETASummary(organizationId, {
      month: month ? parseInt(month) : new Date().getMonth() + 1,
      year: year ? parseInt(year) : new Date().getFullYear(),
    });
  }

  @Get('collections')
  @RequirePermissions('financial-reports:read')
  @ApiOperation({ summary: 'تقرير التحصيل' })
  async getCollectionsReport(
    @CurrentUser('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getCollectionsReport(organizationId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('overdue')
  @RequirePermissions('financial-reports:read')
  @ApiOperation({ summary: 'تقرير الأقساط المتأخرة' })
  async getOverdueReport(@CurrentUser('organizationId') organizationId: string) {
    return this.reportsService.getOverdueReport(organizationId);
  }

  @Get('dashboard')
  @RequirePermissions('financial-reports:read')
  @ApiOperation({ summary: 'لوحة التقارير المالية' })
  async getDashboard(@CurrentUser('organizationId') organizationId: string) {
    return this.reportsService.getFinancialDashboard(organizationId);
  }

  @Get('export')
  @RequirePermissions('financial-reports:export')
  @ApiOperation({ summary: 'تصدير التقارير المالية' })
  @ApiQuery({ name: 'type', required: true })
  @ApiQuery({ name: 'format', required: false })
  async exportReport(
    @CurrentUser('organizationId') organizationId: string,
    @Query('type') type: string,
    @Query('format') format: string = 'excel',
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const { data, filename, mimeType } = await this.reportsService.exportReport(
      organizationId,
      type,
      format,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return data;
  }
}
