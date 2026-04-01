// @ts-nocheck
// ═══════════════════════════════════════════════════════════════
// Compliance Service - نظام تشغيل المكتب العقاري المصري
// Phase 5.02 — Compliance Center (578/2025)
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateComplianceRecordDto,
  UpdateComplianceRecordDto,
  GetComplianceRecordsDto,
  ExpiringRecordsDto,
  ComplianceRecordType,
  ComplianceRecordStatus,
  ComplianceEntityType,
  BrokerClassification,
  AlertType,
  COMPLIANCE_RECORD_TYPE_AR,
  COMPLIANCE_RECORD_STATUS_AR,
  COMPLIANCE_ENTITY_TYPE_AR,
  BROKER_CLASSIFICATION_AR,
  ALERT_TYPE_AR,
  ComplianceStatusDto,
  BrokerRegistryDto,
  ComplianceAlertDto,
} from './dto/compliance.dto';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  // أيام التنبيهات حسب القانون
  private readonly ALERT_DAYS = [90, 30, 7];

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * إنشاء سجل امتثال جديد
   */
  async create(
    organizationId: string,
    userId: string,
    dto: CreateComplianceRecordDto,
    ipAddress?: string,
  ) {
    // حساب حالة السجل
    const status = this.calculateRecordStatus(dto.expiresAt ? new Date(dto.expiresAt) : null);

    const record = await this.prisma.complianceRecord.create({
      data: {
        organizationId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        recordType: dto.recordType,
        referenceNumber: dto.referenceNumber,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        status,
        documentUrl: dto.documentUrl,
        notes: dto.notes,
      },
    });

    // تسجيل في الـ audit
    await this.auditService.log({
      organizationId,
      userId,
      action: 'compliance.record_created',
      entityType: 'compliance_record',
      entityId: record.id,
      newValue: {
        recordType: dto.recordType,
        entityType: dto.entityType,
        entityId: dto.entityId,
        expiresAt: dto.expiresAt,
      },
      ipAddress,
    });

    return this.formatRecordResponse(record);
  }

  /**
   * قائمة سجلات الامتثال
   */
  async findAll(organizationId: string, query: GetComplianceRecordsDto) {
    const {
      page = 1,
      limit = 20,
      entityType,
      entityId,
      recordType,
      status,
      expiringWithinDays,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (recordType) where.recordType = recordType;
    if (status) where.status = status;

    if (expiringWithinDays) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiringWithinDays);
      where.expiresAt = {
        gte: new Date(),
        lte: expiryDate,
      };
    }

    const [records, total] = await Promise.all([
      this.prisma.complianceRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expiresAt: 'asc' },
      }),
      this.prisma.complianceRecord.count({ where }),
    ]);

    return {
      data: records.map((r) => this.formatRecordResponse(r)),
      meta: {
        total,
        page,
        limit,
        hasMore: skip + records.length < total,
      },
    };
  }

  /**
   * تفاصيل سجل
   */
  async findOne(id: string, organizationId: string) {
    const record = await this.prisma.complianceRecord.findFirst({
      where: { id, organizationId },
    });

    if (!record) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COMPLIANCE_RECORD_NOT_FOUND',
          message: 'Compliance record not found',
          messageAr: 'سجل الامتثال غير موجود',
          traceId: crypto.randomUUID(),
        },
      });
    }

    return this.formatRecordResponse(record);
  }

  /**
   * تحديث سجل
   */
  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateComplianceRecordDto,
    ipAddress?: string,
  ) {
    const existing = await this.findOne(id, organizationId);

    const updateData: any = {};
    if (dto.recordType) updateData.recordType = dto.recordType;
    if (dto.referenceNumber) updateData.referenceNumber = dto.referenceNumber;
    if (dto.issuedAt) updateData.issuedAt = new Date(dto.issuedAt);
    if (dto.expiresAt) updateData.expiresAt = new Date(dto.expiresAt);
    if (dto.documentUrl) updateData.documentUrl = dto.documentUrl;
    if (dto.notes) updateData.notes = dto.notes;
    if (dto.status) updateData.status = dto.status;

    // إعادة حساب الحالة إذا تغير تاريخ الانتهاء
    if (dto.expiresAt !== undefined) {
      updateData.status = this.calculateRecordStatus(
        dto.expiresAt ? new Date(dto.expiresAt) : null,
      );
    }

    const record = await this.prisma.complianceRecord.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'compliance.record_updated',
      entityType: 'compliance_record',
      entityId: id,
      oldValue: {
        recordType: existing.recordType,
        status: existing.status,
        expiresAt: existing.expiresAt,
      },
      newValue: updateData,
      ipAddress,
    });

    return this.formatRecordResponse(record);
  }

  /**
   * حذف سجل
   */
  async remove(
    id: string,
    organizationId: string,
    userId: string,
    ipAddress?: string,
  ) {
    const record = await this.findOne(id, organizationId);

    await this.auditService.log({
      organizationId,
      userId,
      action: 'compliance.record_deleted',
      entityType: 'compliance_record',
      entityId: id,
      oldValue: {
        recordType: record.recordType,
        referenceNumber: record.referenceNumber,
      },
      ipAddress,
    });

    await this.prisma.complianceRecord.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * سجل السماسرة
   */
  async getBrokerRegistry(organizationId: string): Promise<BrokerRegistryDto[]> {
    // جلب جميع المستخدمين بدور BROKER أو SALES_MANAGER
    const brokers = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ['BROKER', 'SALES_MANAGER'] },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        firstNameAr: true,
        lastNameAr: true,
        email: true,
        phone: true,
        brokerLicenseNo: true,
        brokerLicenseExp: true,
        brokerClassification: true,
      },
    });

    const result: BrokerRegistryDto[] = [];

    for (const broker of brokers) {
      // جلب سجلات الامتثال للسمسري
      const records = await this.prisma.complianceRecord.findMany({
        where: {
          organizationId,
          entityType: ComplianceEntityType.USER,
          entityId: broker.id,
        },
      });

      // تحديد المستندات المفقودة والمنتهية
      const requiredRecords = [
        ComplianceRecordType.BROKER_LICENSE,
      ];

      const missingDocuments: string[] = [];
      const expiredDocuments: string[] = [];

      for (const required of requiredRecords) {
        const record = records.find((r) => r.recordType === required);
        if (!record) {
          missingDocuments.push(COMPLIANCE_RECORD_TYPE_AR[required]);
        } else if (record.status === ComplianceRecordStatus.EXPIRED) {
          expiredDocuments.push(COMPLIANCE_RECORD_TYPE_AR[required]);
        }
      }

      // حساب حالة الامتثال
      let complianceStatus: 'compliant' | 'warning' | 'non_compliant' = 'compliant';
      let daysUntilExpiry: number | undefined;

      if (broker.brokerLicenseExp) {
        const now = new Date();
        const diffTime = broker.brokerLicenseExp.getTime() - now.getTime();
        daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
          complianceStatus = 'non_compliant';
        } else if (daysUntilExpiry < 30) {
          complianceStatus = 'warning';
        }
      }

      if (expiredDocuments.length > 0) {
        complianceStatus = 'non_compliant';
      } else if (missingDocuments.length > 0) {
        complianceStatus = 'warning';
      }

      const statusArMap = {
        compliant: 'ممتثل',
        warning: 'تحذير',
        non_compliant: 'غير ممتثل',
      };

      result.push({
        userId: broker.id,
        name: `${broker.firstName} ${broker.lastName}`,
        nameAr: broker.firstNameAr && broker.lastNameAr
          ? `${broker.firstNameAr} ${broker.lastNameAr}`
          : `${broker.firstName} ${broker.lastName}`,
        email: broker.email,
        phone: broker.phone || undefined,
        brokerLicenseNo: broker.brokerLicenseNo || undefined,
        brokerClassification: broker.brokerClassification as BrokerClassification || undefined,
        brokerLicenseExp: broker.brokerLicenseExp || undefined,
        complianceStatus,
        complianceStatusAr: statusArMap[complianceStatus],
        daysUntilExpiry,
        missingDocuments,
        expiredDocuments,
      });
    }

    return result;
  }

  /**
   * فحص المستندات المنتهية
   */
  async checkExpiringDocuments(organizationId: string, days: number = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    // المستندات المنتهية
    const expired = await this.prisma.complianceRecord.findMany({
      where: {
        organizationId,
        expiresAt: { lte: new Date() },
        status: { not: ComplianceRecordStatus.EXPIRED },
      },
    });

    // المستندات القريبة من الانتهاء
    const expiringSoon = await this.prisma.complianceRecord.findMany({
      where: {
        organizationId,
        expiresAt: {
          gt: new Date(),
          lte: expiryDate,
        },
        status: ComplianceRecordStatus.VALID,
      },
    });

    // تحديث حالة المنتهية
    if (expired.length > 0) {
      await this.prisma.complianceRecord.updateMany({
        where: { id: { in: expired.map((r) => r.id) } },
        data: { status: ComplianceRecordStatus.EXPIRED },
      });
    }

    // تحديث حالة القريبة من الانتهاء
    if (expiringSoon.length > 0) {
      await this.prisma.complianceRecord.updateMany({
        where: { id: { in: expiringSoon.map((r) => r.id) } },
        data: { status: ComplianceRecordStatus.EXPIRING_SOON },
      });
    }

    return {
      expired: expired.map((r) => this.formatRecordResponse(r)),
      expiringSoon: expiringSoon.map((r) => this.formatRecordResponse(r)),
    };
  }

  /**
   * توليد التنبيهات
   */
  async generateAlerts(organizationId: string): Promise<ComplianceAlertDto[]> {
    const alerts: ComplianceAlertDto[] = [];
    const now = new Date();

    // جلب جميع السجلات
    const records = await this.prisma.complianceRecord.findMany({
      where: { organizationId },
    });

    // جلب معلومات الكيانات
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId },
    });

    const users = await this.prisma.user.findMany({
      where: { organizationId },
      select: { id: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    for (const record of records) {
      if (!record.expiresAt) continue;

      const diffTime = record.expiresAt.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let alertType: AlertType | null = null;
      let priority = 3;

      if (daysRemaining < 0) {
        alertType = AlertType.EXPIRED;
        priority = 1;
      } else if (daysRemaining <= 7) {
        alertType = AlertType.EXPIRING_7_DAYS;
        priority = 1;
      } else if (daysRemaining <= 30) {
        alertType = AlertType.EXPIRING_30_DAYS;
        priority = 2;
      } else if (daysRemaining <= 90) {
        alertType = AlertType.EXPIRING_90_DAYS;
        priority = 3;
      }

      if (alertType) {
        // اسم الكيان
        let entityName = '';
        if (record.entityType === ComplianceEntityType.ORGANIZATION) {
          entityName = organization?.name || 'المنظمة';
        } else if (record.entityType === ComplianceEntityType.USER) {
          const user = userMap.get(record.entityId);
          entityName = user
            ? `${user.firstNameAr || user.firstName} ${user.lastNameAr || user.lastName}`
            : 'مستخدم';
        }

        alerts.push({
          id: `alert-${record.id}`,
          type: alertType,
          typeAr: ALERT_TYPE_AR[alertType],
          title: `${COMPLIANCE_RECORD_TYPE_AR[record.recordType as ComplianceRecordType]} - ${entityName}`,
          titleAr: `${COMPLIANCE_RECORD_TYPE_AR[record.recordType as ComplianceRecordType]} - ${entityName}`,
          message: `Document expires on ${record.expiresAt.toISOString().split('T')[0]}`,
          messageAr: `المستند ينتهي في ${record.expiresAt.toLocaleDateString('ar-EG')}`,
          entityType: record.entityType,
          entityId: record.entityId,
          entityName,
          recordType: record.recordType,
          expiresAt: record.expiresAt,
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
          priority,
          createdAt: new Date(),
          isRead: false,
        });
      }
    }

    // ترتيب حسب الأولوية
    return alerts.sort((a, b) => a.priority - b.priority);
  }

  /**
   * حالة الامتثال الكاملة
   */
  async getComplianceStatus(organizationId: string): Promise<ComplianceStatusDto> {
    // جلب المنظمة
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId },
    });

    // إحصائيات السجلات
    const [
      totalRecords,
      validRecords,
      expiringRecords,
      expiredRecords,
    ] = await Promise.all([
      this.prisma.complianceRecord.count({ where: { organizationId } }),
      this.prisma.complianceRecord.count({
        where: { organizationId, status: ComplianceRecordStatus.VALID },
      }),
      this.prisma.complianceRecord.count({
        where: { organizationId, status: ComplianceRecordStatus.EXPIRING_SOON },
      }),
      this.prisma.complianceRecord.count({
        where: { organizationId, status: ComplianceRecordStatus.EXPIRED },
      }),
    ]);

    // السماسرة
    const brokers = await this.getBrokerRegistry(organizationId);
    const compliantBrokers = brokers.filter((b) => b.complianceStatus === 'compliant').length;

    // التنبيهات
    const alerts = await this.generateAlerts(organizationId);

    // حساب نسبة الامتثال
    const compliancePercentage = totalRecords > 0
      ? Math.round((validRecords / totalRecords) * 100)
      : 100;

    // تحديد حالة المنظمة
    let organizationStatus: 'compliant' | 'warning' | 'non_compliant' = 'compliant';
    if (compliancePercentage < 70 || expiredRecords > 0) {
      organizationStatus = 'non_compliant';
    } else if (compliancePercentage < 90 || expiringRecords > 0) {
      organizationStatus = 'warning';
    }

    // تصنيف المكتب
    let officeClassification: BrokerClassification | undefined;
    let officeLicenseExpiry: Date | undefined;
    let officeLicenseDaysRemaining: number | undefined;

    if (organization?.classification) {
      officeClassification = organization.classification as BrokerClassification;
    }

    // البحث عن رخصة المكتب
    const officeLicense = await this.prisma.complianceRecord.findFirst({
      where: {
        organizationId,
        entityType: ComplianceEntityType.ORGANIZATION,
        recordType: ComplianceRecordType.BROKER_LICENSE,
      },
    });

    if (officeLicense?.expiresAt) {
      officeLicenseExpiry = officeLicense.expiresAt;
      const diffTime = officeLicense.expiresAt.getTime() - new Date().getTime();
      officeLicenseDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const statusArMap = {
      compliant: 'ممتثل',
      warning: 'تحذير',
      non_compliant: 'غير ممتثل',
    };

    return {
      organizationStatus,
      organizationStatusAr: statusArMap[organizationStatus],
      compliancePercentage,
      totalRecords,
      validRecords,
      expiringRecords,
      expiredRecords,
      totalBrokers: brokers.length,
      compliantBrokers,
      activeAlerts: alerts.length,
      officeClassification,
      officeLicenseExpiry,
      officeLicenseDaysRemaining,
    };
  }

  /**
   * إرسال تنبيهات الامتثال
   */
  async sendComplianceAlerts(organizationId: string) {
    const alerts = await this.generateAlerts(organizationId);

    if (alerts.length > 0) {
      // إرسال حدث للتنبيهات
      this.eventEmitter.emit('compliance.alert', {
        organizationId,
        alerts,
        count: alerts.length,
      });

      // فحص المستندات المنتهية وإرسال حدث
      const expired = alerts.filter((a) => a.type === AlertType.EXPIRED);
      if (expired.length > 0) {
        this.eventEmitter.emit('compliance.document_expired', {
          organizationId,
          documents: expired,
        });
      }
    }

    return { alertsSent: alerts.length };
  }

  // ═══════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * حساب حالة السجل
   */
  private calculateRecordStatus(expiresAt: Date | null): ComplianceRecordStatus {
    if (!expiresAt) return ComplianceRecordStatus.VALID;

    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) return ComplianceRecordStatus.EXPIRED;
    if (daysRemaining <= 30) return ComplianceRecordStatus.EXPIRING_SOON;
    return ComplianceRecordStatus.VALID;
  }

  /**
   * تنسيق استجابة السجل
   */
  private formatRecordResponse(record: any) {
    return {
      ...record,
      recordTypeAr: COMPLIANCE_RECORD_TYPE_AR[record.recordType as ComplianceRecordType] || record.recordType,
      statusAr: COMPLIANCE_RECORD_STATUS_AR[record.status as ComplianceRecordStatus] || record.status,
      entityTypeAr: COMPLIANCE_ENTITY_TYPE_AR[record.entityType as ComplianceEntityType] || record.entityType,
    };
  }
}
