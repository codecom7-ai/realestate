// ═══════════════════════════════════════════════════════════════
// Settings Controller - واجهة برمجة التطبيقات للإعدادات
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';
import {
  SettingCategory,
  SettingResponseDto,
  SettingCategoryResponseDto,
  AllSettingsResponseDto,
  TestConnectionResponseDto,
  UpdateSettingDto,
  UpdateSettingsCategoryDto,
} from './dto/settings.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ═══════════════════════════════════════════════════════════════
  // GET /settings - جلب كل الإعدادات
  // ═══════════════════════════════════════════════════════════════

  @Get()
  @RequirePermissions('organization:settings:read')
  @ApiOperation({ summary: 'جلب كل الإعدادات', description: 'جلب جميع إعدادات التكاملات مع القيم المخفية' })
  @ApiResponse({ status: 200, description: 'قائمة الإعدادات', type: AllSettingsResponseDto })
  async getAllSettings(
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<AllSettingsResponseDto> {
    return this.settingsService.getAllSettings(organizationId);
  }

  // ═══════════════════════════════════════════════════════════════
  // GET /settings/:category - جلب إعدادات فئة معينة
  // ═══════════════════════════════════════════════════════════════

  @Get(':category')
  @RequirePermissions('organization:settings:read')
  @ApiOperation({ summary: 'جلب إعدادات فئة معينة', description: 'جلب إعدادات تكامل معين (eta, ai, payments, ...)' })
  @ApiParam({ name: 'category', enum: SettingCategory, description: 'فئة الإعدادات' })
  @ApiResponse({ status: 200, description: 'إعدادات الفئة', type: SettingCategoryResponseDto })
  async getCategorySettings(
    @CurrentUser('organizationId') organizationId: string,
    @Param('category') category: SettingCategory,
  ): Promise<SettingCategoryResponseDto> {
    return this.settingsService.getCategorySettings(organizationId, category);
  }

  // ═══════════════════════════════════════════════════════════════
  // GET /settings/:category/:key - جلب قيمة إعداد معين
  // ═══════════════════════════════════════════════════════════════

  @Get(':category/:key')
  @RequirePermissions('organization:settings:read')
  @ApiOperation({ summary: 'جلب قيمة إعداد معين', description: 'جلب قيمة إعداد محدد (للاستخدام الداخلي فقط)' })
  @ApiParam({ name: 'category', enum: SettingCategory })
  @ApiParam({ name: 'key', description: 'مفتاح الإعداد' })
  @ApiResponse({ status: 200, description: 'قيمة الإعداد' })
  async getSettingValue(
    @CurrentUser('organizationId') organizationId: string,
    @Param('category') category: SettingCategory,
    @Param('key') key: string,
  ) {
    return this.settingsService.getSettingValue(organizationId, category, key, false);
  }

  // ═══════════════════════════════════════════════════════════════
  // PATCH /settings/:category/:key - تحديث قيمة إعداد
  // ═══════════════════════════════════════════════════════════════

  @Patch(':category/:key')
  @RequirePermissions('organization:settings:write')
  @ApiOperation({ summary: 'تحديث قيمة إعداد', description: 'تحديث قيمة إعداد معين مع التشفير للقيم الحساسة' })
  @ApiParam({ name: 'category', enum: SettingCategory })
  @ApiParam({ name: 'key', description: 'مفتاح الإعداد' })
  @ApiResponse({ status: 200, description: 'الإعداد المحدث', type: SettingResponseDto })
  async updateSetting(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
    @Param('category') category: SettingCategory,
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @Req() req: FastifyRequest,
  ): Promise<SettingResponseDto> {
    return this.settingsService.updateSetting(
      organizationId,
      category,
      key,
      dto,
      userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PATCH /settings/:category - تحديث عدة إعدادات لفئة
  // ═══════════════════════════════════════════════════════════════

  @Patch(':category')
  @RequirePermissions('organization:settings:write')
  @ApiOperation({ summary: 'تحديث عدة إعدادات', description: 'تحديث جميع إعدادات فئة معينة' })
  @ApiParam({ name: 'category', enum: SettingCategory })
  @ApiResponse({ status: 200, description: 'إعدادات الفئة المحدثة', type: SettingCategoryResponseDto })
  async updateCategorySettings(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
    @Param('category') category: SettingCategory,
    @Body() dto: UpdateSettingsCategoryDto,
    @Req() req: FastifyRequest,
  ): Promise<SettingCategoryResponseDto> {
    return this.settingsService.updateCategorySettings(
      organizationId,
      category,
      dto,
      userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // POST /settings/test/:category - اختبار الاتصال
  // ═══════════════════════════════════════════════════════════════

  @Post('test/:category')
  @RequirePermissions('organization:settings:write')
  @ApiOperation({ summary: 'اختبار اتصال', description: 'اختبار صحة إعدادات التكامل' })
  @ApiParam({ name: 'category', enum: SettingCategory })
  @ApiResponse({ status: 200, description: 'نتيجة الاختبار', type: TestConnectionResponseDto })
  async testConnection(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
    @Param('category') category: SettingCategory,
    @Req() req: FastifyRequest,
  ): Promise<TestConnectionResponseDto> {
    return this.settingsService.testConnection(
      organizationId,
      category,
      userId,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
