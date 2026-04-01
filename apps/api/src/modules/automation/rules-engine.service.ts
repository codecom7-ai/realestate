// ═══════════════════════════════════════════════════════════════
// Rules Engine Service - محرك قواعد الأتمتة
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ConditionGroupDto,
  ConditionDto,
  ConditionOperator,
  ActionConfigDto,
  AutomationAction,
  AutomationTrigger,
  SendNotificationActionDto,
  SendWhatsappActionDto,
  CreateTaskActionDto,
  AssignLeadActionDto,
  UpdateFieldActionDto,
  AUTOMATION_ACTION_AR,
} from './dto/automation.dto';

/**
 * سياق تنفيذ القاعدة
 */
export interface RuleExecutionContext {
  ruleId: string;
  organizationId: string;
  trigger: AutomationTrigger;
  entityId: string;
  entityType: string;
  eventData: Record<string, any>;
  userId?: string;
}

/**
 * نتيجة مطابقة الشرط
 */
interface ConditionMatchResult {
  matches: boolean;
  matchedConditions: string[];
  unmatchedConditions: string[];
}

/**
 * نتيجة تنفيذ الإجراء
 */
interface ActionExecutionResult {
  success: boolean;
  action: AutomationAction;
  error?: string;
  data?: any;
}

@Injectable()
export class RulesEngineService {
  private readonly logger = new Logger(RulesEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
  ) {}

  /**
   * تقييم مجموعة شروط
   */
  evaluateConditions(
    conditions: ConditionGroupDto | undefined,
    data: Record<string, any>,
  ): ConditionMatchResult {
    const result: ConditionMatchResult = {
      matches: true,
      matchedConditions: [],
      unmatchedConditions: [],
    };

    // إذا لم تكن هناك شروط، تعتبر مطابقة
    if (!conditions || !conditions.conditions || conditions.conditions.length === 0) {
      return result;
    }

    const conditionResults: boolean[] = [];

    for (const condition of conditions.conditions) {
      const evaluation = this.evaluateSingleCondition(condition, data);
      const conditionDesc = `${condition.field} ${condition.operator} ${condition.value || ''}`.trim();

      if (evaluation) {
        result.matchedConditions.push(conditionDesc);
      } else {
        result.unmatchedConditions.push(conditionDesc);
      }

      conditionResults.push(evaluation);
    }

    // تقييم المجموعات الفرعية
    if (conditions.groups && conditions.groups.length > 0) {
      for (const group of conditions.groups) {
        const groupResult = this.evaluateConditions(group, data);
        result.matchedConditions.push(...groupResult.matchedConditions);
        result.unmatchedConditions.push(...groupResult.unmatchedConditions);
        conditionResults.push(groupResult.matches);
      }
    }

    // تحديد النتيجة النهائية بناءً على نوع الربط
    if (conditions.type === 'and') {
      result.matches = conditionResults.every(Boolean);
    } else {
      result.matches = conditionResults.some(Boolean);
    }

    return result;
  }

  /**
   * تقييم شرط واحد
   */
  private evaluateSingleCondition(
    condition: ConditionDto,
    data: Record<string, any>,
  ): boolean {
    const fieldValue = this.getNestedValue(data, condition.field);

    switch (condition.operator) {
      case ConditionOperator.EQUALS:
        return fieldValue === condition.value;

      case ConditionOperator.NOT_EQUALS:
        return fieldValue !== condition.value;

      case ConditionOperator.CONTAINS:
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(condition.value);
        }
        return String(fieldValue).includes(String(condition.value));

      case ConditionOperator.GREATER_THAN:
        return Number(fieldValue) > Number(condition.value);

      case ConditionOperator.LESS_THAN:
        return Number(fieldValue) < Number(condition.value);

      case ConditionOperator.IN:
        return condition.values?.includes(fieldValue) ?? false;

      case ConditionOperator.NOT_IN:
        return !(condition.values?.includes(fieldValue) ?? true);

      case ConditionOperator.IS_EMPTY:
        return (
          fieldValue === undefined ||
          fieldValue === null ||
          fieldValue === '' ||
          (Array.isArray(fieldValue) && fieldValue.length === 0)
        );

      case ConditionOperator.IS_NOT_EMPTY:
        return (
          fieldValue !== undefined &&
          fieldValue !== null &&
          fieldValue !== '' &&
          !(Array.isArray(fieldValue) && fieldValue.length === 0)
        );

      default:
        this.logger.warn(`Unknown operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * الحصول على قيمة متداخلة من كائن
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) {
        return undefined;
      }
      return current[key];
    }, obj);
  }

  /**
   * استبدال المتغيرات في النص
   */
  interpolateVariables(
    template: string,
    data: Record<string, any>,
  ): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * تنفيذ قائمة إجراءات
   */
  async executeActions(
    actions: ActionConfigDto[],
    context: RuleExecutionContext,
  ): Promise<ActionExecutionResult[]> {
    // ترتيب الإجراءات حسب الترتيب
    const sortedActions = [...actions].sort((a, b) => (a.order || 0) - (b.order || 0));

    const results: ActionExecutionResult[] = [];

    for (const action of sortedActions) {
      try {
        // تطبيق التأخير إذا وجد
        if (action.delaySeconds && action.delaySeconds > 0) {
          await this.delay(action.delaySeconds * 1000);
        }

        const result = await this.executeSingleAction(action, context);
        results.push(result);

        if (!result.success) {
          this.logger.error(
            `Action ${action.type} failed for rule ${context.ruleId}: ${result.error}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error executing action ${action.type} for rule ${context.ruleId}: ${error}`,
        );
        results.push({
          success: false,
          action: action.type,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * تنفيذ إجراء واحد
   */
  private async executeSingleAction(
    action: ActionConfigDto,
    context: RuleExecutionContext,
  ): Promise<ActionExecutionResult> {
    switch (action.type) {
      case AutomationAction.SEND_NOTIFICATION:
        return this.executeSendNotification(
          action.config as SendNotificationActionDto,
          context,
        );

      case AutomationAction.SEND_WHATSAPP:
        return this.executeSendWhatsapp(
          action.config as SendWhatsappActionDto,
          context,
        );

      case AutomationAction.CREATE_TASK:
        return this.executeCreateTask(
          action.config as CreateTaskActionDto,
          context,
        );

      case AutomationAction.ASSIGN_LEAD:
        return this.executeAssignLead(
          action.config as AssignLeadActionDto,
          context,
        );

      case AutomationAction.UPDATE_FIELD:
        return this.executeUpdateField(
          action.config as UpdateFieldActionDto,
          context,
        );

      default:
        return {
          success: false,
          action: action.type,
          error: `Unknown action type: ${action.type}`,
        };
    }
  }

  /**
   * تنفيذ إجراء إرسال إشعار
   */
  private async executeSendNotification(
    config: SendNotificationActionDto,
    context: RuleExecutionContext,
  ): Promise<ActionExecutionResult> {
    try {
      const title = this.interpolateVariables(config.title, context.eventData);
      const body = this.interpolateVariables(config.body, context.eventData);

      // تحديد المستخدمين المستهدفين
      let targetUserIds: string[] = [];

      if (config.userId) {
        // يمكن أن يكون معرف مستخدم محدد أو متغير
        const resolvedUserId = this.interpolateVariables(
          config.userId,
          context.eventData,
        );
        if (resolvedUserId && !resolvedUserId.startsWith('{{')) {
          targetUserIds = [resolvedUserId];
        }
      } else if (config.role) {
        // إرسال لجميع المستخدمين بهذا الدور
        const users = await this.prisma.user.findMany({
          where: {
            organizationId: context.organizationId,
            role: config.role as any,
            isActive: true,
          },
          select: { id: true },
        });
        targetUserIds = users.map((u: { id: string }) => u.id);
      } else if (context.userId) {
        // إرسال للمستخدم الذي أ_trigger الحدث
        targetUserIds = [context.userId];
      }

      if (targetUserIds.length === 0) {
        return {
          success: false,
          action: AutomationAction.SEND_NOTIFICATION,
          error: 'No target users specified',
        };
      }

      // إنشاء الإشعارات
      const notifications = await Promise.all(
        targetUserIds.map((userId) =>
          this.prisma.notification.create({
            data: {
              organizationId: context.organizationId,
              userId,
              type: 'automation',
              title,
              body,
              data: JSON.stringify({
                ruleId: context.ruleId,
                entityId: context.entityId,
                entityType: context.entityType,
              }),
              channel: 'in_app',
            },
          }),
        ),
      );

      this.logger.log(
        `Sent ${notifications.length} notifications for rule ${context.ruleId}`,
      );

      return {
        success: true,
        action: AutomationAction.SEND_NOTIFICATION,
        data: { notificationCount: notifications.length },
      };
    } catch (error) {
      return {
        success: false,
        action: AutomationAction.SEND_NOTIFICATION,
        error: error.message,
      };
    }
  }

  /**
   * تنفيذ إجراء إرسال واتساب
   */
  private async executeSendWhatsapp(
    config: SendWhatsappActionDto,
    context: RuleExecutionContext,
  ): Promise<ActionExecutionResult> {
    try {
      // تحديد رقم الهاتف المستهدف
      let toPhone = config.toPhone;

      if (!toPhone) {
        // محاولة الحصول على رقم الهاتف من بيانات الحدث
        toPhone = context.eventData.client?.phone || context.eventData.phone;
      }

      if (!toPhone) {
        return {
          success: false,
          action: AutomationAction.SEND_WHATSAPP,
          error: 'No target phone number',
        };
      }

      // استبدال المتغيرات في معاملات القالب
      const templateParams = config.templateParams?.map((param) =>
        this.interpolateVariables(param, context.eventData),
      );

      // إرسال الحدث لـ WhatsApp service
      this.eventEmitter.emit('whatsapp.send_template', {
        to: toPhone,
        templateName: config.templateName,
        templateParams: templateParams || [],
        organizationId: context.organizationId,
      });

      this.logger.log(
        `Queued WhatsApp message for rule ${context.ruleId} to ${toPhone}`,
      );

      return {
        success: true,
        action: AutomationAction.SEND_WHATSAPP,
        data: { to: toPhone, template: config.templateName },
      };
    } catch (error) {
      return {
        success: false,
        action: AutomationAction.SEND_WHATSAPP,
        error: error.message,
      };
    }
  }

  /**
   * تنفيذ إجراء إنشاء مهمة
   */
  private async executeCreateTask(
    config: CreateTaskActionDto,
    context: RuleExecutionContext,
  ): Promise<ActionExecutionResult> {
    try {
      const title = this.interpolateVariables(config.title, context.eventData);
      const description = config.description
        ? this.interpolateVariables(config.description, context.eventData)
        : undefined;

      // حساب تاريخ الاستحقاق
      let dueDate: Date | undefined;
      if (config.dueInDays !== undefined) {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + config.dueInDays);
      }

      // إنشاء النشاط كمهمة
      const activity = await this.prisma.activity.create({
        data: {
          organizationId: context.organizationId,
          userId: config.assignedToId || context.userId,
          entityType: context.entityType,
          entityId: context.entityId,
          activityType: 'task',
          title,
          body: description,
          metadata: {
            priority: config.priority || 'medium',
            dueDate: dueDate?.toISOString(),
            status: 'pending',
            createdByRule: context.ruleId,
          },
        },
      });

      this.logger.log(`Created task for rule ${context.ruleId}: ${activity.id}`);

      return {
        success: true,
        action: AutomationAction.CREATE_TASK,
        data: { activityId: activity.id },
      };
    } catch (error) {
      return {
        success: false,
        action: AutomationAction.CREATE_TASK,
        error: error.message,
      };
    }
  }

  /**
   * تنفيذ إجراء تعيين عميل محتمل
   */
  private async executeAssignLead(
    config: AssignLeadActionDto,
    context: RuleExecutionContext,
  ): Promise<ActionExecutionResult> {
    try {
      // التحقق من أن الكيان هو lead
      if (context.entityType !== 'lead') {
        return {
          success: false,
          action: AutomationAction.ASSIGN_LEAD,
          error: 'Entity is not a lead',
        };
      }

      let assignToUserId = config.userId;

      // استخدام التوزيع التلقائي إذا كان مفعلاً
      if (config.useRoundRobin) {
        // الحصول على قائمة السماسرة النشطين
        const brokers = await this.prisma.user.findMany({
          where: {
            organizationId: context.organizationId,
            role: 'BROKER',
            isActive: true,
          },
          select: { id: true },
        });

        if (brokers.length > 0) {
          // توزيع دوري بسيط (يمكن تحسينه لاحقاً)
          const leadCount = await this.prisma.lead.count({
            where: { organizationId: context.organizationId },
          });
          const brokerIndex = leadCount % brokers.length;
          assignToUserId = brokers[brokerIndex].id;
        }
      }

      // تحديث الـ Lead
      const lead = await this.prisma.lead.update({
        where: { id: context.entityId },
        data: { assignedToId: assignToUserId },
      });

      this.logger.log(
        `Assigned lead ${context.entityId} to user ${assignToUserId} for rule ${context.ruleId}`,
      );

      return {
        success: true,
        action: AutomationAction.ASSIGN_LEAD,
        data: { leadId: lead.id, assignedTo: assignToUserId },
      };
    } catch (error) {
      return {
        success: false,
        action: AutomationAction.ASSIGN_LEAD,
        error: error.message,
      };
    }
  }

  /**
   * تنفيذ إجراء تحديث حقل
   */
  private async executeUpdateField(
    config: UpdateFieldActionDto,
    context: RuleExecutionContext,
  ): Promise<ActionExecutionResult> {
    try {
      // تحديد الجدول بناءً على نوع الكيان
      const entityModelMap: Record<string, string> = {
        lead: 'lead',
        deal: 'deal',
        client: 'client',
        property: 'property',
        payment: 'payment',
      };

      const modelName = entityModelMap[context.entityType];
      if (!modelName) {
        return {
          success: false,
          action: AutomationAction.UPDATE_FIELD,
          error: `Unknown entity type: ${context.entityType}`,
        };
      }

      // تنفيذ التحديث
      // ملاحظة: هذا تطبيق مبسط، يجب تعميمه لاحقاً
      let updateData: any = {};

      if (config.mode === 'append' && Array.isArray(config.value)) {
        // إضافة للقائمة (تحتاج منطق خاص)
        updateData[config.field] = { push: config.value };
      } else if (config.mode === 'remove' && Array.isArray(config.value)) {
        // إزالة من القائمة (تحتاج منطق خاص)
        // Prisma لا يدعم pull مباشرة، يجب استخدام raw query
        this.logger.warn(
          `Remove mode not fully implemented for field ${config.field}`,
        );
        return {
          success: false,
          action: AutomationAction.UPDATE_FIELD,
          error: 'Remove mode not fully implemented',
        };
      } else {
        // تعيين القيمة
        updateData[config.field] = config.value;
      }

      // تحديث باستخدام Prisma
      const entity = await (this.prisma as any)[modelName].update({
        where: { id: context.entityId },
        data: updateData,
      });

      this.logger.log(
        `Updated field ${config.field} for ${context.entityType} ${context.entityId}`,
      );

      return {
        success: true,
        action: AutomationAction.UPDATE_FIELD,
        data: { field: config.field, value: config.value },
      };
    } catch (error) {
      return {
        success: false,
        action: AutomationAction.UPDATE_FIELD,
        error: error.message,
      };
    }
  }

  /**
   * تأخير التنفيذ
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * اختبار قاعدة على بيانات معينة
   */
  testRule(
    conditions: ConditionGroupDto | undefined,
    actions: ActionConfigDto[],
    testData: Record<string, any>,
  ): {
    matches: boolean;
    matchedConditions: string[];
    unmatchedConditions: string[];
    actionsToExecute: string[];
  } {
    const result = this.evaluateConditions(conditions, testData);

    return {
      matches: result.matches,
      matchedConditions: result.matchedConditions,
      unmatchedConditions: result.unmatchedConditions,
      actionsToExecute: actions.map(
        (a) => AUTOMATION_ACTION_AR[a.type] || a.type,
      ),
    };
  }
}
