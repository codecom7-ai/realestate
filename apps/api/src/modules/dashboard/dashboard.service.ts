// ═══════════════════════════════════════════════════════════════
// Dashboard Service - خدمة لوحة التحكم
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import {
  DashboardStatsDto,
  LeadsStatsDto,
  PropertiesStatsDto,
  ClientsStatsDto,
  ActivitiesStatsDto,
  AlertDto,
  TopAgentDto,
  MonthlyTrendDto,
  DashboardKpisDto,
  KpiCardDto,
  LeadStageStatsDto,
  PropertyTypeStatsDto,
  ActivityTypeStatsDto,
} from './dto/dashboard.dto';
import { LeadStage, PropertyStatus, PropertyType } from '@realestate/shared-types';

const CACHE_TTL = 300; // 5 دقائق
const CACHE_KEY_PREFIX = 'dashboard:';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // الحصول على إحصائيات Dashboard كاملة
  // ═══════════════════════════════════════════════════════════════

  async getDashboardStats(organizationId: string): Promise<DashboardStatsDto> {
    const cacheKey = `${CACHE_KEY_PREFIX}stats:${organizationId}`;

    // محاولة الحصول من الـ cache
    const cached = await this.cache.get<DashboardStatsDto>(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    // حساب الإحصائيات
    const [leads, properties, clients, activities, alerts, topAgents, monthlyTrends] =
      await Promise.all([
        this.getLeadsStats(organizationId),
        this.getPropertiesStats(organizationId),
        this.getClientsStats(organizationId),
        this.getActivitiesStats(organizationId),
        this.getAlerts(organizationId),
        this.getTopAgents(organizationId),
        this.getMonthlyTrends(organizationId),
      ]);

    const result: DashboardStatsDto = {
      leads,
      properties,
      clients,
      activities,
      alerts,
      topAgents,
      monthlyTrends,
      lastUpdated: new Date(),
      fromCache: false,
    };

    // تخزين في الـ cache
    await this.cache.set(cacheKey, result, CACHE_TTL);

    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // الحصول على KPIs فقط
  // ═══════════════════════════════════════════════════════════════

  async getKpis(organizationId: string): Promise<DashboardKpisDto> {
    const cacheKey = `${CACHE_KEY_PREFIX}kpis:${organizationId}`;

    const cached = await this.cache.get<DashboardKpisDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // حساب الـ KPIs
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Pipeline Value
    const pipelineValue = await this.prisma.lead.aggregate({
      where: {
        organizationId,
        deletedAt: null,
        stage: { notIn: [LeadStage.CLOSED_WON, LeadStage.CLOSED_LOST] },
      },
      _sum: { budget: true },
    });

    const lastMonthPipelineValue = await this.prisma.lead.aggregate({
      where: {
        organizationId,
        deletedAt: null,
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        stage: { notIn: [LeadStage.CLOSED_WON, LeadStage.CLOSED_LOST] },
      },
      _sum: { budget: true },
    });

    // Leads جديدة
    const newLeadsCount = await this.prisma.lead.count({
      where: {
        organizationId,
        deletedAt: null,
        createdAt: { gte: startOfMonth },
      },
    });

    const lastMonthNewLeads = await this.prisma.lead.count({
      where: {
        organizationId,
        deletedAt: null,
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    });

    // صفقات مغلقة (سنستخدم Leads في مرحلة CLOSED_WON كمؤشر مؤقت)
    const closedWonCount = await this.prisma.lead.count({
      where: {
        organizationId,
        deletedAt: null,
        stage: LeadStage.CLOSED_WON,
        updatedAt: { gte: startOfMonth },
      },
    });

    const lastMonthClosedWon = await this.prisma.lead.count({
      where: {
        organizationId,
        deletedAt: null,
        stage: LeadStage.CLOSED_WON,
        updatedAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    });

    // عقارات متاحة
    const availableProperties = await this.prisma.property.count({
      where: {
        organizationId,
        deletedAt: null,
        status: PropertyStatus.AVAILABLE,
      },
    });

    const lastMonthAvailable = await this.prisma.property.count({
      where: {
        organizationId,
        deletedAt: null,
        status: PropertyStatus.AVAILABLE,
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    });

    // أنشطة اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduledActivities = await this.prisma.activity.count({
      where: {
        organizationId,
        activityType: 'VIEWING',
        occurredAt: { gte: today },
      },
    });

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayActivities = await this.prisma.activity.count({
      where: {
        organizationId,
        activityType: 'VIEWING',
        occurredAt: { gte: yesterday, lt: today },
      },
    });

    // بناء الـ KPIs
    const result: DashboardKpisDto = {
      pipelineValue: this.createKpiCard(
        'قيمة Pipeline',
        pipelineValue._sum.budget || 0,
        lastMonthPipelineValue._sum.budget || 0,
        'currency',
        'blue',
      ),
      newLeads: this.createKpiCard(
        'Leads جديدة',
        newLeadsCount,
        lastMonthNewLeads,
        'number',
        'green',
      ),
      dealsClosed: this.createKpiCard(
        'صفقات مغلقة',
        closedWonCount,
        lastMonthClosedWon,
        'number',
        'purple',
      ),
      totalCommission: this.createKpiCard(
        'عمولات متوقعة',
        (pipelineValue._sum.budget || 0) * 0.025, // تقدير 2.5%
        (lastMonthPipelineValue._sum.budget || 0) * 0.025,
        'currency',
        'yellow',
      ),
      availableProperties: this.createKpiCard(
        'عقارات متاحة',
        availableProperties,
        lastMonthAvailable,
        'number',
        'indigo',
      ),
      scheduledViewings: this.createKpiCard(
        'معاينات مجدولة',
        scheduledActivities,
        yesterdayActivities,
        'number',
        'pink',
      ),
    };

    await this.cache.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // إحصائيات Leads
  // ═══════════════════════════════════════════════════════════════

  private async getLeadsStats(organizationId: string): Promise<LeadsStatsDto> {
    const stageCounts = await this.prisma.lead.groupBy({
      by: ['stage'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
    });

    const totalLeads = await this.prisma.lead.count({
      where: { organizationId, deletedAt: null },
    });

    const totalBudget = await this.prisma.lead.aggregate({
      where: { organizationId, deletedAt: null, budget: { not: null } },
      _sum: { budget: true },
    });

    const stages: LeadStageStatsDto[] = stageCounts.map((item: { stage: string; _count: { id: number } }) => ({
      stage: item.stage,
      count: item._count.id,
    }));

    return {
      totalLeads,
      totalBudget: totalBudget._sum.budget || 0,
      newLeads: stageCounts.find((s: { stage: string }) => s.stage === LeadStage.NEW)?._count.id || 0,
      qualifiedLeads:
        (stageCounts.find((s: { stage: string }) => s.stage === LeadStage.QUALIFIED)?._count.id || 0) +
        (stageCounts.find((s: { stage: string }) => s.stage === LeadStage.NEGOTIATING)?._count.id || 0),
      closedWon: stageCounts.find((s: { stage: string }) => s.stage === LeadStage.CLOSED_WON)?._count.id || 0,
      closedLost: stageCounts.find((s: { stage: string }) => s.stage === LeadStage.CLOSED_LOST)?._count.id || 0,
      stages,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // إحصائيات العقارات
  // ═══════════════════════════════════════════════════════════════

  private async getPropertiesStats(organizationId: string): Promise<PropertiesStatsDto> {
    const [total, available, reserved, sold, rented, byType, totalValue] = await Promise.all([
      this.prisma.property.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.property.count({
        where: { organizationId, deletedAt: null, status: PropertyStatus.AVAILABLE },
      }),
      this.prisma.property.count({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: [PropertyStatus.RESERVED_TEMP, PropertyStatus.RESERVED_CONFIRMED] },
        },
      }),
      this.prisma.property.count({
        where: { organizationId, deletedAt: null, status: PropertyStatus.SOLD },
      }),
      this.prisma.property.count({
        where: { organizationId, deletedAt: null, status: PropertyStatus.RENTED },
      }),
      this.prisma.property.groupBy({
        by: ['propertyType'],
        where: { organizationId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.property.aggregate({
        where: { organizationId, deletedAt: null },
        _sum: { askingPrice: true },
      }),
    ]);

    const byTypeResult: PropertyTypeStatsDto[] = byType.map((item: { propertyType: string; _count: { id: number } }) => ({
      type: item.propertyType,
      count: item._count.id,
    }));

    return {
      total,
      available,
      reserved,
      sold,
      rented,
      totalValue: totalValue._sum.askingPrice || 0,
      byType: byTypeResult,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // إحصائيات العملاء
  // ═══════════════════════════════════════════════════════════════

  private async getClientsStats(organizationId: string): Promise<ClientsStatsDto> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, individuals, companies, newThisMonth] = await Promise.all([
      this.prisma.client.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.client.count({
        where: { organizationId, deletedAt: null, clientType: 'INDIVIDUAL' },
      }),
      this.prisma.client.count({
        where: { organizationId, deletedAt: null, clientType: 'COMPANY' },
      }),
      this.prisma.client.count({
        where: { organizationId, deletedAt: null, createdAt: { gte: startOfMonth } },
      }),
    ]);

    return {
      total,
      individuals,
      companies,
      newThisMonth,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // إحصائيات الأنشطة
  // ═══════════════════════════════════════════════════════════════

  private async getActivitiesStats(organizationId: string): Promise<ActivitiesStatsDto> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // بداية الأسبوع

    const [total, byType] = await Promise.all([
      this.prisma.activity.count({
        where: { organizationId },
      }),
      this.prisma.activity.groupBy({
        by: ['activityType'],
        where: { organizationId },
        _count: { id: true },
      }),
    ]);

    const byTypeResult: ActivityTypeStatsDto[] = byType.map((item: { activityType: string; _count: { id: number } }) => ({
      type: item.activityType,
      count: item._count.id,
    }));

    const todayCount = await this.prisma.activity.count({
      where: { organizationId, createdAt: { gte: today } },
    });

    const weekCount = await this.prisma.activity.count({
      where: { organizationId, createdAt: { gte: weekStart } },
    });

    return {
      total,
      today: todayCount,
      thisWeek: weekCount,
      calls: byType.find((a: { activityType: string }) => a.activityType === 'CALL')?._count.id || 0,
      whatsapp: byType.find((a: { activityType: string }) => a.activityType === 'WHATSAPP')?._count.id || 0,
      viewings: byType.find((a: { activityType: string }) => a.activityType === 'VIEWING')?._count.id || 0,
      byType: byTypeResult,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // التنبيهات
  // ═══════════════════════════════════════════════════════════════

  private async getAlerts(organizationId: string): Promise<AlertDto[]> {
    const alerts: AlertDto[] = [];

    // Leads بدون متابعة لأكثر من 3 أيام
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const staleLeads = await this.prisma.lead.count({
      where: {
        organizationId,
        deletedAt: null,
        stage: { notIn: [LeadStage.CLOSED_WON, LeadStage.CLOSED_LOST] },
        updatedAt: { lt: threeDaysAgo },
      },
    });

    if (staleLeads > 0) {
      alerts.push({
        type: 'warning',
        title: 'Leads بدون متابعة',
        description: `${staleLeads} leads لم يتم متابعتهم منذ أكثر من 3 أيام`,
        link: '/leads?filter=stale',
      });
    }

    // عقارات محجوزة مؤقتاً قاربت على الانتهاء
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const expiringReservations = await this.prisma.propertyLock.count({
      where: {
        organizationId,
        lockType: 'TEMPORARY',
        expiresAt: { lte: tomorrow },
        unlockedAt: null,
      },
    });

    if (expiringReservations > 0) {
      alerts.push({
        type: 'danger',
        title: 'حجوزات منتهية قريباً',
        description: `${expiringReservations} حجز مؤقت سينتهي خلال 24 ساعة`,
        link: '/properties?filter=expiring',
      });
    }

    // عقارات بدون صور
    const propertiesWithoutImages = await this.prisma.property.count({
      where: {
        organizationId,
        deletedAt: null,
        images: { none: {} },
      },
    });

    if (propertiesWithoutImages > 0) {
      alerts.push({
        type: 'info',
        title: 'عقارات بدون صور',
        description: `${propertiesWithoutImages} عقار بدون صور`,
        link: '/properties?filter=no-images',
      });
    }

    return alerts;
  }

  // ═══════════════════════════════════════════════════════════════
  // أفضل الوكلاء
  // ═══════════════════════════════════════════════════════════════

  private async getTopAgents(organizationId: string): Promise<TopAgentDto[]> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // الحصول على أداء الوكلاء
    const agents = await this.prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { in: ['BROKER', 'SALES_MANAGER'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        _count: {
          select: {
            leads: {
              where: { deletedAt: null },
            },
          },
        },
      },
      take: 5,
    });

    // حساب عدد الصفقات المغلقة لكل وكيل
    const result: TopAgentDto[] = await Promise.all(
      agents.map(async (agent: { id: string; firstName: string; lastName: string; _count: { leads: number } }) => {
        const closedWon = await this.prisma.lead.count({
          where: {
            assignedToId: agent.id,
            stage: LeadStage.CLOSED_WON,
            updatedAt: { gte: startOfMonth },
          },
        });

        const totalValue = await this.prisma.lead.aggregate({
          where: {
            assignedToId: agent.id,
            stage: LeadStage.CLOSED_WON,
            updatedAt: { gte: startOfMonth },
            budget: { not: null },
          },
          _sum: { budget: true },
        });

        return {
          id: agent.id,
          name: `${agent.firstName} ${agent.lastName}`,
          dealsClosed: closedWon,
          totalValue: totalValue._sum.budget || 0,
          leadsAssigned: agent._count.leads,
        };
      }),
    );

    // ترتيب حسب عدد الصفقات المغلقة
    return result.sort((a, b) => b.dealsClosed - a.dealsClosed);
  }

  // ═══════════════════════════════════════════════════════════════
  // الاتجاهات الشهرية
  // ═══════════════════════════════════════════════════════════════

  private async getMonthlyTrends(organizationId: string): Promise<MonthlyTrendDto[]> {
    const trends: MonthlyTrendDto[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;

      const [leads, properties, clients, dealsClosed] = await Promise.all([
        this.prisma.lead.count({
          where: {
            organizationId,
            deletedAt: null,
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        this.prisma.property.count({
          where: {
            organizationId,
            deletedAt: null,
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        this.prisma.client.count({
          where: {
            organizationId,
            deletedAt: null,
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        this.prisma.lead.count({
          where: {
            organizationId,
            deletedAt: null,
            stage: LeadStage.CLOSED_WON,
            updatedAt: { gte: monthStart, lte: monthEnd },
          },
        }),
      ]);

      trends.push({
        month: monthKey,
        leads,
        properties,
        clients,
        dealsClosed,
      });
    }

    return trends;
  }

  // ═══════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════

  private createKpiCard(
    title: string,
    value: number,
    previousValue: number,
    format: 'currency' | 'number' | 'percent',
    color: string,
  ): KpiCardDto {
    const changePercent =
      previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : value > 0 ? 100 : 0;

    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(changePercent) < 1) {
      trend = 'stable';
    } else if (changePercent > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    return {
      title,
      value,
      previousValue,
      changePercent: Math.round(changePercent * 10) / 10,
      trend,
      icon: format === 'currency' ? 'currency' : 'number',
      color,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // إلغاء Cache
  // ═══════════════════════════════════════════════════════════════

  async invalidateCache(organizationId: string): Promise<void> {
    await this.cache.del(`${CACHE_KEY_PREFIX}stats:${organizationId}`);
    await this.cache.del(`${CACHE_KEY_PREFIX}kpis:${organizationId}`);
  }
}
