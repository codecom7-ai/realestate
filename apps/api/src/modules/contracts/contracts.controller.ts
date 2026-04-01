// ═══════════════════════════════════════════════════════════════
// Contracts Controller - وحدة تحكم العقود
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
  ParseUUIDPipe,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@realestate/shared-types';
import { ContractsService } from './contracts.service';
import {
  CreateContractDto,
  UpdateContractDto,
  SignContractDto,
  LinkDocumentDto,
  GetContractsDto,
} from './dto/contracts.dto';

@ApiTags('Contracts - العقود')
@ApiBearerAuth()
@Controller('contracts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  // ─────────────────────────────────────────────────────────────────
  // CRUD Endpoints
  // ─────────────────────────────────────────────────────────────────

  /**
   * الحصول على قائمة العقود
   */
  @Get()
  @RequirePermissions(PERMISSIONS.DEALS_READ)
  @ApiOperation({ summary: 'الحصول على قائمة العقود', description: 'جلب جميع العقود مع إمكانية الفلترة' })
  @ApiResponse({ status: 200, description: 'تم جلب العقود بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  async findAll(
    @Query() query: GetContractsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.contractsService.findAll(organizationId, query);
  }

  /**
   * الحصول على عقد صفقة معينة
   */
  @Get('deal/:dealId')
  @RequirePermissions(PERMISSIONS.DEALS_READ)
  @ApiOperation({ summary: 'الحصول على عقد صفقة', description: 'جلب عقد صفقة معينة' })
  @ApiParam({ name: 'dealId', description: 'معرف الصفقة' })
  @ApiResponse({ status: 200, description: 'تم جلب العقد بنجاح' })
  @ApiResponse({ status: 404, description: 'لا يوجد عقد لهذه الصفقة' })
  async getByDeal(
    @Param('dealId', ParseUUIDPipe) dealId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.contractsService.getByDeal(dealId, organizationId);
  }

  /**
   * الحصول على عقد بالمعرف
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.DEALS_READ)
  @ApiOperation({ summary: 'الحصول على عقد بالمعرف', description: 'جلب تفاصيل عقد محدد' })
  @ApiParam({ name: 'id', description: 'معرف العقد' })
  @ApiResponse({ status: 200, description: 'تم جلب العقد بنجاح' })
  @ApiResponse({ status: 404, description: 'العقد غير موجود' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.contractsService.findOne(id, organizationId);
  }

  /**
   * إنشاء عقد جديد
   */
  @Post()
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'إنشاء عقد جديد', description: 'إنشاء عقد جديد لصفقة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء العقد بنجاح' })
  @ApiResponse({ status: 400, description: 'مرحلة غير صالحة لإنشاء العقد' })
  @ApiResponse({ status: 404, description: 'الصفقة غير موجودة' })
  @ApiResponse({ status: 409, description: 'الصفقة لها عقد سابق' })
  async create(
    @Body() dto: CreateContractDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.contractsService.create(dto, organizationId, userId);
  }

  /**
   * تحديث عقد
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'تحديث عقد', description: 'تحديث بيانات عقد موجود' })
  @ApiParam({ name: 'id', description: 'معرف العقد' })
  @ApiResponse({ status: 200, description: 'تم تحديث العقد بنجاح' })
  @ApiResponse({ status: 404, description: 'العقد غير موجود' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.contractsService.update(id, dto, organizationId, userId);
  }

  /**
   * توقيع العقد
   */
  @Patch(':id/sign')
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'توقيع العقد', description: 'تسجيل توقيع العميل أو المكتب على العقد' })
  @ApiParam({ name: 'id', description: 'معرف العقد' })
  @ApiResponse({ status: 200, description: 'تم التوقيع بنجاح' })
  @ApiResponse({ status: 400, description: 'العقد موقّع مسبقاً' })
  @ApiResponse({ status: 404, description: 'العقد غير موجود' })
  async markSigned(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignContractDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.contractsService.markSigned(id, dto, organizationId, userId);
  }

  /**
   * توقيع العميل
   */
  @Post(':id/sign/client')
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'توقيع العميل', description: 'تسجيل توقيع العميل على العقد' })
  @ApiParam({ name: 'id', description: 'معرف العقد' })
  @ApiResponse({ status: 200, description: 'تم التوقيع بنجاح' })
  @ApiResponse({ status: 400, description: 'العقد موقّع مسبقاً من العميل' })
  @ApiResponse({ status: 404, description: 'العقد غير موجود' })
  async signByClient(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { signedAt?: string },
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.contractsService.markSigned(
      id,
      { signedBy: 'client', signedAt: body.signedAt },
      organizationId,
      userId,
    );
  }

  /**
   * توقيع المكتب
   */
  @Post(':id/sign/office')
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'توقيع المكتب', description: 'تسجيل توقيع المكتب على العقد' })
  @ApiParam({ name: 'id', description: 'معرف العقد' })
  @ApiResponse({ status: 200, description: 'تم التوقيع بنجاح' })
  @ApiResponse({ status: 400, description: 'العقد موقّع مسبقاً من المكتب' })
  @ApiResponse({ status: 404, description: 'العقد غير موجود' })
  async signByOffice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { signedAt?: string },
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.contractsService.markSigned(
      id,
      { signedBy: 'office', signedAt: body.signedAt },
      organizationId,
      userId,
    );
  }

  /**
   * رفع العقد الموقع
   */
  @Post(':id/upload')
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'رفع العقد الموقع', description: 'رفع ملف العقد الموقع' })
  @ApiParam({ name: 'id', description: 'معرف العقد' })
  @ApiResponse({ status: 200, description: 'تم رفع العقد بنجاح' })
  @ApiResponse({ status: 404, description: 'العقد غير موجود' })
  async uploadSigned(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkDocumentDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.contractsService.linkDocument(id, dto, organizationId, userId);
  }

  /**
   * ربط مستند بالعقد
   */
  @Patch(':id/document')
  @RequirePermissions(PERMISSIONS.DEALS_WRITE)
  @ApiOperation({ summary: 'ربط مستند', description: 'ربط ملف مستند بالعقد' })
  @ApiParam({ name: 'id', description: 'معرف العقد' })
  @ApiResponse({ status: 200, description: 'تم ربط المستند بنجاح' })
  @ApiResponse({ status: 404, description: 'العقد غير موجود' })
  async linkDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkDocumentDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.contractsService.linkDocument(id, dto, organizationId, userId);
  }
}
