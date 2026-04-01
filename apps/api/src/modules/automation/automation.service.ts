// ═══════════════════════════════════════════════════════════════
// Automation Service - خدمة قواعد الأتمتة
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RulesEngineService, RuleExecutionContext } from './rules-engine.service';
import {
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  GetAutomationRulesDto,
  AutomationRuleDto,
  AutomationStatsDto,
  TestRuleResultDto,
  AutomationTrigger,
  AUTOMATION_TRIGGER_AR,
  ConditionGroupDto,
  ActionConfigDto,
} from './dto/automation.dto';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
    private readonly rulesEngine: RulesEngineService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CRUD Operations
  // ═══════════════════════════════════════════════════════════════

  /**
   * إنشاء قاعدة أتمتة جديدة
   */
  async create(
    dto: CreateAutomationRuleDto,
    organizationId: string,
    createdBy: string,
  ): Promise<AutomationRuleDto> {
    const rule = await this.prisma.automationRule.create({
      data: {
        organizationId,
        name: dto.name,
        trigger: dto.trigger,
        conditions: dto.conditions ? JSON.parse(JSON.stringify(dto.conditions)) : {},
        actions: JSON.parse(JSON.stringify(dto.actions)),
        isActive: dto.isActive ?? true,
      },
    });

    // إنشاء سجل تدقيق
    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'AUTOMATION_RULE_CREATED',
      entityType: 'automation_rule',
      entityId: rule.id,
      newValue: {
        name: rule.name,
        trigger: rule.trigger,
        isActive: rule.isActive,
      },
    });

    this.logger.log(`Created automation rule: ${rule.id} - ${rule.name}`);

    return this.mapToDto(rule);
  }

  /**
   * الحصول على قائمة القواعد
   */
  async findAll(
    organizationId: string,
    dto: GetAutomationRulesDto,
  ): Promise<{ data: AutomationRuleDto[]; meta: { total: number; page: number; limit: number; hasMore: boolean } }> {
    const { trigger, isActive, search, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (trigger) {
      where.trigger = trigger;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [rules, total] = await Promise.all([
      this.prisma.automationRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.automationRule.count({ where }),
    ]);

    return {
      data: rules.map((r: { id: string; organizationId: string; name: string; trigger: string; conditions: any; actions: any; isActive: boolean; lastRunAt: Date | null; runCount: number; createdAt: Date; updatedAt: Date }) => this.mapToDto(r)),
      meta: {
        total,
        page,
        limit,
        hasMore: skip + rules.length < total,
      },
    };
  }

  /**
   * الحصول على قاعدة بالمعرف
   */
  async findOne(id: string, organizationId: string): Promise<AutomationRuleDto> {
    const rule = await this.prisma.automationRule.findFirst({
      where: { id, organizationId },
    });

    if (!rule) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: 'Automation rule not found',
          messageAr: 'قاعدة الأتمتة غير موجودة',
        },
      });
    }

    return this.mapToDto(rule);
  }

  /**
   * تحديث قاعدة
   */
  async update(
    id: string,
    dto: UpdateAutomationRuleDto,
    organizationId: string,
    updatedBy: string,
  ): Promise<AutomationRuleDto> {
    const existing = await this.prisma.automationRule.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: 'Automation rule not found',
          messageAr: 'قاعدة الأتمتة غير موجودة',
        },
      });
    }

    const updateData: any = { updatedAt: new Date() };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.trigger !== undefined) updateData.trigger = dto.trigger;
    if (dto.conditions !== undefined) {
      updateData.conditions = JSON.parse(JSON.stringify(dto.conditions));
    }
    if (dto.actions !== undefined) {
      updateData.actions = JSON.parse(JSON.stringify(dto.actions));
    }
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const rule = await this.prisma.automationRule.update({
      where: { id },
      data: updateData,
    });

    // إنشاء سجل تدقيق
    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: 'AUTOMATION_RULE_UPDATED',
      entityType: 'automation_rule',
      entityId: id,
      oldValue: { name: existing.name, trigger: existing.trigger, isActive: existing.isActive },
      newValue: { name: rule.name, trigger: rule.trigger, isActive: rule.isActive },
    });

    this.logger.log(`Updated automation rule: ${id}`);

    return this.mapToDto(rule);
  }

  /**
   * حذف قاعدة
   */
  async remove(id: string, organizationId: string, deletedBy: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.automationRule.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: 'Automation rule not found',
          messageAr: 'قاعدة الأتمتة غير موجودة',
        },
      });
    }

    await this.prisma.automationRule.delete({
      where: { id },
    });

    // إنشاء سجل تدقيق
    await this.auditService.log({
      organizationId,
      userId: deletedBy,
      action: 'AUTOMATION_RULE_DELETED',
      entityType: 'automation_rule',
      entityId: id,
      oldValue: { name: existing.name, trigger: existing.trigger },
    });

    this.logger.log(`Deleted automation rule: ${id}`);

    return { success: true };
  }

  /**
   * تبديل حالة التفعيل
   */
  async toggle(
    id: string,
    isActive: boolean,
    organizationId: string,
    updatedBy: string,
  ): Promise<AutomationRuleDto> {
    const existing = await this.prisma.automationRule.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: 'Automation rule not found',
          messageAr: 'قاعدة الأتمتة غير موجودة',
        },
      });
    }

    const rule = await this.prisma.automationRule.update({
      where: { id },
      data: { isActive, updatedAt: new Date() },
    });

    // إنشاء سجل تدقيق
    await this.auditService.log({
      organizationId,
      userId: updatedBy,
      action: isActive ? 'AUTOMATION_RULE_ACTIVATED' : 'AUTOMATION_RULE_DEACTIVATED',
      entityType: 'automation_rule',
      entityId: id,
      oldValue: { isActive: existing.isActive },
      newValue: { isActive },
    });

    this.logger.log(
      `${isActive ? 'Activated' : 'Deactivated'} automation rule: ${id}`,
    );

    return this.mapToDto(rule);
  }

  /**
   * الحصول على إحصائيات
   */
  async getStats(organizationId: string): Promise<AutomationStatsDto> {
    const [totalRules, activeRules, totalRuns, byTrigger] = await Promise.all([
      this.prisma.automationRule.count({
        where: { organizationId },
      }),
      this.prisma.automationRule.count({
        where: { organizationId, isActive: true },
      }),
      this.prisma.automationRule.aggregate({
        where: { organizationId },
        _sum: { runCount: true },
      }),
      this.prisma.automationRule.groupBy({
        by: ['trigger'],
        where: { organizationId },
        _count: { trigger: true },
      }),
    ]);

    const byTriggerMap: Record<string, number> = {};
    for (const item of byTrigger) {
      byTriggerMap[item.trigger] = item._count.trigger;
    }

    return {
      totalRules,
      activeRules,
      totalRuns: totalRuns._sum.runCount || 0,
      byTrigger: byTriggerMap,
    };
  }

  /**
   * اختبار قاعدة
   */
  async testRule(
    id: string,
    testData: Record<string, any>,
    organizationId: string,
  ): Promise<TestRuleResultDto> {
    const rule = await this.findOne(id, organizationId);

    const result = this.rulesEngine.testRule(
      rule.conditions as unknown as ConditionGroupDto,
      rule.actions as unknown as ActionConfigDto[],
      testData,
    );

    return {
      matches: result.matches,
      matchedConditions: result.matchedConditions,
      unmatchedConditions: result.unmatchedConditions,
      actionsToExecute: result.actionsToExecute,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Event Handlers
  // ═══════════════════════════════════════════════════════════════

  /**
   * معالجة حدث إنشاء lead
   */
  @OnEvent('lead.created')
  async handleLeadCreated(event: any) {
    await this.processTrigger(AutomationTrigger.LEAD_CREATED, event);
  }

  /**
   * معالجة حدث تغيير مرحلة lead
   */
  @OnEvent('lead.stage_changed')
  async handleLeadStageChanged(event: any) {
    await this.processTrigger(AutomationTrigger.LEAD_STAGE_CHANGED, event);
  }

  /**
   * معالجة حدث تغيير مرحلة deal
   */
  @OnEvent('deal.stage_changed')
  async handleDealStageChanged(event: any) {
    await this.processTrigger(AutomationTrigger.DEAL_STAGE_CHANGED, event);
  }

  /**
   * معالجة حدث إغلاق deal
   */
  @OnEvent('deal.closed')
  async handleDealClosed(event: any) {
    await this.processTrigger(AutomationTrigger.DEAL_CLOSED, event);
  }

  /**
   * معالجة حدث استلام دفعة
   */
  @OnEvent('payment.received')
  async handlePaymentReceived(event: any) {
    await this.processTrigger(AutomationTrigger.PAYMENT_RECEIVED, event);
  }

  /**
   * معالجة حدث رفع مستند
   */
  @OnEvent('document.uploaded')
  async handleDocumentUploaded(event: any) {
    await this.processTrigger(AutomationTrigger.DOCUMENT_UPLOADED, event);
  }

  /**
   * معالجة حدث جدولة معاينة
   */
  @OnEvent('viewing.scheduled')
  async handleViewingScheduled(event: any) {
    await this.processTrigger(AutomationTrigger.VIEWING_SCHEDULED, event);
  }

  /**
   * معالجة حدث إتمام معاينة
   */
  @OnEvent('viewing.completed')
  async handleViewingCompleted(event: any) {
    await this.processTrigger(AutomationTrigger.VIEWING_COMPLETED, event);
  }

  /**
   * معالجة محفز عام
   */
  private async processTrigger(trigger: AutomationTrigger, event: any) {
    try {
      const { organizationId, entityId, entityType, data, userId } = event;

      if (!organizationId) {
        this.logger.warn(`Event missing organizationId: ${trigger}`);
        return;
      }

      // الحصول على القواعد النشطة لهذا المحفز
      const rules = await this.prisma.automationRule.findMany({
        where: {
          organizationId,
          trigger,
          isActive: true,
        },
      });

      if (rules.length === 0) {
        this.logger.debug(`No active rules for trigger: ${trigger}`);
        return;
      }

      this.logger.log(
        `Processing ${rules.length} rules for trigger: ${trigger}`,
      );

      // معالجة كل قاعدة
      for (const rule of rules) {
        try {
          const context: RuleExecutionContext = {
            ruleId: rule.id,
            organizationId,
            trigger: trigger as AutomationTrigger,
            entityId,
            entityType,
            eventData: data || {},
            userId,
          };

          // تقييم الشروط
          const conditions = rule.conditions as unknown as ConditionGroupDto | undefined;
          const conditionResult = this.rulesEngine.evaluateConditions(
            conditions,
            context.eventData,
          );

          if (conditionResult.matches) {
            this.logger.log(
              `Rule ${rule.id} matched for trigger ${trigger}, executing actions`,
            );

            // تنفيذ الإجراءات
            const actions = rule.actions as unknown as ActionConfigDto[];
            const results = await this.rulesEngine.executeActions(actions, context);

            // تحديث إحصائيات القاعدة
            await this.prisma.automationRule.update({
              where: { id: rule.id },
              data: {
                lastRunAt: new Date(),
                runCount: { increment: 1 },
              },
            });

            // تسجيل التنفيذ
            await this.auditService.log({
              organizationId,
              userId,
              action: 'AUTOMATION_RULE_EXECUTED',
              entityType: 'automation_rule',
              entityId: rule.id,
              newValue: {
                trigger,
                entityId,
                actionsExecuted: results.filter((r) => r.success).length,
                actionsFailed: results.filter((r) => !r.success).length,
              },
            });
          } else {
            this.logger.debug(
              `Rule ${rule.id} conditions not matched for trigger ${trigger}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error processing rule ${rule.id}: ${error}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error processing trigger ${trigger}: ${error}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════

  /**
   * تحويل القاعدة إلى DTO
   */
  private mapToDto(rule: any): AutomationRuleDto {
    return {
      id: rule.id,
      organizationId: rule.organizationId,
      name: rule.name,
      trigger: rule.trigger as AutomationTrigger,
      triggerAr: AUTOMATION_TRIGGER_AR[rule.trigger as AutomationTrigger] || rule.trigger,
      conditions: rule.conditions as unknown as ConditionGroupDto,
      actions: rule.actions as unknown as ActionConfigDto[],
      isActive: rule.isActive,
      lastRunAt: rule.lastRunAt,
      runCount: rule.runCount,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
