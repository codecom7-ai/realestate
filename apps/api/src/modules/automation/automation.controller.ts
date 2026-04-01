// ═══════════════════════════════════════════════════════════════
// Automation Controller - واجهة API قواعد الأتمتة
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
import { AutomationService } from './automation.service';
import {
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  GetAutomationRulesDto,
  ToggleAutomationRuleDto,
  AutomationTrigger,
} from './dto/automation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@realestate/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Automation')
@ApiBearerAuth()
@Controller('automation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AutomationController {
  constructor(
    private readonly automationService: AutomationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * الحصول على معرف المؤسسة (مكتب واحد فقط)
   */
  private getOrganizationId(): string {
    return this.configService.get<string>('app.orgId') || '';
  }

  // ═══════════════════════════════════════════════════════════════
  // Rules Endpoints
  // ═══════════════════════════════════════════════════════════════

  @Post('rules')
  @RequirePermissions(PERMISSIONS.AUTOMATION_WRITE)
  @ApiOperation({
    summary: 'إنشاء قاعدة أتمتة جديدة',
    description: 'Creates a new automation rule with trigger, conditions, and actions.',
  })
  @ApiResponse({
    status: 201,
    description: 'تم إنشاء القاعدة بنجاح',
  })
  @ApiResponse({
    status: 400,
    description: 'بيانات غير صالحة',
    schema: {
      example: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid action configuration',
          messageAr: 'تكوين الإجراء غير صالح',
        },
      },
    },
  })
  async create(
    @Body() createDto: CreateAutomationRuleDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.automationService.create(
      createDto,
      this.getOrganizationId(),
      userId,
    );
  }

  @Get('rules')
  @RequirePermissions(PERMISSIONS.AUTOMATION_READ)
  @ApiOperation({
    summary: 'قائمة قواعد الأتمتة',
    description: 'Returns paginated list of automation rules with filters.',
  })
  @ApiQuery({ name: 'trigger', required: false, enum: AutomationTrigger, description: 'فلترة حسب المحفز' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'فلترة حسب حالة التفعيل' })
  @ApiQuery({ name: 'search', required: false, description: 'البحث في الاسم' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async findAll(
    @Query('trigger') trigger?: AutomationTrigger,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.automationService.findAll(this.getOrganizationId(), {
      trigger,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('rules/stats')
  @RequirePermissions(PERMISSIONS.AUTOMATION_READ)
  @ApiOperation({
    summary: 'إحصائيات قواعد الأتمتة',
    description: 'Returns statistics about automation rules.',
  })
  async getStats() {
    return this.automationService.getStats(this.getOrganizationId());
  }

  @Get('rules/:id')
  @RequirePermissions(PERMISSIONS.AUTOMATION_READ)
  @ApiOperation({
    summary: 'تفاصيل قاعدة الأتمتة',
    description: 'Returns automation rule details.',
  })
  @ApiParam({ name: 'id', description: 'معرف القاعدة' })
  @ApiResponse({
    status: 404,
    description: 'القاعدة غير موجودة',
    schema: {
      example: {
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: 'Automation rule not found',
          messageAr: 'قاعدة الأتمتة غير موجودة',
        },
      },
    },
  })
  async findOne(@Param('id') id: string) {
    return this.automationService.findOne(id, this.getOrganizationId());
  }

  @Patch('rules/:id')
  @RequirePermissions(PERMISSIONS.AUTOMATION_WRITE)
  @ApiOperation({
    summary: 'تحديث قاعدة الأتمتة',
    description: 'Updates automation rule configuration.',
  })
  @ApiParam({ name: 'id', description: 'معرف القاعدة' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAutomationRuleDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.automationService.update(
      id,
      updateDto,
      this.getOrganizationId(),
      userId,
    );
  }

  @Delete('rules/:id')
  @RequirePermissions(PERMISSIONS.AUTOMATION_WRITE)
  @ApiOperation({
    summary: 'حذف قاعدة الأتمتة',
    description: 'Deletes an automation rule.',
  })
  @ApiParam({ name: 'id', description: 'معرف القاعدة' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.automationService.remove(id, this.getOrganizationId(), userId);
  }

  @Post('rules/:id/toggle')
  @RequirePermissions(PERMISSIONS.AUTOMATION_WRITE)
  @ApiOperation({
    summary: 'تفعيل/تعطيل قاعدة',
    description: 'Toggles automation rule active status.',
  })
  @ApiParam({ name: 'id', description: 'معرف القاعدة' })
  @ApiResponse({
    status: 200,
    description: 'تم تغيير حالة القاعدة',
  })
  @ApiResponse({
    status: 404,
    description: 'القاعدة غير موجودة',
  })
  async toggle(
    @Param('id') id: string,
    @Body() toggleDto: ToggleAutomationRuleDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.automationService.toggle(
      id,
      toggleDto.isActive,
      this.getOrganizationId(),
      userId,
    );
  }

  @Post('rules/:id/test')
  @RequirePermissions(PERMISSIONS.AUTOMATION_WRITE)
  @ApiOperation({
    summary: 'اختبار قاعدة',
    description: 'Tests an automation rule against provided data without executing actions.',
  })
  @ApiParam({ name: 'id', description: 'معرف القاعدة' })
  @ApiResponse({
    status: 200,
    description: 'نتيجة الاختبار',
    schema: {
      example: {
        matches: true,
        matchedConditions: ['stage equals NEGOTIATING'],
        unmatchedConditions: [],
        actionsToExecute: ['إرسال إشعار', 'إنشاء مهمة'],
      },
    },
  })
  async testRule(
    @Param('id') id: string,
    @Body() testData: Record<string, any>,
  ) {
    return this.automationService.testRule(
      id,
      testData,
      this.getOrganizationId(),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Triggers & Actions Info
  // ═══════════════════════════════════════════════════════════════

  @Get('triggers')
  @RequirePermissions(PERMISSIONS.AUTOMATION_READ)
  @ApiOperation({
    summary: 'قائمة المحفزات المدعومة',
    description: 'Returns list of supported automation triggers.',
  })
  getTriggers() {
    const { AUTOMATION_TRIGGER_AR, AutomationTrigger: triggers } = require('./dto/automation.dto');

    return {
      triggers: Object.values(triggers).map((t: AutomationTrigger) => ({
        value: t,
        label: AUTOMATION_TRIGGER_AR[t],
      })),
    };
  }

  @Get('actions')
  @RequirePermissions(PERMISSIONS.AUTOMATION_READ)
  @ApiOperation({
    summary: 'قائمة الإجراءات المدعومة',
    description: 'Returns list of supported automation actions.',
  })
  getActions() {
    const { AUTOMATION_ACTION_AR, AutomationAction: actions } = require('./dto/automation.dto');

    return {
      actions: Object.values(actions).map((a: any) => ({
        value: a,
        label: AUTOMATION_ACTION_AR[a],
      })),
    };
  }

  @Get('operators')
  @RequirePermissions(PERMISSIONS.AUTOMATION_READ)
  @ApiOperation({
    summary: 'قائمة أنواع المقارنة',
    description: 'Returns list of supported condition operators.',
  })
  getOperators() {
    const { ConditionOperator: operators } = require('./dto/automation.dto');

    const operatorLabels: Record<string, string> = {
      equals: 'يساوي',
      not_equals: 'لا يساوي',
      contains: 'يحتوي على',
      greater_than: 'أكبر من',
      less_than: 'أقل من',
      in: 'في القائمة',
      not_in: 'ليس في القائمة',
      is_empty: 'فارغ',
      is_not_empty: 'ليس فارغاً',
    };

    return {
      operators: Object.values(operators).map((o: any) => ({
        value: o,
        label: operatorLabels[o] || o,
      })),
    };
  }
}
