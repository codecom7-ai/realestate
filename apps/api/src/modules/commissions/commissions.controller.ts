// ═══════════════════════════════════════════════════════════════
// Commissions Controller - وحدة تحكم العمولات
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
  Request,
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
import { PERMISSIONS, CommissionStatus } from '@realestate/shared-types';
import { CommissionsService } from './commissions.service';
import {
  GetCommissionsDto,
  CalculateCommissionDto,
  ApproveCommissionDto,
  SettleCommissionDto,
  PayCommissionDto,
  UpdateCommissionDto,
  CalculateDealCommissionsDto,
} from './dto/commissions.dto';

@ApiTags('Commissions')
@ApiBearerAuth()
@Controller('commissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  // ─────────────────────────────────────────────────────────────────
  // GET Endpoints
  // ─────────────────────────────────────────────────────────────────

  /**
   * الحصول على قائمة العمولات
   */
  @Get()
  @RequirePermissions(PERMISSIONS.COMMISSIONS_READ)
  @ApiOperation({ summary: 'الحصول على قائمة العمولات', description: 'قائمة جميع العمولات مع إمكانية الفلترة والصفحات' })
  @ApiResponse({ status: 200, description: 'قائمة العمولات' })
  @ApiResponse({ status: 401, description: 'غير مصادق عليه' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية' })
  async findAll(@Request() req: any, @Query() query: GetCommissionsDto) {
    return this.commissionsService.findAll(req.user.organizationId, query);
  }

  /**
   * الحصول على إحصائيات العمولات
   */
  @Get('stats')
  @RequirePermissions(PERMISSIONS.COMMISSIONS_READ)
  @ApiOperation({ summary: 'الحصول على إحصائيات العمولات', description: 'إحصائيات شاملة عن العمولات' })
  @ApiResponse({ status: 200, description: 'إحصائيات العمولات' })
  async getStats(@Request() req: any) {
    return this.commissionsService.getStats(req.user.organizationId);
  }

  /**
   * الحصول على عمولات صفقة معينة
   */
  @Get('deal/:dealId')
  @RequirePermissions(PERMISSIONS.COMMISSIONS_READ)
  @ApiOperation({ summary: 'الحصول على عمولات صفقة', description: 'جميع عمولات صفقة معينة' })
  @ApiParam({ name: 'dealId', description: 'معرف الصفقة' })
  @ApiResponse({ status: 200, description: 'عمولات الصفقة' })
  async getDealCommissions(@Request() req: any, @Param('dealId') dealId: string) {
    return this.commissionsService.getDealCommissions(dealId, req.user.organizationId);
  }

  /**
   * الحصول على عمولة بالمعرف
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.COMMISSIONS_READ)
  @ApiOperation({ summary: 'الحصول على تفاصيل عمولة', description: 'تفاصيل عمولة واحدة بالمعرف' })
  @ApiParam({ name: 'id', description: 'معرف العمولة' })
  @ApiResponse({ status: 200, description: 'تفاصيل العمولة' })
  @ApiResponse({ status: 404, description: 'العمولة غير موجودة' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.commissionsService.findOne(id, req.user.organizationId);
  }

  // ─────────────────────────────────────────────────────────────────
  // POST Endpoints
  // ─────────────────────────────────────────────────────────────────

  /**
   * حساب عمولات صفقة تلقائياً
   */
  @Post('calculate')
  @RequirePermissions(PERMISSIONS.COMMISSIONS_APPROVE)
  @ApiOperation({ 
    summary: 'حساب عمولات صفقة تلقائياً', 
    description: 'حساب وتوزيع العمولات تلقائياً عند إغلاق صفقة' 
  })
  @ApiResponse({ status: 201, description: 'تم حساب العمولات بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة أو الصفقة غير مغلقة' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  @ApiResponse({ status: 409, description: 'العمولات موجودة بالفعل' })
  async calculateDealCommissions(
    @Request() req: any,
    @Body() dto: CalculateDealCommissionsDto,
  ) {
    return this.commissionsService.calculateDealCommissions(
      dto,
      req.user.organizationId,
      req.user.id,
    );
  }

  /**
   * إنشاء عمولة يدوياً
   */
  @Post()
  @RequirePermissions(PERMISSIONS.COMMISSIONS_APPROVE)
  @ApiOperation({ summary: 'إنشاء عمولة يدوياً', description: 'إضافة عمولة جديدة يدوياً' })
  @ApiResponse({ status: 201, description: 'تم إنشاء العمولة' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  async create(@Request() req: any, @Body() dto: CalculateCommissionDto) {
    return this.commissionsService.create(dto, req.user.organizationId, req.user.id);
  }

  /**
   * الموافقة على عمولة (قفل العمولة)
   */
  @Post(':id/approve')
  @RequirePermissions(PERMISSIONS.COMMISSIONS_APPROVE)
  @ApiOperation({ 
    summary: 'الموافقة على عمولة', 
    description: 'الموافقة على عمولة وقفلها لمنع التعديل' 
  })
  @ApiParam({ name: 'id', description: 'معرف العمولة' })
  @ApiResponse({ status: 200, description: 'تمت الموافقة على العمولة وقفلها' })
  @ApiResponse({ status: 400, description: 'حالة العمولة لا تسمح بالم Approve' })
  @ApiResponse({ status: 404, description: 'العمولة غير موجودة' })
  async approve(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ApproveCommissionDto,
  ) {
    return this.commissionsService.approve(id, dto, req.user.organizationId, req.user.id);
  }

  /**
   * تسوية عمولة
   */
  @Post(':id/settle')
  @RequirePermissions(PERMISSIONS.COMMISSIONS_SETTLE)
  @ApiOperation({ 
    summary: 'تسوية عمولة', 
    description: 'تسوية عمولة معتمدة وإعدادها للدفع' 
  })
  @ApiParam({ name: 'id', description: 'معرف العمولة' })
  @ApiResponse({ status: 200, description: 'تمت تسوية العمولة' })
  @ApiResponse({ status: 400, description: 'العمولة غير معتمدة أو غير مقفولة' })
  @ApiResponse({ status: 404, description: 'العمولة غير موجودة' })
  async settle(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SettleCommissionDto,
  ) {
    return this.commissionsService.settle(id, dto, req.user.organizationId, req.user.id);
  }

  /**
   * دفع عمولة
   */
  @Post(':id/pay')
  @RequirePermissions(PERMISSIONS.COMMISSIONS_PAY)
  @ApiOperation({ 
    summary: 'دفع عمولة', 
    description: 'تسجيل دفع عمولة مستقرة' 
  })
  @ApiParam({ name: 'id', description: 'معرف العمولة' })
  @ApiResponse({ status: 200, description: 'تم دفع العمولة' })
  @ApiResponse({ status: 400, description: 'العمولة غير مستقرة' })
  @ApiResponse({ status: 404, description: 'العمولة غير موجودة' })
  async pay(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: PayCommissionDto,
  ) {
    return this.commissionsService.pay(id, dto, req.user.organizationId, req.user.id);
  }

  /**
   * وضع عمولة في حالة نزاع
   */
  @Post(':id/dispute')
  @RequirePermissions(PERMISSIONS.COMMISSIONS_APPROVE)
  @ApiOperation({ 
    summary: 'وضع عمولة في حالة نزاع', 
    description: 'تحويل عمولة إلى حالة نزاع' 
  })
  @ApiParam({ name: 'id', description: 'معرف العمولة' })
  @ApiResponse({ status: 200, description: 'تم وضع العمولة في حالة نزاع' })
  @ApiResponse({ status: 400, description: 'العمولة مدفوعة بالفعل' })
  @ApiResponse({ status: 404, description: 'العمولة غير موجودة' })
  async dispute(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.commissionsService.dispute(id, reason, req.user.organizationId, req.user.id);
  }

  /**
   * حل نزاع عمولة
   */
  @Post(':id/resolve-dispute')
  @RequirePermissions(PERMISSIONS.COMMISSIONS_APPROVE)
  @ApiOperation({ 
    summary: 'حل نزاع عمولة', 
    description: 'إنهاء نزاع عمولة وتحديد حالتها الجديدة' 
  })
  @ApiParam({ name: 'id', description: 'معرف العمولة' })
  @ApiResponse({ status: 200, description: 'تم حل النزاع' })
  @ApiResponse({ status: 400, description: 'العمولة ليست في حالة نزاع' })
  @ApiResponse({ status: 404, description: 'العمولة غير موجودة' })
  async resolveDispute(
    @Request() req: any,
    @Param('id') id: string,
    @Body('resolution') resolution: string,
    @Body('newStatus') newStatus: CommissionStatus,
  ) {
    return this.commissionsService.resolveDispute(
      id,
      resolution,
      newStatus,
      req.user.organizationId,
      req.user.id,
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // PATCH Endpoints
  // ─────────────────────────────────────────────────────────────────

  /**
   * تحديث عمولة (قبل القفل فقط)
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.COMMISSIONS_APPROVE)
  @ApiOperation({ 
    summary: 'تحديث عمولة', 
    description: 'تحديث بيانات عمولة (قبل القفل فقط)' 
  })
  @ApiParam({ name: 'id', description: 'معرف العمولة' })
  @ApiResponse({ status: 200, description: 'تم تحديث العمولة' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  @ApiResponse({ status: 403, description: 'العمولة مقفولة لا يمكن تعديلها' })
  @ApiResponse({ status: 404, description: 'العمولة غير موجودة' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCommissionDto,
  ) {
    return this.commissionsService.update(id, dto, req.user.organizationId, req.user.id);
  }
}
