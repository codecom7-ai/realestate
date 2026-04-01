// ═══════════════════════════════════════════════════════════════
// Automation DTOs - قواعد الأتمتة
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════════

/**
 * أنواع المحفزات المدعومة
 */
export enum AutomationTrigger {
  // Lead triggers
  LEAD_CREATED = 'lead.created',
  LEAD_STAGE_CHANGED = 'lead.stage_changed',

  // Deal triggers
  DEAL_STAGE_CHANGED = 'deal.stage_changed',
  DEAL_CLOSED = 'deal.closed',

  // Payment triggers
  PAYMENT_RECEIVED = 'payment.received',

  // Document triggers
  DOCUMENT_UPLOADED = 'document.uploaded',

  // Viewing triggers
  VIEWING_SCHEDULED = 'viewing.scheduled',
  VIEWING_COMPLETED = 'viewing.completed',
}

/**
 * أنواع الإجراءات المدعومة
 */
export enum AutomationAction {
  SEND_NOTIFICATION = 'send_notification',
  SEND_WHATSAPP = 'send_whatsapp',
  CREATE_TASK = 'create_task',
  ASSIGN_LEAD = 'assign_lead',
  UPDATE_FIELD = 'update_field',
}

/**
 * أسماء المحفزات بالعربية
 */
export const AUTOMATION_TRIGGER_AR: Record<AutomationTrigger, string> = {
  [AutomationTrigger.LEAD_CREATED]: 'إنشاء عميل محتمل',
  [AutomationTrigger.LEAD_STAGE_CHANGED]: 'تغيير مرحلة العميل المحتمل',
  [AutomationTrigger.DEAL_STAGE_CHANGED]: 'تغيير مرحلة الصفقة',
  [AutomationTrigger.DEAL_CLOSED]: 'إغلاق الصفقة',
  [AutomationTrigger.PAYMENT_RECEIVED]: 'استلام دفعة',
  [AutomationTrigger.DOCUMENT_UPLOADED]: 'رفع مستند',
  [AutomationTrigger.VIEWING_SCHEDULED]: 'جدولة معاينة',
  [AutomationTrigger.VIEWING_COMPLETED]: 'إتمام معاينة',
};

/**
 * أسماء الإجراءات بالعربية
 */
export const AUTOMATION_ACTION_AR: Record<AutomationAction, string> = {
  [AutomationAction.SEND_NOTIFICATION]: 'إرسال إشعار',
  [AutomationAction.SEND_WHATSAPP]: 'إرسال رسالة واتساب',
  [AutomationAction.CREATE_TASK]: 'إنشاء مهمة',
  [AutomationAction.ASSIGN_LEAD]: 'تعيين العميل المحتمل',
  [AutomationAction.UPDATE_FIELD]: 'تحديث حقل',
};

// ═══════════════════════════════════════════════════════════════
// Condition Types
// ═══════════════════════════════════════════════════════════════

/**
 * أنواع المقارنة للشروط
 */
export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IN = 'in',
  NOT_IN = 'not_in',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
}

/**
 * شرط واحد
 */
export class ConditionDto {
  @ApiProperty({
    description: 'اسم الحقل للتحقق منه',
    example: 'stage',
  })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiProperty({
    description: 'نوع المقارنة',
    enum: ConditionOperator,
    example: ConditionOperator.EQUALS,
  })
  @IsEnum(ConditionOperator)
  operator: ConditionOperator;

  @ApiPropertyOptional({
    description: 'القيمة للمقارنة (غير مطلوب لـ is_empty و is_not_empty)',
    example: 'NEGOTIATING',
  })
  @IsOptional()
  value?: any;

  @ApiPropertyOptional({
    description: 'قائمة القيم (للـ in و not_in)',
    type: [String],
    example: ['NEGOTIATING', 'RESERVED'],
  })
  @IsOptional()
  @IsArray()
  values?: any[];
}

/**
 * مجموعة شروط
 */
export class ConditionGroupDto {
  @ApiProperty({
    description: 'نوع الربط بين الشروط',
    enum: ['and', 'or'],
    example: 'and',
  })
  @IsEnum(['and', 'or'])
  type: 'and' | 'or';

  @ApiProperty({
    description: 'قائمة الشروط',
    type: [ConditionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions: ConditionDto[];

  @ApiPropertyOptional({
    description: 'مجموعات فرعية (للشروط المتداخلة)',
    type: [ConditionGroupDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionGroupDto)
  groups?: ConditionGroupDto[];
}

// ═══════════════════════════════════════════════════════════════
// Action Types
// ═══════════════════════════════════════════════════════════════

/**
 * إجراء إرسال إشعار
 */
export class SendNotificationActionDto {
  @ApiProperty({
    description: 'عنوان الإشعار',
    example: 'تم تغيير مرحلة العميل',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'نص الإشعار',
    example: 'تم تغيير مرحلة العميل إلى {{stage}}',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({
    description: 'معرف المستخدم المستهدف (أو role للإرسال لدور معين)',
    example: 'userId-123',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'الدور المستهدف',
    example: 'SALES_MANAGER',
  })
  @IsOptional()
  @IsString()
  role?: string;
}

/**
 * إجراء إرسال واتساب
 */
export class SendWhatsappActionDto {
  @ApiProperty({
    description: 'اسم القالب',
    example: 'lead_stage_update',
  })
  @IsString()
  @IsNotEmpty()
  templateName: string;

  @ApiPropertyOptional({
    description: 'معاملات القالب',
    type: [String],
    example: ['أحمد محمد', 'التفاوض'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  templateParams?: string[];

  @ApiPropertyOptional({
    description: 'رقم الهاتف المستهدف (أو من الحدث)',
    example: '+201234567890',
  })
  @IsOptional()
  @IsString()
  toPhone?: string;
}

/**
 * إجراء إنشاء مهمة
 */
export class CreateTaskActionDto {
  @ApiProperty({
    description: 'عنوان المهمة',
    example: 'متابعة العميل المحتمل',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'وصف المهمة',
    example: 'متابعة العميل بعد تغيير المرحلة',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'معرف المستخدم المسؤول',
    example: 'userId-123',
  })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({
    description: 'تاريخ الاستحقاق (أيام من الآن)',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dueInDays?: number;

  @ApiPropertyOptional({
    description: 'أولوية المهمة',
    enum: ['low', 'medium', 'high', 'urgent'],
    example: 'medium',
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * إجراء تعيين عميل محتمل
 */
export class AssignLeadActionDto {
  @ApiProperty({
    description: 'معرف المستخدم للتعيين',
    example: 'userId-123',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    description: 'استخدام التوزيع التلقائي',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  useRoundRobin?: boolean;
}

/**
 * إجراء تحديث حقل
 */
export class UpdateFieldActionDto {
  @ApiProperty({
    description: 'اسم الحقل',
    example: 'tags',
  })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiProperty({
    description: 'القيمة الجديدة',
    example: ['hot-lead'],
  })
  value: any;

  @ApiPropertyOptional({
    description: 'نوع التحديث',
    enum: ['set', 'append', 'remove'],
    example: 'append',
  })
  @IsOptional()
  @IsEnum(['set', 'append', 'remove'])
  mode?: 'set' | 'append' | 'remove';
}

/**
 * إجراء واحد
 */
export class ActionConfigDto {
  @ApiProperty({
    description: 'نوع الإجراء',
    enum: AutomationAction,
    example: AutomationAction.SEND_NOTIFICATION,
  })
  @IsEnum(AutomationAction)
  type: AutomationAction;

  @ApiProperty({
    description: 'تكوين الإجراء (يعتمد على النوع)',
  })
  @IsObject()
  config:
    | SendNotificationActionDto
    | SendWhatsappActionDto
    | CreateTaskActionDto
    | AssignLeadActionDto
    | UpdateFieldActionDto;

  @ApiPropertyOptional({
    description: 'ترتيب تنفيذ الإجراء',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  order?: number;

  @ApiPropertyOptional({
    description: 'تأخير التنفيذ بالثواني',
    example: 60,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  delaySeconds?: number;
}

// ═══════════════════════════════════════════════════════════════
// CRUD DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * إنشاء قاعدة أتمتة
 */
export class CreateAutomationRuleDto {
  @ApiProperty({
    description: 'اسم القاعدة',
    example: 'إشعار تغيير مرحلة العميل',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'المحفز',
    enum: AutomationTrigger,
    example: AutomationTrigger.LEAD_STAGE_CHANGED,
  })
  @IsEnum(AutomationTrigger)
  trigger: AutomationTrigger;

  @ApiPropertyOptional({
    description: 'شروط التنفيذ (JSON)',
    type: ConditionGroupDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConditionGroupDto)
  conditions?: ConditionGroupDto;

  @ApiProperty({
    description: 'الإجراءات',
    type: [ActionConfigDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionConfigDto)
  actions: ActionConfigDto[];

  @ApiPropertyOptional({
    description: 'تفعيل القاعدة',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * تحديث قاعدة أتمتة
 */
export class UpdateAutomationRuleDto extends PartialType(CreateAutomationRuleDto) {}

/**
 * تبديل حالة القاعدة
 */
export class ToggleAutomationRuleDto {
  @ApiProperty({
    description: 'تفعيل/تعطيل القاعدة',
    example: true,
  })
  @IsBoolean()
  isActive: boolean;
}

/**
 * استعلام قواعد الأتمتة
 */
export class GetAutomationRulesDto {
  @ApiPropertyOptional({
    description: 'فلترة حسب المحفز',
    enum: AutomationTrigger,
  })
  @IsOptional()
  @IsEnum(AutomationTrigger)
  trigger?: AutomationTrigger;

  @ApiPropertyOptional({
    description: 'فلترة حسب حالة التفعيل',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'البحث في الاسم',
    example: 'إشعار',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'رقم الصفحة',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'عدد العناصر في الصفحة',
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * تفاصيل قاعدة الأتمتة
 */
export class AutomationRuleDto {
  @ApiProperty({
    description: 'معرف القاعدة',
    example: 'uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'معرف المؤسسة',
    example: 'org-123',
  })
  organizationId: string;

  @ApiProperty({
    description: 'اسم القاعدة',
    example: 'إشعار تغيير مرحلة العميل',
  })
  name: string;

  @ApiProperty({
    description: 'المحفز',
    enum: AutomationTrigger,
    example: AutomationTrigger.LEAD_STAGE_CHANGED,
  })
  trigger: AutomationTrigger;

  @ApiProperty({
    description: 'اسم المحفز بالعربية',
    example: 'تغيير مرحلة العميل المحتمل',
  })
  triggerAr: string;

  @ApiPropertyOptional({
    description: 'شروط التنفيذ',
    type: ConditionGroupDto,
  })
  conditions?: ConditionGroupDto;

  @ApiProperty({
    description: 'الإجراءات',
    type: [ActionConfigDto],
  })
  actions: ActionConfigDto[];

  @ApiProperty({
    description: 'حالة التفعيل',
    example: true,
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'تاريخ آخر تشغيل',
    example: '2024-01-15T10:30:00Z',
  })
  lastRunAt?: Date;

  @ApiProperty({
    description: 'عدد مرات التشغيل',
    example: 42,
  })
  runCount: number;

  @ApiProperty({
    description: 'تاريخ الإنشاء',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'تاريخ التحديث',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

/**
 * إحصائيات قواعد الأتمتة
 */
export class AutomationStatsDto {
  @ApiProperty({
    description: 'إجمالي القواعد',
    example: 10,
  })
  totalRules: number;

  @ApiProperty({
    description: 'القواعد النشطة',
    example: 7,
  })
  activeRules: number;

  @ApiProperty({
    description: 'إجمالي مرات التشغيل',
    example: 1250,
  })
  totalRuns: number;

  @ApiProperty({
    description: 'القواعد حسب المحفز',
    example: { 'lead.created': 3, 'deal.closed': 2 },
  })
  byTrigger: Record<string, number>;
}

/**
 * نتيجة اختبار القاعدة
 */
export class TestRuleResultDto {
  @ApiProperty({
    description: 'هل القاعدة تنطبق',
    example: true,
  })
  matches: boolean;

  @ApiPropertyOptional({
    description: 'الشروط المتطابقة',
    type: [String],
  })
  matchedConditions?: string[];

  @ApiPropertyOptional({
    description: 'الشروط غير المتطابقة',
    type: [String],
  })
  unmatchedConditions?: string[];

  @ApiProperty({
    description: 'الإجراءات التي ستُنفذ',
    type: [String],
  })
  actionsToExecute: string[];
}

/**
 * حدث لتشغيل القواعد
 */
export class AutomationEventDto {
  @ApiProperty({
    description: 'نوع الحدث',
    enum: AutomationTrigger,
  })
  trigger: AutomationTrigger;

  @ApiProperty({
    description: 'معرف الكيان',
    example: 'entity-123',
  })
  entityId: string;

  @ApiProperty({
    description: 'نوع الكيان',
    example: 'lead',
  })
  entityType: string;

  @ApiProperty({
    description: 'بيانات الحدث',
    example: { previousStage: 'NEW', newStage: 'QUALIFIED' },
  })
  @IsObject()
  data: Record<string, any>;

  @ApiPropertyOptional({
    description: 'معرف المستخدم',
    example: 'user-123',
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
