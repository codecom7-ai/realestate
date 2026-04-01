// ═══════════════════════════════════════════════════════════════
// Dashboard DTOs - نماذج بيانات لوحة التحكم
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ═══════════════════════════════════════════════════════════════
// إحصائيات Leads
// ═══════════════════════════════════════════════════════════════

export class LeadStageStatsDto {
  @ApiProperty({ description: 'مرحلة الـ Lead' })
  stage: string;

  @ApiProperty({ description: 'عدد الـ Leads في هذه المرحلة' })
  count: number;
}

export class LeadsStatsDto {
  @ApiProperty({ description: 'إجمالي عدد الـ Leads' })
  totalLeads: number;

  @ApiProperty({ description: 'إجمالي الميزانية المتوقعة' })
  totalBudget: number;

  @ApiProperty({ description: 'عدد الـ Leads الجدد' })
  newLeads: number;

  @ApiProperty({ description: 'عدد الـ Leads المتأهلين' })
  qualifiedLeads: number;

  @ApiProperty({ description: 'عدد الـ Leads المغلقين (ربح)' })
  closedWon: number;

  @ApiProperty({ description: 'عدد الـ Leads المغلقين (خسارة)' })
  closedLost: number;

  @ApiProperty({ description: 'إحصائيات كل مرحلة', type: [LeadStageStatsDto] })
  stages: LeadStageStatsDto[];
}

// ═══════════════════════════════════════════════════════════════
// إحصائيات العقارات
// ═══════════════════════════════════════════════════════════════

export class PropertyTypeStatsDto {
  @ApiProperty({ description: 'نوع العقار' })
  type: string;

  @ApiProperty({ description: 'عدد العقارات من هذا النوع' })
  count: number;
}

export class PropertiesStatsDto {
  @ApiProperty({ description: 'إجمالي عدد العقارات' })
  total: number;

  @ApiProperty({ description: 'عدد العقارات المتاحة' })
  available: number;

  @ApiProperty({ description: 'عدد العقارات المحجوزة' })
  reserved: number;

  @ApiProperty({ description: 'عدد العقارات المباعة' })
  sold: number;

  @ApiProperty({ description: 'عدد العقارات المؤجرة' })
  rented: number;

  @ApiProperty({ description: 'إجمالي القيمة المطلوبة' })
  totalValue: number;

  @ApiProperty({ description: 'توزيع حسب النوع', type: [PropertyTypeStatsDto] })
  byType: PropertyTypeStatsDto[];
}

// ═══════════════════════════════════════════════════════════════
// إحصائيات العملاء
// ═══════════════════════════════════════════════════════════════

export class ClientsStatsDto {
  @ApiProperty({ description: 'إجمالي عدد العملاء' })
  total: number;

  @ApiProperty({ description: 'عدد العملاء الأفراد' })
  individuals: number;

  @ApiProperty({ description: 'عدد العملاء الشركات' })
  companies: number;

  @ApiProperty({ description: 'عدد العملاء الجدد هذا الشهر' })
  newThisMonth: number;
}

// ═══════════════════════════════════════════════════════════════
// إحصائيات الأنشطة
// ═══════════════════════════════════════════════════════════════

export class ActivityTypeStatsDto {
  @ApiProperty({ description: 'نوع النشاط' })
  type: string;

  @ApiProperty({ description: 'عدد الأنشطة من هذا النوع' })
  count: number;
}

export class ActivitiesStatsDto {
  @ApiProperty({ description: 'إجمالي عدد الأنشطة' })
  total: number;

  @ApiProperty({ description: 'عدد الأنشطة اليوم' })
  today: number;

  @ApiProperty({ description: 'عدد الأنشطة هذا الأسبوع' })
  thisWeek: number;

  @ApiProperty({ description: 'عدد المكالمات' })
  calls: number;

  @ApiProperty({ description: 'عدد رسائل واتساب' })
  whatsapp: number;

  @ApiProperty({ description: 'عدد المعاينات' })
  viewings: number;

  @ApiProperty({ description: 'توزيع حسب النوع', type: [ActivityTypeStatsDto] })
  byType: ActivityTypeStatsDto[];
}

// ═══════════════════════════════════════════════════════════════
// تنبيهات
// ═══════════════════════════════════════════════════════════════

export class AlertDto {
  @ApiProperty({ description: 'نوع التنبيه' })
  type: 'warning' | 'danger' | 'info' | 'success';

  @ApiProperty({ description: 'عنوان التنبيه' })
  title: string;

  @ApiProperty({ description: 'وصف التنبيه' })
  description: string;

  @ApiPropertyOptional({ description: 'رابط للتفاصيل' })
  link?: string;

  @ApiPropertyOptional({ description: 'معرف الكيان المرتبط' })
  entityId?: string;
}

// ═══════════════════════════════════════════════════════════════
// أفضل الوكلاء
// ═══════════════════════════════════════════════════════════════

export class TopAgentDto {
  @ApiProperty({ description: 'معرف الوكيل' })
  id: string;

  @ApiProperty({ description: 'اسم الوكيل' })
  name: string;

  @ApiProperty({ description: 'عدد الصفقات المغلقة' })
  dealsClosed: number;

  @ApiProperty({ description: 'إجمالي قيمة الصفقات' })
  totalValue: number;

  @ApiProperty({ description: 'عدد الـ Leads المسندة' })
  leadsAssigned: number;
}

// ═══════════════════════════════════════════════════════════════
// الإحصائيات الشهرية
// ═══════════════════════════════════════════════════════════════

export class MonthlyTrendDto {
  @ApiProperty({ description: 'الشهر (YYYY-MM)' })
  month: string;

  @ApiProperty({ description: 'عدد Leads جديدة' })
  leads: number;

  @ApiProperty({ description: 'عدد العقارات المضافة' })
  properties: number;

  @ApiProperty({ description: 'عدد العملاء الجدد' })
  clients: number;

  @ApiProperty({ description: 'عدد الصفقات المغلقة' })
  dealsClosed: number;
}

// ═══════════════════════════════════════════════════════════════
// Dashboard الكامل
// ═══════════════════════════════════════════════════════════════

export class DashboardStatsDto {
  @ApiProperty({ description: 'إحصائيات الـ Leads' })
  leads: LeadsStatsDto;

  @ApiProperty({ description: 'إحصائيات العقارات' })
  properties: PropertiesStatsDto;

  @ApiProperty({ description: 'إحصائيات العملاء' })
  clients: ClientsStatsDto;

  @ApiProperty({ description: 'إحصائيات الأنشطة' })
  activities: ActivitiesStatsDto;

  @ApiProperty({ description: 'التنبيهات', type: [AlertDto] })
  alerts: AlertDto[];

  @ApiProperty({ description: 'أفضل الوكلاء', type: [TopAgentDto] })
  topAgents: TopAgentDto[];

  @ApiProperty({ description: 'الاتجاهات الشهرية (آخر 6 أشهر)', type: [MonthlyTrendDto] })
  monthlyTrends: MonthlyTrendDto[];

  @ApiProperty({ description: 'تاريخ آخر تحديث' })
  lastUpdated: Date;

  @ApiProperty({ description: 'هل البيانات من الـ Cache' })
  fromCache: boolean;
}

// ═══════════════════════════════════════════════════════════════
// KPI Cards
// ═══════════════════════════════════════════════════════════════

export class KpiCardDto {
  @ApiProperty({ description: 'عنوان الـ KPI' })
  title: string;

  @ApiProperty({ description: 'القيمة الحالية' })
  value: number;

  @ApiPropertyOptional({ description: 'القيمة السابقة (للمقارنة)' })
  previousValue?: number;

  @ApiPropertyOptional({ description: 'نسبة التغيير' })
  changePercent?: number;

  @ApiProperty({ description: 'اتجاه التغيير' })
  trend: 'up' | 'down' | 'stable';

  @ApiProperty({ description: 'أيقونة الـ KPI' })
  icon: string;

  @ApiProperty({ description: 'لون الـ KPI' })
  color: string;
}

export class DashboardKpisDto {
  @ApiProperty({ description: 'إجمالي Pipeline Value' })
  pipelineValue: KpiCardDto;

  @ApiProperty({ description: 'عدد الـ Leads الجدد' })
  newLeads: KpiCardDto;

  @ApiProperty({ description: 'عدد الصفقات المغلقة' })
  dealsClosed: KpiCardDto;

  @ApiProperty({ description: 'إجمالي العمولات' })
  totalCommission: KpiCardDto;

  @ApiProperty({ description: 'عدد العقارات المتاحة' })
  availableProperties: KpiCardDto;

  @ApiProperty({ description: 'عدد المعاينات المجدولة' })
  scheduledViewings: KpiCardDto;
}
