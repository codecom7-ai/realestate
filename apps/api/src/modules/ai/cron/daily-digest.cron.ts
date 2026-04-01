// ═══════════════════════════════════════════════════════════════
// Daily Digest Cron - ملخص يومي ذكي
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import ZAI from 'z-ai-web-dev-sdk';

// ═══════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════

interface DailyDigestData {
  date: Date;
  organizationId: string;
  newDeals: {
    count: number;
    totalValue: number;
    items: Array<{
      id: string;
      clientName: string;
      propertyTitle: string;
      value: number;
      currency: string;
    }>;
  };
  overduePayments: {
    count: number;
    totalAmount: number;
    items: Array<{
      id: string;
      clientName: string;
      amount: number;
      currency: string;
      dueDate: Date;
      daysOverdue: number;
    }>;
  };
  upcomingPayments: {
    count: number;
    totalAmount: number;
    items: Array<{
      id: string;
      clientName: string;
      amount: number;
      currency: string;
      dueDate: Date;
    }>;
  };
  alerts: Array<{
    type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    messageAr: string;
  }>;
  stats: {
    leadsCreated: number;
    leadsQualified: number;
    viewingsScheduled: number;
    viewingsCompleted: number;
    contractsSigned: number;
    paymentsReceived: number;
    totalRevenue: number;
  };
}

interface DigestSummary {
  titleAr: string;
  summaryAr: string;
  keyHighlights: string[];
  actionItems: string[];
  recommendations: string[];
}

// ═══════════════════════════════════════════════════════════════
// DAILY DIGEST CRON SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class DailyDigestCronService {
  private readonly logger = new Logger(DailyDigestCronService.name);
  private zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.initializeAI();
  }

  /**
   * Initialize AI SDK
   */
  private async initializeAI() {
    try {
      this.zai = await ZAI.create();
      this.logger.log('AI SDK initialized for Daily Digest');
    } catch (error) {
      this.logger.error('Failed to initialize AI SDK for Daily Digest', error);
    }
  }

  /**
   * Daily Digest Job
   * يعمل كل يوم الساعة 7:00 صباحاً بتوقيت القاهرة
   */
  @Cron('0 7 * * *', {
    timeZone: 'Africa/Cairo',
    name: 'dailyDigest',
  })
  async handleDailyDigest() {
    this.logger.log('Starting daily digest generation...');

    try {
      // جلب جميع المنظمات
      const organizations = await this.prisma.organization.findMany({
        where: { isSetupDone: true },
        select: { id: true, name: true },
      });

      for (const org of organizations) {
        try {
          // جمع البيانات
          const digestData = await this.collectDigestData(org.id);

          // توليد الملخص بالذكاء الاصطناعي
          const summary = await this.generateAISummary(digestData);

          // إرسال للـ Owner/GM
          await this.sendDigest(org.id, digestData, summary);

          this.logger.log(`Daily digest sent for organization ${org.name}`);
        } catch (error) {
          this.logger.error(`Failed to generate digest for organization ${org.id}:`, error);
        }
      }

      this.logger.log('Daily digest completed');
    } catch (error) {
      this.logger.error('Daily digest failed:', error);
    }
  }

  /**
   * Manual trigger for testing
   */
  async triggerDigestManually(organizationId?: string): Promise<{ success: boolean; message: string }> {
    try {
      if (organizationId) {
        const digestData = await this.collectDigestData(organizationId);
        const summary = await this.generateAISummary(digestData);
        await this.sendDigest(organizationId, digestData, summary);
        return { success: true, message: 'Digest sent successfully' };
      }

      await this.handleDailyDigest();
      return { success: true, message: 'Digest sent to all organizations' };
    } catch (error: any) {
      this.logger.error('Manual digest trigger failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * جمع بيانات الملخص
   */
  private async collectDigestData(organizationId: string): Promise<DailyDigestData> {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const yesterday = new Date(startOfDay);
    yesterday.setDate(yesterday.getDate() - 1);

    // الصفقات الجديدة (آخر 24 ساعة)
    const newDeals = await this.prisma.deal.findMany({
      where: {
        organizationId,
        createdAt: { gte: yesterday },
        stage: { not: 'CANCELLED' },
      },
      include: {
        client: { select: { firstName: true, lastName: true } },
        property: { select: { title: true } },
      },
    });

    // المدفوعات المتأخرة
    const overduePayments = await this.prisma.installment.findMany({
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
                client: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

  // المدفوعات القادمة (خلال 3 أيام)
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const upcomingPayments = await this.prisma.installment.findMany({
    where: {
      organizationId,
      dueDate: { gte: today, lte: threeDaysFromNow },
      status: { in: ['pending', 'partial'] },
    },
    include: {
      paymentSchedule: {
        include: {
          deal: {
            include: {
              client: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

    // الإحصائيات
    const [
      leadsCreated,
      leadsQualified,
      viewingsScheduled,
      viewingsCompleted,
      contractsSigned,
      paymentsReceived,
      paymentsData,
    ] = await Promise.all([
      this.prisma.lead.count({
        where: { organizationId, createdAt: { gte: yesterday } },
      }),
      this.prisma.lead.count({
        where: { organizationId, stage: 'QUALIFIED', updatedAt: { gte: yesterday } },
      }),
      this.prisma.viewing.count({
        where: { organizationId, createdAt: { gte: yesterday } },
      }),
      this.prisma.viewing.count({
        where: { organizationId, status: 'completed', updatedAt: { gte: yesterday } },
      }),
      this.prisma.contract.count({
        where: { organizationId, signedByClient: true, signedByOffice: true, signedAt: { gte: yesterday } },
      }),
      this.prisma.payment.count({
        where: { organizationId, status: 'confirmed', paidAt: { gte: yesterday } },
      }),
      this.prisma.payment.findMany({
        where: { organizationId, status: 'confirmed', paidAt: { gte: yesterday } },
        select: { amount: true },
      }),
    ]);

    const totalRevenue = paymentsData.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    // التنبيهات
    const alerts = await this.generateAlerts(organizationId, {
      overduePayments: overduePayments.length,
      newDeals: newDeals.length,
    });

    return {
      date: today,
      organizationId,
      newDeals: {
        count: newDeals.length,
        totalValue: newDeals.reduce((sum: number, d: { agreedPrice?: number | null }) => sum + (d.agreedPrice || 0), 0),
        items: newDeals.map((d: any) => ({
          id: d.id,
          clientName: `${d.client?.firstName || ''} ${d.client?.lastName || ''}`.trim(),
          propertyTitle: d.property?.title || 'غير محدد',
          value: d.agreedPrice || 0,
          currency: d.currency,
        })),
      },
      overduePayments: {
        count: overduePayments.length,
        totalAmount: overduePayments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0),
        items: overduePayments.map((p: any) => ({
          id: p.id,
          clientName: `${p.deal?.client?.firstName || ''} ${p.deal?.client?.lastName || ''}`.trim(),
          amount: p.amount,
          currency: 'EGP',
          dueDate: p.dueDate,
          daysOverdue: Math.floor((today.getTime() - p.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
        })),
      },
      upcomingPayments: {
        count: upcomingPayments.length,
        totalAmount: upcomingPayments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0),
        items: upcomingPayments.map((p: any) => ({
          id: p.id,
          clientName: `${p.deal?.client?.firstName || ''} ${p.deal?.client?.lastName || ''}`.trim(),
          amount: p.amount,
          currency: 'EGP',
          dueDate: p.dueDate,
        })),
      },
      alerts,
      stats: {
        leadsCreated,
        leadsQualified,
        viewingsScheduled,
        viewingsCompleted,
        contractsSigned,
        paymentsReceived,
        totalRevenue,
      },
    };
  }

  /**
   * توليد تنبيهات ذكية
   */
  private async generateAlerts(
    organizationId: string,
    context: { overduePayments: number; newDeals: number },
  ): Promise<DailyDigestData['alerts']> {
    const alerts: DailyDigestData['alerts'] = [];

    // تنبيه المدفوعات المتأخرة
    if (context.overduePayments > 0) {
      alerts.push({
        type: 'overdue_payments',
        severity: context.overduePayments > 5 ? 'critical' : 'warning',
        message: `${context.overduePayments} overdue payments require attention`,
        messageAr: `${context.overduePayments} مدفوعات متأخرة تحتاج متابعة`,
      });
    }

    // تنبيه العقود المنتهية قريباً
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringContracts = await this.prisma.contract.count({
      where: {
        organizationId,
        signedByClient: true,
        signedByOffice: true,
      },
    });

    if (expiringContracts > 0) {
      alerts.push({
        type: 'expiring_contracts',
        severity: 'warning',
        message: `${expiringContracts} contracts expiring within 30 days`,
        messageAr: `${expiringContracts} عقود ستنتهي خلال 30 يوم`,
      });
    }

    // تنبيه Leads بدون متابعة
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const staleLeads = await this.prisma.lead.count({
      where: {
        organizationId,
        updatedAt: { lt: sevenDaysAgo },
        stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
      },
    });

    if (staleLeads > 0) {
      alerts.push({
        type: 'stale_leads',
        severity: 'info',
        message: `${staleLeads} leads haven't been updated in 7 days`,
        messageAr: `${staleLeads} عملاء محتملين بدون تحديث منذ 7 أيام`,
      });
    }

    // تنبيه حجوزات منتهية
    const expiredReservations = await this.prisma.propertyLock.count({
      where: {
        organizationId,
        expiresAt: { lt: new Date() },
        lockType: 'temp',
      },
    });

    if (expiredReservations > 0) {
      alerts.push({
        type: 'expired_reservations',
        severity: 'warning',
        message: `${expiredReservations} temporary reservations have expired`,
        messageAr: `${expiredReservations} حجوز مؤقتة منتهية`,
      });
    }

    return alerts;
  }

  /**
   * توليد ملخص بالذكاء الاصطناعي
   */
  private async generateAISummary(digestData: DailyDigestData): Promise<DigestSummary> {
    if (!this.zai) {
      return this.getDefaultSummary(digestData);
    }

    try {
      const prompt = this.buildDigestPrompt(digestData);

      const completion = await this.zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `أنت مساعد ذكي لمكتب عقاري مصري. قم بإنشاء ملخص يومي احترافي بالعربية.
            
يجب أن تتضمن إجابتك:
1. عنوان جذاب للملخص
2. ملخص عام عن أداء اليوم
3. أهم النقاط البارزة (كقائمة نقطية)
4. الإجراءات المطلوبة (كقائمة نقطية)
5. توصيات لتحسين الأداء

أعد الإجابة بتنسيق JSON:
{
  "titleAr": "عنوان الملخص",
  "summaryAr": "الملخص العام",
  "keyHighlights": ["نقطة 1", "نقطة 2"],
  "actionItems": ["إجراء 1", "إجراء 2"],
  "recommendations": ["توصية 1", "توصية 2"]
}

استخدم لغة عربية فصيحة ومناسبة للأعمال.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      });

      const response = completion.choices?.[0]?.message?.content || '';
      return this.parseSummaryResponse(response, digestData);
    } catch (error) {
      this.logger.error('AI summary generation failed:', error);
      return this.getDefaultSummary(digestData);
    }
  }

  /**
   * Build prompt for AI
   */
  private buildDigestPrompt(digestData: DailyDigestData): string {
    return `قم بإنشاء ملخص يومي للمكتب العقاري بناءً على البيانات التالية:

📊 إحصائيات اليوم:
- عملاء محتملين جدد: ${digestData.stats.leadsCreated}
- عملاء مؤهلين: ${digestData.stats.leadsQualified}
- معاينات مجدولة: ${digestData.stats.viewingsScheduled}
- معاينات مكتملة: ${digestData.stats.viewingsCompleted}
- عقود موقعة: ${digestData.stats.contractsSigned}
- مدفوعات مستلمة: ${digestData.stats.paymentsReceived}
- إجمالي الإيرادات: ${digestData.stats.totalRevenue} ج.م

💼 صفقات جديدة (${digestData.newDeals.count}):
${digestData.newDeals.items.map((d) => `- ${d.clientName}: ${d.propertyTitle} (${d.value} ${d.currency})`).join('\n')}

⚠️ مدفوعات متأخرة (${digestData.overduePayments.count}):
${digestData.overduePayments.items.map((p) => `- ${p.clientName}: ${p.amount} ج.م (متأخر ${p.daysOverdue} يوم)`).join('\n')}

📅 مدفوعات قادمة (${digestData.upcomingPayments.count}):
${digestData.upcomingPayments.items.map((p) => `- ${p.clientName}: ${p.amount} ج.م (تاريخ الاستحقاق: ${p.dueDate.toLocaleDateString('ar-EG')})`).join('\n')}

🔔 تنبيهات:
${digestData.alerts.map((a) => `- [${a.severity}] ${a.messageAr}`).join('\n')}

أنشئ ملخصاً يومياً شاملاً ومفيداً للإدارة.`;
  }

  /**
   * Parse AI response
   */
  private parseSummaryResponse(response: string, digestData: DailyDigestData): DigestSummary {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        titleAr: parsed.titleAr || 'الملخص اليومي',
        summaryAr: parsed.summaryAr || '',
        keyHighlights: Array.isArray(parsed.keyHighlights) ? parsed.keyHighlights : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      };
    } catch {
      return this.getDefaultSummary(digestData);
    }
  }

  /**
   * Get default summary when AI fails
   */
  private getDefaultSummary(digestData: DailyDigestData): DigestSummary {
    const highlights: string[] = [];
    const actions: string[] = [];
    const recommendations: string[] = [];

    if (digestData.newDeals.count > 0) {
      highlights.push(`تم إضافة ${digestData.newDeals.count} صفقات جديدة بقيمة إجمالية ${digestData.newDeals.totalValue} ج.م`);
    }

    if (digestData.stats.contractsSigned > 0) {
      highlights.push(`تم توقيع ${digestData.stats.contractsSigned} عقود جديدة`);
    }

    if (digestData.stats.totalRevenue > 0) {
      highlights.push(`إجمالي الإيرادات اليوم: ${digestData.stats.totalRevenue} ج.م`);
    }

    if (digestData.overduePayments.count > 0) {
      actions.push(`متابعة ${digestData.overduePayments.count} مدفوعات متأخرة`);
      recommendations.push('وضع خطة لتحصيل المدفوعات المتأخرة');
    }

    if (digestData.upcomingPayments.count > 0) {
      actions.push(`التحضير لـ ${digestData.upcomingPayments.count} مدفوعات قادمة`);
    }

    digestData.alerts.forEach((alert) => {
      if (alert.severity === 'critical') {
        actions.push(alert.messageAr);
      }
    });

    return {
      titleAr: `الملخص اليومي - ${digestData.date.toLocaleDateString('ar-EG')}`,
      summaryAr: `تم اليوم تسجيل ${digestData.stats.leadsCreated} عملاء محتملين جدد و ${digestData.stats.viewingsCompleted} معاينة مكتملة.`,
      keyHighlights: highlights.length > 0 ? highlights : ['لا توجد أحداث بارزة اليوم'],
      actionItems: actions.length > 0 ? actions : ['لا توجد إجراءات عاجلة'],
      recommendations: recommendations.length > 0 ? recommendations : ['استمرار متابعة العملاء المحتملين'],
    };
  }

  /**
   * إرسال الملخص للـ Owner/GM
   */
  private async sendDigest(
    organizationId: string,
    digestData: DailyDigestData,
    summary: DigestSummary,
  ): Promise<void> {
    // جلب Owner و GM
    const recipients = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ['OWNER', 'GENERAL_MANAGER'] },
        isActive: true,
      },
      select: { id: true, phone: true, firstName: true, lastName: true },
    });

    for (const recipient of recipients) {
      // إرسال إشعار في التطبيق
      await this.notificationsService.sendNotification(
        {
          userId: recipient.id,
          type: 'daily_digest',
          title: summary.titleAr,
          body: summary.summaryAr,
          data: {
            digestData: {
              date: digestData.date.toISOString(),
              stats: digestData.stats,
              newDealsCount: digestData.newDeals.count,
              overduePaymentsCount: digestData.overduePayments.count,
              upcomingPaymentsCount: digestData.upcomingPayments.count,
              alertsCount: digestData.alerts.length,
            },
            summary,
          },
          channels: ['in_app'],
        },
        organizationId,
      );

      // إرسال عبر WhatsApp إذا كان الرقم متوفراً
      if (recipient.phone) {
        await this.sendWhatsAppDigest(recipient.phone, summary, digestData);
      }

      this.logger.log(`Digest sent to ${recipient.firstName} ${recipient.lastName}`);
    }

    // إرسال حدث
    this.eventEmitter.emit('digest.sent', {
      organizationId,
      recipientsCount: recipients.length,
      date: digestData.date,
    });
  }

  /**
   * إرسال عبر WhatsApp
   */
  private async sendWhatsAppDigest(
    phone: string,
    summary: DigestSummary,
    digestData: DailyDigestData,
  ): Promise<void> {
    try {
      // بناء رسالة WhatsApp
      const message = this.formatWhatsAppMessage(summary, digestData);

      // TODO: Call WhatsApp service to send message
      // For now, just log it
      this.logger.debug(`WhatsApp message for ${phone}: ${message.substring(0, 100)}...`);

      // Emit event for WhatsApp service to handle
      this.eventEmitter.emit('whatsapp.send_digest', {
        phone,
        message,
        summary,
      });
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp digest to ${phone}:`, error);
    }
  }

  /**
   * Format WhatsApp message
   */
  private formatWhatsAppMessage(summary: DigestSummary, digestData: DailyDigestData): string {
    const lines = [
      `🏢 *${summary.titleAr}*`,
      '',
      summary.summaryAr,
      '',
      '📊 *أبرز الأحداث:*',
      ...summary.keyHighlights.map((h) => `• ${h}`),
      '',
      '⚠️ *إجراءات مطلوبة:*',
      ...summary.actionItems.map((a) => `• ${a}`),
      '',
      '💡 *توصيات:*',
      ...summary.recommendations.map((r) => `• ${r}`),
      '',
      '📈 *إحصائيات اليوم:*',
      `• عملاء جدد: ${digestData.stats.leadsCreated}`,
      `• معاينات: ${digestData.stats.viewingsCompleted}`,
      `• عقود: ${digestData.stats.contractsSigned}`,
      `• إيرادات: ${digestData.stats.totalRevenue} ج.م`,
    ];

    return lines.join('\n');
  }
}
