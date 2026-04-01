// ═══════════════════════════════════════════════════════════════
// Compliance Cron Service - نظام تشغيل المكتب العقاري المصري
// Phase 5.02 — Compliance Center (578/2025)
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { ComplianceService } from '../compliance.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ComplianceCronService {
  private readonly logger = new Logger(ComplianceCronService.name);

  constructor(
    private prisma: PrismaService,
    private complianceService: ComplianceService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * فحص يومي للمستندات المنتهية
   * يعمل كل يوم الساعة 8 صباحاً بتوقيت القاهرة
   */
  @Cron('0 8 * * *', {
    timeZone: 'Africa/Cairo',
    name: 'checkExpiringDocuments',
  })
  async handleDailyExpiryCheck() {
    this.logger.log('Starting daily compliance check...');

    try {
      // جلب جميع المنظمات
      const organizations = await this.prisma.organization.findMany({
        where: { isSetupDone: true },
        select: { id: true, name: true },
      });

      for (const org of organizations) {
        try {
          // فحص المستندات المنتهية
          const result = await this.complianceService.checkExpiringDocuments(org.id, 30);

          if (result.expired.length > 0 || result.expiringSoon.length > 0) {
            this.logger.log(
              `Organization ${org.name}: ${result.expired.length} expired, ${result.expiringSoon.length} expiring soon`,
            );

            // إرسال تنبيهات
            await this.complianceService.sendComplianceAlerts(org.id);
          }
        } catch (error) {
          this.logger.error(`Failed to check compliance for organization ${org.id}:`, error);
        }
      }

      this.logger.log('Daily compliance check completed');
    } catch (error) {
      this.logger.error('Daily compliance check failed:', error);
    }
  }

  /**
   * فحص أسبوعي للسماسرة
   * يعمل كل يوم إثنين الساعة 9 صباحاً
   */
  @Cron('0 9 * * 1', {
    timeZone: 'Africa/Cairo',
    name: 'weeklyBrokerCheck',
  })
  async handleWeeklyBrokerCheck() {
    this.logger.log('Starting weekly broker compliance check...');

    try {
      const organizations = await this.prisma.organization.findMany({
        where: { isSetupDone: true },
        select: { id: true, name: true },
      });

      for (const org of organizations) {
        try {
          const brokers = await this.complianceService.getBrokerRegistry(org.id);

          // السماسرة غير الممتثلين
          const nonCompliant = brokers.filter(
            (b) => b.complianceStatus === 'non_compliant',
          );

          if (nonCompliant.length > 0) {
            this.logger.warn(
              `Organization ${org.name}: ${nonCompliant.length} non-compliant brokers`,
            );

            // إرسال حدث
            this.eventEmitter.emit('compliance.brokers_non_compliant', {
              organizationId: org.id,
              brokers: nonCompliant,
              count: nonCompliant.length,
            });
          }
        } catch (error) {
          this.logger.error(`Failed to check brokers for organization ${org.id}:`, error);
        }
      }

      this.logger.log('Weekly broker compliance check completed');
    } catch (error) {
      this.logger.error('Weekly broker compliance check failed:', error);
    }
  }

  /**
   * تقرير شهري للامتثال
   * يعمل أول كل شهر الساعة 10 صباحاً
   */
  @Cron('0 10 1 * *', {
    timeZone: 'Africa/Cairo',
    name: 'monthlyComplianceReport',
  })
  async handleMonthlyComplianceReport() {
    this.logger.log('Generating monthly compliance report...');

    try {
      const organizations = await this.prisma.organization.findMany({
        where: { isSetupDone: true },
        select: { id: true, name: true },
      });

      for (const org of organizations) {
        try {
          const status = await this.complianceService.getComplianceStatus(org.id);

          // إرسال حدث التقرير الشهري
          this.eventEmitter.emit('compliance.monthly_report', {
            organizationId: org.id,
            organizationName: org.name,
            status,
            generatedAt: new Date(),
          });

          this.logger.log(
            `Monthly report for ${org.name}: ${status.compliancePercentage}% compliant`,
          );
        } catch (error) {
          this.logger.error(`Failed to generate report for organization ${org.id}:`, error);
        }
      }

      this.logger.log('Monthly compliance report completed');
    } catch (error) {
      this.logger.error('Monthly compliance report failed:', error);
    }
  }

  /**
   * تحديث حالات المستندات كل ساعة
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'updateDocumentStatuses',
  })
  async handleHourlyStatusUpdate() {
    this.logger.debug('Running hourly compliance status update...');

    try {
      // تحديث السجلات القريبة من الانتهاء
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // تحويل السجلات من VALID إلى EXPIRING_SOON
      const updated = await this.prisma.complianceRecord.updateMany({
        where: {
          expiresAt: {
            gt: new Date(),
            lte: thirtyDaysFromNow,
          },
          status: 'valid',
        },
        data: {
          status: 'expiring_soon',
        },
      });

      if (updated.count > 0) {
        this.logger.log(`Updated ${updated.count} records to expiring_soon status`);
      }

      // تحويل السجلات المنتهية
      const expired = await this.prisma.complianceRecord.updateMany({
        where: {
          expiresAt: { lte: new Date() },
          status: { in: ['valid', 'expiring_soon'] },
        },
        data: {
          status: 'expired',
        },
      });

      if (expired.count > 0) {
        this.logger.log(`Marked ${expired.count} records as expired`);
      }
    } catch (error) {
      this.logger.error('Hourly status update failed:', error);
    }
  }
}
