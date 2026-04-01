// ═══════════════════════════════════════════════════════════════
// Financial Reports Service - نظام تشغيل المكتب العقاري المصري
// ═══════════════════════════════════════════════════════════════

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';

interface ReportPeriod {
  period?: 'month' | 'quarter' | 'year';
  year?: number;
  month?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface OverdueItem {
  id: string;
  installmentNumber: number;
  amount: number;
  paid: number;
  remaining: number;
  dueDate: Date;
  daysOverdue: number;
  client: string | null;
  property: string | undefined;
}

@Injectable()
export class FinancialReportsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async getFinancialReports(organizationId: string, period: ReportPeriod) {
    const cacheKey = `financial-reports:${organizationId}:${JSON.stringify(period)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.calculateDateRange(period);

    const [revenue, commissions, payments, etaSummary] = await Promise.all([
      this.getRevenueData(organizationId, startDate, endDate),
      this.getCommissionsData(organizationId, startDate, endDate),
      this.getPaymentsData(organizationId, startDate, endDate),
      this.getETAData(organizationId, startDate, endDate),
    ]);

    const result = {
      period: { startDate, endDate },
      revenue,
      commissions,
      payments,
      etaSummary,
      generatedAt: new Date(),
    };

    // Cache لمدة ساعة
    await this.cache.set(cacheKey, result, 3600);
    return result;
  }

  async getRevenueReport(organizationId: string, period: ReportPeriod) {
    const { startDate, endDate } = this.calculateDateRange(period);

    // إيرادات من الصفقات المغلقة
    const closedDeals = await this.prisma.deal.findMany({
      where: {
        organizationId,
        closedAt: { gte: startDate, lte: endDate },
        stage: 'CLOSED',
      },
      include: {
        property: { select: { title: true, askingPrice: true } },
        client: { select: { firstName: true, lastName: true } },
        commissions: true,
      },
    });

    const totalRevenue = closedDeals.reduce(
      (sum, deal) => sum + (deal.agreedPrice || 0),
      0,
    );

    const totalCommission = closedDeals.reduce(
      (sum, deal) =>
        sum + deal.commissions.reduce((s, c) => s + c.totalAmount, 0),
      0,
    );

    return {
      totalRevenue,
      totalCommission,
      dealsCount: closedDeals.length,
      deals: closedDeals.map((deal) => ({
        id: deal.id,
        property: deal.property?.title,
        client: `${deal.client?.firstName} ${deal.client?.lastName}`,
        agreedPrice: deal.agreedPrice,
        commission: deal.commissions.reduce((s, c) => s + c.totalAmount, 0),
        closedAt: deal.closedAt,
      })),
    };
  }

  async getCommissionsReport(organizationId: string, period: ReportPeriod) {
    const { startDate, endDate } = this.calculateDateRange(period);

    const commissions = await this.prisma.commission.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        deal: {
          include: {
            property: { select: { title: true } },
            assignedBroker: { select: { firstName: true, lastName: true } },
          },
        },
        user: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    const byStatus = await this.prisma.commission.groupBy({
      by: ['status'],
      where: { organizationId, createdAt: { gte: startDate, lte: endDate } },
      _sum: { totalAmount: true },
      _count: true,
    });

    return {
      total: commissions.reduce((sum, c) => sum + c.totalAmount, 0),
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = {
            count: item._count,
            total: item._sum.totalAmount || 0,
          };
          return acc;
        },
        {} as Record<string, { count: number; total: number }>,
      ),
      commissions: commissions.map((c) => ({
        id: c.id,
        broker: c.user ? `${c.user.firstName} ${c.user.lastName}` : 'الشركة',
        type: c.commissionType,
        amount: c.amount,
        vat: c.vatAmount,
        total: c.totalAmount,
        status: c.status,
        deal: c.deal?.property?.title,
      })),
    };
  }

  async getETASummary(
    organizationId: string,
    period: { month: number; year: number },
  ) {
    const startDate = new Date(period.year, period.month - 1, 1);
    const endDate = new Date(period.year, period.month, 0, 23, 59, 59);

    const receipts = await this.prisma.eTAReceipt.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const byStatus = receipts.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      period: `${period.year}-${period.month.toString().padStart(2, '0')}`,
      totalReceipts: receipts.length,
      validReceipts: receipts.filter((r) => r.status === 'VALID').length,
      pendingReceipts: receipts.filter((r) => r.status === 'PENDING').length,
      invalidReceipts: receipts.filter((r) => r.status === 'INVALID').length,
      byStatus,
    };
  }

  async getCollectionsReport(organizationId: string, period: ReportPeriod) {
    const { startDate, endDate } = this.calculateDateRange(period);

    const payments = await this.prisma.payment.findMany({
      where: {
        organizationId,
        paidAt: { gte: startDate, lte: endDate },
        status: 'confirmed',
      },
      include: {
        installment: {
          include: {
            paymentSchedule: {
              include: { deal: { include: { client: true } } },
            },
          },
        },
      },
    });

    const byMethod = await this.prisma.payment.groupBy({
      by: ['method'],
      where: {
        organizationId,
        paidAt: { gte: startDate, lte: endDate },
        status: 'confirmed',
      },
      _sum: { amount: true },
      _count: true,
    });

    return {
      totalCollected: payments.reduce((sum, p) => sum + p.amount, 0),
      paymentsCount: payments.length,
      byMethod: byMethod.reduce(
        (acc, item) => {
          acc[item.method] = {
            count: item._count,
            total: item._sum.amount || 0,
          };
          return acc;
        },
        {} as Record<string, { count: number; total: number }>,
      ),
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        paidAt: p.paidAt,
        client: p.installment?.paymentSchedule?.deal?.client
          ? `${p.installment.paymentSchedule.deal.client.firstName} ${p.installment.paymentSchedule.deal.client.lastName}`
          : null,
      })),
    };
  }

  async getOverdueReport(organizationId: string) {
    const today = new Date();

    const overdueInstallments = await this.prisma.installment.findMany({
      where: {
        organizationId,
        dueDate: { lt: today },
        status: { in: ['pending', 'partial'] },
      },
      include: {
        paymentSchedule: {
          include: {
            deal: {
              include: {
                client: true,
                property: { select: { title: true } },
              },
            },
          },
        },
        payments: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    // تصنيف حسب فترة التأخير
    const categories: Record<string, OverdueItem[]> = {
      '1-30 days': [],
      '31-60 days': [],
      '61-90 days': [],
      '90+ days': [],
    };

    for (const inst of overdueInstallments) {
      const daysOverdue = Math.floor(
        (today.getTime() - inst.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const paid = inst.payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = inst.amount - paid;

      const item = {
        id: inst.id,
        installmentNumber: inst.installmentNumber,
        amount: inst.amount,
        paid,
        remaining,
        dueDate: inst.dueDate,
        daysOverdue,
        client: inst.paymentSchedule?.deal?.client
          ? `${inst.paymentSchedule.deal.client.firstName} ${inst.paymentSchedule.deal.client.lastName}`
          : null,
        property: inst.paymentSchedule?.deal?.property?.title,
      };

      if (daysOverdue <= 30) categories['1-30 days'].push(item);
      else if (daysOverdue <= 60) categories['31-60 days'].push(item);
      else if (daysOverdue <= 90) categories['61-90 days'].push(item);
      else categories['90+ days'].push(item);
    }

    return {
      totalOverdue: overdueInstallments.reduce(
        (sum, inst) =>
          sum +
          (inst.amount - inst.payments.reduce((s, p) => s + p.amount, 0)),
        0,
      ),
      count: overdueInstallments.length,
      categories,
    };
  }

  async exportReport(organizationId: string, type: string, format: string) {
    let data: any;
    let filename: string;

    switch (type) {
      case 'revenue':
        data = await this.getRevenueReport(organizationId, {});
        filename = `revenue-report-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'commissions':
        data = await this.getCommissionsReport(organizationId, {});
        filename = `commissions-report-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'eta':
        data = await this.getETASummary(organizationId, {
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
        });
        filename = `eta-summary-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'collections':
        data = await this.getCollectionsReport(organizationId, {});
        filename = `collections-report-${new Date().toISOString().split('T')[0]}`;
        break;
      default:
        throw new Error(`Unknown report type: ${type}`);
    }

    if (format === 'csv') {
      return {
        data: this.convertToCSV(data),
        filename: `${filename}.csv`,
        mimeType: 'text/csv',
      };
    }

    // Excel format - نستخدم JSON كـ placeholder
    return {
      data: JSON.stringify(data, null, 2),
      filename: `${filename}.json`,
      mimeType: 'application/json',
    };
  }

  async getFinancialDashboard(organizationId: string) {
    const today = new Date();
    const thisMonth = { month: today.getMonth() + 1, year: today.getFullYear() };

    const [
      revenue,
      commissions,
      eta,
      collections,
      overdue,
    ] = await Promise.all([
      this.getRevenueReport(organizationId, { period: 'month', ...thisMonth }),
      this.getCommissionsReport(organizationId, { period: 'month', ...thisMonth }),
      this.getETASummary(organizationId, thisMonth),
      this.getCollectionsReport(organizationId, { period: 'month', ...thisMonth }),
      this.getOverdueReport(organizationId),
    ]);

    return {
      revenue: {
        total: revenue.totalRevenue,
        commission: revenue.totalCommission,
        dealsCount: revenue.dealsCount,
      },
      commissions: {
        total: commissions.total,
        pending: commissions.byStatus['CALCULATED']?.total || 0,
        approved: commissions.byStatus['APPROVED']?.total || 0,
      },
      eta: {
        total: eta.totalReceipts,
        valid: eta.validReceipts,
        pending: eta.pendingReceipts,
      },
      collections: {
        total: collections.totalCollected,
        count: collections.paymentsCount,
      },
      overdue: {
        total: overdue.totalOverdue,
        count: overdue.count,
      },
    };
  }

  private calculateDateRange(period: ReportPeriod): { startDate: Date; endDate: Date } {
    const now = new Date();

    if (period.startDate && period.endDate) {
      return { startDate: period.startDate, endDate: period.endDate };
    }

    const year = period.year || now.getFullYear();
    const month = period.month || now.getMonth() + 1;

    switch (period.period) {
      case 'month':
        return {
          startDate: new Date(year, month - 1, 1),
          endDate: new Date(year, month, 0, 23, 59, 59),
        };
      case 'quarter':
        const quarterStart = Math.floor((month - 1) / 3) * 3 + 1;
        return {
          startDate: new Date(year, quarterStart - 1, 1),
          endDate: new Date(year, quarterStart + 2, 0, 23, 59, 59),
        };
      case 'year':
        return {
          startDate: new Date(year, 0, 1),
          endDate: new Date(year, 11, 31, 23, 59, 59),
        };
      default:
        // Default to current month
        return {
          startDate: new Date(year, month - 1, 1),
          endDate: new Date(year, month, 0, 23, 59, 59),
        };
    }
  }

  private getRevenueData(organizationId: string, startDate: Date, endDate: Date) {
    return this.prisma.deal.aggregate({
      where: {
        organizationId,
        closedAt: { gte: startDate, lte: endDate },
        stage: 'CLOSED',
      },
      _sum: { agreedPrice: true },
      _count: true,
    });
  }

  private getCommissionsData(organizationId: string, startDate: Date, endDate: Date) {
    return this.prisma.commission.aggregate({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { totalAmount: true, vatAmount: true },
      _count: true,
    });
  }

  private getPaymentsData(organizationId: string, startDate: Date, endDate: Date) {
    return this.prisma.payment.aggregate({
      where: {
        organizationId,
        paidAt: { gte: startDate, lte: endDate },
        status: 'confirmed',
      },
      _sum: { amount: true },
      _count: true,
    });
  }

  private getETAData(organizationId: string, startDate: Date, endDate: Date) {
    return this.prisma.eTAReceipt.aggregate({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    });
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      const headers = Object.keys(data[0]);
      const rows = data.map((item) =>
        headers.map((h) => JSON.stringify(item[h] ?? '')).join(','),
      );
      return [headers.join(','), ...rows].join('\n');
    }
    return JSON.stringify(data);
  }
}
