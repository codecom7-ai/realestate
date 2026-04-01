// ═══════════════════════════════════════════════════════════════
// Dashboard Controller - واجهة API لوحة التحكم
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { DashboardService } from './dashboard.service';
import { DashboardStatsDto, DashboardKpisDto } from './dto/dashboard.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@realestate/shared-types';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly configService: ConfigService,
  ) {}

  private getOrganizationId(): string {
    return this.configService.get<string>('app.orgId') || '';
  }

  // ═══════════════════════════════════════════════════════════════
  // الحصول على إحصائيات Dashboard كاملة
  // ═══════════════════════════════════════════════════════════════

  @Get()
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'لوحة التحكم التنفيذية',
    description: 'يُرجع جميع الإحصائيات والرسوم البيانية للوحة التحكم',
  })
  @ApiResponse({
    status: 200,
    description: 'إحصائيات لوحة التحكم',
    type: DashboardStatsDto,
  })
  async getDashboardStats(): Promise<DashboardStatsDto> {
    return this.dashboardService.getDashboardStats(this.getOrganizationId());
  }

  // ═══════════════════════════════════════════════════════════════
  // الحصول على KPIs فقط
  // ═══════════════════════════════════════════════════════════════

  @Get('kpis')
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'بطاقات KPI',
    description: 'يُرجع بطاقات المؤشرات الرئيسية فقط',
  })
  @ApiResponse({
    status: 200,
    description: 'بطاقات KPI',
    type: DashboardKpisDto,
  })
  async getKpis(): Promise<DashboardKpisDto> {
    return this.dashboardService.getKpis(this.getOrganizationId());
  }

  // ═══════════════════════════════════════════════════════════════
  // تحديث الـ Cache
  // ═══════════════════════════════════════════════════════════════

  @Get('refresh')
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'تحديث البيانات',
    description: 'يُلغي الـ cache ويُجلب بيانات جديدة',
  })
  @ApiResponse({
    status: 200,
    description: 'تم تحديث البيانات',
    type: DashboardStatsDto,
  })
  async refreshDashboard(): Promise<DashboardStatsDto> {
    const orgId = this.getOrganizationId();
    await this.dashboardService.invalidateCache(orgId);
    return this.dashboardService.getDashboardStats(orgId);
  }
}
