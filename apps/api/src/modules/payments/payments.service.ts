// ═══════════════════════════════════════════════════════════════
// Payments Service - خدمة إدارة المدفوعات
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  RefundPaymentDto,
  GetPaymentsDto,
  PaymentStatsDto,
  ReconcilePaymentsDto,
  PaymobWebhookDto,
  FawryWebhookDto,
  PaymentStatus,
  InstallmentStatus,
  PaymentGateway,
  PAYMENT_STATUS_AR,
  PAYMENT_METHOD_AR,
} from './dto/payments.dto';
import { PaymentMethod, DealStage } from '@realestate/shared-types';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
    private configService: ConfigService,
  ) {}

  /**
   * تسجيل دفعة مع idempotency
   */
  async record(
    dto: CreatePaymentDto,
    organizationId: string,
    userId: string,
  ) {
    // التحقق من Idempotency Key
    if (dto.idempotencyKey) {
      const existingPayment = await this.prisma.payment.findFirst({
        where: {
          organizationId,
          notes: { contains: `idempotency:${dto.idempotencyKey}` },
        },
      });

      if (existingPayment) {
        this.logger.log(`Duplicate payment prevented with idempotency key: ${dto.idempotencyKey}`);
        return this.findOne(existingPayment.id, organizationId);
      }
    }

    // التحقق من وجود القسط أو الصفقة
    let installment = null;
    let dealId = dto.dealId;

    if (dto.installmentId) {
      installment = await this.prisma.installment.findFirst({
        where: { id: dto.installmentId, organizationId },
        include: { paymentSchedule: true },
      });

      if (!installment) {
        throw new NotFoundException({
          success: false,
          error: {
            code: 'INSTALLMENT_NOT_FOUND',
            message: 'Installment not found',
            messageAr: 'القسط غير موجود',
          },
        });
      }

      dealId = installment.paymentSchedule.dealId;
    }

    // التحقق من وجود الصفقة
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId, deletedAt: null },
    });

    if (!deal) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'DEAL_NOT_FOUND',
          message: 'Deal not found',
          messageAr: 'الصفقة غير موجودة',
        },
      });
    }

    // إنشاء الدفعة
    const payment = await this.prisma.$transaction(async (tx) => {
      const notesWithIdempotency = dto.idempotencyKey
        ? `${dto.notes || ''}\nidempotency:${dto.idempotencyKey}`
        : dto.notes;

      const newPayment = await tx.payment.create({
        data: {
          organizationId,
          installmentId: dto.installmentId,
          dealId,
          amount: dto.amount,
          currency: dto.currency || 'EGP',
          method: dto.method,
          status: PaymentStatus.PENDING,
          checkNumber: dto.checkNumber,
          bankName: dto.bankName,
          transactionRef: dto.transactionRef,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          notes: notesWithIdempotency,
        },
      });

      // إذا كان القسط موجود، تحديث حالته
      if (installment) {
        await this.updateInstallmentStatus(tx, dto.installmentId);
      }

      return newPayment;
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'PAYMENT_RECORDED',
      entityType: 'payment',
      entityId: payment.id,
      newValue: {
        dealId,
        installmentId: dto.installmentId,
        amount: dto.amount,
        method: dto.method,
        idempotencyKey: dto.idempotencyKey,
      },
    });

    // إرسال حدث
    this.eventEmitter.emit('payment.received', {
      type: 'payment.received',
      entityId: payment.id,
      entityType: 'payment',
      data: {
        dealId,
        installmentId: dto.installmentId,
        amount: dto.amount,
        method: dto.method,
      },
      timestamp: new Date(),
      userId,
    });

    return this.findOne(payment.id, organizationId);
  }

  /**
   * الحصول على تفاصيل دفعة
   */
  async findOne(id: string, organizationId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, organizationId },
      include: {
        installment: {
          select: {
            id: true,
            installmentNumber: true,
            type: true,
          },
        },
        etaReceipt: {
          select: {
            id: true,
            status: true,
            longId: true,
            qrCodeData: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment not found',
          messageAr: 'الدفعة غير موجودة',
        },
      });
    }

    // جلب معلومات الصفقة
    let deal = null;
    if (payment.dealId) {
      deal = await this.prisma.deal.findFirst({
        where: { id: payment.dealId, organizationId },
        select: {
          id: true,
          dealType: true,
          agreedPrice: true,
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          property: {
            select: {
              id: true,
              title: true,
              city: true,
            },
          },
        },
      });
    }

    // حساب المبلغ المسترد
    const refunds = await this.prisma.payment.findMany({
      where: {
        organizationId,
        status: PaymentStatus.REFUNDED,
        notes: { contains: `refund_for:${payment.id}` },
      },
    });

    const refundedAmount = refunds.reduce((sum, r) => sum + r.amount, 0);

    return {
      ...payment,
      methodAr: PAYMENT_METHOD_AR[payment.method as PaymentMethod] || payment.method,
      statusAr: PAYMENT_STATUS_AR[payment.status as PaymentStatus] || payment.status,
      refundedAmount,
      deal,
      installment: payment.installment
        ? {
            ...payment.installment,
            typeAr: payment.installment.type,
          }
        : null,
    };
  }

  /**
   * الحصول على دفعات صفقة
   */
  async getByDeal(dealId: string, organizationId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId, deletedAt: null },
    });

    if (!deal) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'DEAL_NOT_FOUND',
          message: 'Deal not found',
          messageAr: 'الصفقة غير موجودة',
        },
      });
    }

    const payments = await this.prisma.payment.findMany({
      where: { dealId, organizationId },
      include: {
        installment: {
          select: {
            id: true,
            installmentNumber: true,
            type: true,
          },
        },
        etaReceipt: {
          select: {
            id: true,
            status: true,
            longId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => ({
      ...p,
      methodAr: PAYMENT_METHOD_AR[p.method as PaymentMethod] || p.method,
      statusAr: PAYMENT_STATUS_AR[p.status as PaymentStatus] || p.status,
    }));
  }

  /**
   * تأكيد دفعة
   */
  async confirm(id: string, organizationId: string, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, organizationId },
      include: { installment: true },
    });

    if (!payment) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment not found',
          messageAr: 'الدفعة غير موجودة',
        },
      });
    }

    if (payment.status === PaymentStatus.CONFIRMED) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PAYMENT_ALREADY_CONFIRMED',
          message: 'Payment is already confirmed',
          messageAr: 'الدفعة مؤكدة مسبقاً',
        },
      });
    }

    // تحديث حالة الدفعة
    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: { status: PaymentStatus.CONFIRMED, updatedAt: new Date() },
      });

      // تحديث حالة القسط
      if (payment.installmentId) {
        await this.updateInstallmentStatus(tx, payment.installmentId);
      }

      return updated;
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'PAYMENT_CONFIRMED',
      entityType: 'payment',
      entityId: id,
      newValue: { status: PaymentStatus.CONFIRMED },
    });

    return this.findOne(id, organizationId);
  }

  /**
   * استرداد دفعة
   */
  async refund(
    id: string,
    dto: RefundPaymentDto,
    organizationId: string,
    userId: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, organizationId },
    });

    if (!payment) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment not found',
          messageAr: 'الدفعة غير موجودة',
        },
      });
    }

    if (payment.status !== PaymentStatus.CONFIRMED) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PAYMENT_NOT_CONFIRMED',
          message: 'Only confirmed payments can be refunded',
          messageAr: 'يمكن استرداد الدفعات المؤكدة فقط',
        },
      });
    }

    // التحقق من مبلغ الاسترداد
    const existingRefunds = await this.prisma.payment.findMany({
      where: {
        organizationId,
        status: PaymentStatus.REFUNDED,
        notes: { contains: `refund_for:${id}` },
      },
    });

    const alreadyRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);
    const maxRefundable = payment.amount - alreadyRefunded;

    if (dto.amount > maxRefundable) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'REFUND_AMOUNT_EXCEEDS',
          message: `Refund amount exceeds remaining refundable amount (${maxRefundable})`,
          messageAr: `مبلغ الاسترداد يتجاوز المبلغ المتبقي للاسترداد (${maxRefundable})`,
        },
      });
    }

    // إنشاء سجل الاسترداد
    const refundPayment = await this.prisma.$transaction(async (tx) => {
      // إنشاء سجل الاسترداد
      const refund = await tx.payment.create({
        data: {
          organizationId,
          installmentId: payment.installmentId,
          dealId: payment.dealId,
          amount: dto.amount,
          currency: payment.currency,
          method: payment.method,
          status: PaymentStatus.REFUNDED,
          notes: `استرداد للدفعة ${id}\nالسبب: ${dto.reason || 'غير محدد'}\nrefund_for:${id}\n${dto.notes || ''}`,
        },
      });

      // تحديث حالة الدفعة الأصلية
      const newStatus = alreadyRefunded + dto.amount >= payment.amount
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

      await tx.payment.update({
        where: { id },
        data: { status: newStatus, updatedAt: new Date() },
      });

      // تحديث حالة القسط
      if (payment.installmentId) {
        await this.updateInstallmentStatus(tx, payment.installmentId);
      }

      return refund;
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'PAYMENT_REFUNDED',
      entityType: 'payment',
      entityId: id,
      newValue: {
        refundId: refundPayment.id,
        amount: dto.amount,
        reason: dto.reason,
      },
    });

    return this.findOne(id, organizationId);
  }

  /**
   * الحصول على إحصائيات التحصيل
   */
  async getStats(organizationId: string, options: PaymentStatsDto = {}) {
    const { fromDate, toDate, dealId } = options;

    const where: any = { organizationId };
    if (dealId) where.dealId = dealId;

    if (fromDate || toDate) {
      where.paidAt = {};
      if (fromDate) where.paidAt.gte = new Date(fromDate);
      if (toDate) where.paidAt.lte = new Date(toDate);
    }

    // إحصائيات الدفعات
    const [totalDue, totalCollected, payments] = await Promise.all([
      this.getTotalDue(organizationId, dealId),
      this.prisma.payment.aggregate({
        where: { ...where, status: PaymentStatus.CONFIRMED },
        _sum: { amount: true },
      }),
      this.prisma.payment.findMany({ where }),
    ]);

    const confirmedPayments = payments.filter((p) => p.status === PaymentStatus.CONFIRMED);
    const pendingPayments = payments.filter((p) => p.status === PaymentStatus.PENDING);
    const refundedPayments = payments.filter((p) =>
      p.status === PaymentStatus.REFUNDED || p.status === PaymentStatus.PARTIALLY_REFUNDED
    );

    // الدفعات حسب الطريقة
    const paymentsByMethod = this.groupBy(
      confirmedPayments,
      'method',
      PAYMENT_METHOD_AR
    );

    // الدفعات حسب الحالة
    const paymentsByStatus = this.groupBy(
      payments,
      'status',
      PAYMENT_STATUS_AR
    );

    // الأقساط المتأخرة
    const overdueInstallments = await this.prisma.installment.findMany({
      where: {
        organizationId,
        dueDate: { lt: new Date() },
        status: { notIn: [InstallmentStatus.PAID, InstallmentStatus.CANCELLED] },
      },
    });

    const overdueStats = overdueInstallments.length > 0
      ? {
          count: overdueInstallments.length,
          totalAmount: overdueInstallments.reduce((sum, i) => sum + i.amount, 0),
          oldestDays: Math.max(
            ...overdueInstallments.map((i) =>
              Math.floor((Date.now() - new Date(i.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            )
          ),
        }
      : undefined;

    return {
      totalDue,
      totalCollected: totalCollected._sum.amount || 0,
      totalRemaining: totalDue - (totalCollected._sum.amount || 0),
      collectionRate: totalDue > 0 ? ((totalCollected._sum.amount || 0) / totalDue) * 100 : 0,
      confirmedPaymentsCount: confirmedPayments.length,
      pendingPaymentsCount: pendingPayments.length,
      refundedPaymentsCount: refundedPayments.length,
      paymentsByMethod,
      paymentsByStatus,
      overdueStats,
    };
  }

  /**
   * مطابقة المدفوعات
   */
  async reconcile(
    dto: ReconcilePaymentsDto,
    organizationId: string,
    userId: string,
  ) {
    const results = [];

    for (const paymentData of dto.payments) {
      const payment = await this.prisma.payment.findFirst({
        where: {
          id: paymentData.paymentId,
          organizationId,
          status: PaymentStatus.PENDING,
        },
      });

      if (!payment) {
        results.push({
          paymentId: paymentData.paymentId,
          status: 'not_found',
          message: 'الدفعة غير موجودة أو مؤكدة مسبقاً',
        });
        continue;
      }

      // التحقق من المبلغ
      if (Math.abs(payment.amount - paymentData.amount) > 0.01) {
        results.push({
          paymentId: paymentData.paymentId,
          status: 'amount_mismatch',
          message: `المبلغ لا يتطابق: المتوقع ${payment.amount}، الفعلي ${paymentData.amount}`,
        });
        continue;
      }

      // تأكيد الدفعة
      await this.prisma.payment.update({
        where: { id: paymentData.paymentId },
        data: {
          status: PaymentStatus.CONFIRMED,
          transactionRef: paymentData.transactionRef,
          bankName: paymentData.bankName || payment.bankName,
          paidAt: new Date(paymentData.paidAt),
          updatedAt: new Date(),
        },
      });

      results.push({
        paymentId: paymentData.paymentId,
        status: 'reconciled',
        message: 'تمت المطابقة بنجاح',
      });
    }

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'PAYMENTS_RECONCILED',
      entityType: 'payment',
      entityId: 'batch',
      newValue: {
        count: dto.payments.length,
        reconciled: results.filter((r) => r.status === 'reconciled').length,
        failed: results.filter((r) => r.status !== 'reconciled').length,
      },
    });

    return {
      totalProcessed: dto.payments.length,
      reconciled: results.filter((r) => r.status === 'reconciled').length,
      failed: results.filter((r) => r.status !== 'reconciled').length,
      details: results,
    };
  }

  /**
   * الحصول على جميع المدفوعات
   */
  async findAll(organizationId: string, options: GetPaymentsDto = {}) {
    const {
      dealId,
      installmentId,
      status,
      method,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = options;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (dealId) where.dealId = dealId;
    if (installmentId) where.installmentId = installmentId;
    if (status) where.status = status;
    if (method) where.method = method;

    if (fromDate || toDate) {
      where.paidAt = {};
      if (fromDate) where.paidAt.gte = new Date(fromDate);
      if (toDate) where.paidAt.lte = new Date(toDate);
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          installment: {
            select: {
              id: true,
              installmentNumber: true,
              type: true,
            },
          },
          etaReceipt: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments.map((p) => ({
        ...p,
        methodAr: PAYMENT_METHOD_AR[p.method as PaymentMethod] || p.method,
        statusAr: PAYMENT_STATUS_AR[p.status as PaymentStatus] || p.status,
      })),
      meta: {
        total,
        page,
        limit,
        hasMore: skip + payments.length < total,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Webhooks
  // ─────────────────────────────────────────────────────────────────

  /**
   * معالجة Webhook من Paymob
   */
  async handlePaymobWebhook(dto: PaymobWebhookDto, organizationId: string) {
    // التحقق من HMAC
    if (!this.verifyPaymobHmac(dto)) {
      this.logger.warn('Invalid Paymob HMAC signature');
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_HMAC',
          message: 'Invalid HMAC signature',
          messageAr: 'توقيع HMAC غير صالح',
        },
      });
    }

    const { obj } = dto;

    // البحث عن الدفعة باستخدام merchant_order_id
    const payment = await this.prisma.payment.findFirst({
      where: {
        organizationId,
        transactionRef: obj.order.merchant_order_id,
      },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for Paymob order: ${obj.order.merchant_order_id}`);
      return { received: true, message: 'Payment not found but webhook acknowledged' };
    }

    // تحديث حالة الدفعة
    if (obj.success && !obj.error_occured) {
      if (obj.is_refund || obj.is_void) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: obj.is_void ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
            gatewayRef: String(obj.id),
            updatedAt: new Date(),
          },
        });
      } else {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.CONFIRMED,
            gatewayRef: String(obj.id),
            updatedAt: new Date(),
          },
        });
      }
    } else {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          gatewayRef: String(obj.id),
          notes: `${payment.notes}\nPaymob error: ${obj.data.txn_response_code}`,
          updatedAt: new Date(),
        },
      });
    }

    // إرسال حدث
    this.eventEmitter.emit('payment.gateway_updated', {
      type: 'payment.gateway_updated',
      entityId: payment.id,
      entityType: 'payment',
      data: {
        gateway: PaymentGateway.PAYMOB,
        success: obj.success,
        amount: obj.amount_cents / 100,
      },
      timestamp: new Date(),
    });

    return { received: true, paymentId: payment.id };
  }

  /**
   * معالجة Webhook من Fawry
   */
  async handleFawryWebhook(dto: FawryWebhookDto, organizationId: string) {
    // التحقق من التوقيع
    if (!this.verifyFawrySignature(dto)) {
      this.logger.warn('Invalid Fawry signature');
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid Fawry signature',
          messageAr: 'توقيع Fawry غير صالح',
        },
      });
    }

    // البحث عن الدفعة باستخدام merchantRefNumber
    const payment = await this.prisma.payment.findFirst({
      where: {
        organizationId,
        transactionRef: dto.merchantRefNumber,
      },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for Fawry reference: ${dto.merchantRefNumber}`);
      return { received: true, message: 'Payment not found but webhook acknowledged' };
    }

    // تحديث حالة الدفعة
    if (dto.paymentStatus === 'PAID') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CONFIRMED,
          gatewayRef: dto.referenceNumber,
          updatedAt: new Date(),
        },
      });
    } else if (dto.paymentStatus === 'REFUNDED') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
          updatedAt: new Date(),
        },
      });
    } else if (dto.paymentStatus === 'FAILED' || dto.paymentStatus === 'EXPIRED') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          updatedAt: new Date(),
        },
      });
    }

    // إرسال حدث
    this.eventEmitter.emit('payment.gateway_updated', {
      type: 'payment.gateway_updated',
      entityId: payment.id,
      entityType: 'payment',
      data: {
        gateway: PaymentGateway.FAWRY,
        status: dto.paymentStatus,
        amount: dto.paymentAmount,
      },
      timestamp: new Date(),
    });

    return { received: true, paymentId: payment.id };
  }

  // ─────────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────────

  /**
   * تحديث حالة القسط
   */
  private async updateInstallmentStatus(tx: any, installmentId: string) {
    const payments = await tx.payment.findMany({
      where: { installmentId, status: PaymentStatus.CONFIRMED },
    });

    const installment = await tx.installment.findUnique({
      where: { id: installmentId },
    });

    if (!installment) return;

    const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0);

    let newStatus = InstallmentStatus.PENDING;
    if (totalPaid >= installment.amount) {
      newStatus = InstallmentStatus.PAID;
    } else if (totalPaid > 0) {
      newStatus = InstallmentStatus.PARTIALLY_PAID;
    }

    await tx.installment.update({
      where: { id: installmentId },
      data: { status: newStatus },
    });
  }

  /**
   * الحصول على إجمالي المبلغ المطلوب
   */
  private async getTotalDue(organizationId: string, dealId?: string): Promise<number> {
    const where: any = { organizationId };
    if (dealId) where.dealId = dealId;

    const schedules = await this.prisma.paymentSchedule.findMany({
      where,
      select: { totalAmount: true },
    });

    return schedules.reduce((sum, s) => sum + s.totalAmount, 0);
  }

  /**
   * تسجيل دفعة مع idempotency (alias for controller)
   */
  async recordPayment(
    dto: CreatePaymentDto,
    organizationId: string,
    userId: string,
    ipAddress?: string,
  ) {
    return this.record(dto, organizationId, userId);
  }

  /**
   * تأكيد دفعة (alias for controller)
   */
  async confirmPayment(id: string, organizationId: string, userId: string) {
    return this.confirm(id, organizationId, userId);
  }

  /**
   * إنشاء جدول أقساط
   */
  async createSchedule(dto: any, organizationId: string, userId: string) {
    // التحقق من وجود الصفقة
    const deal = await this.prisma.deal.findFirst({
      where: { id: dto.dealId, organizationId },
    });

    if (!deal) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'DEAL_NOT_FOUND',
          message: 'Deal not found',
          messageAr: 'الصفقة غير موجودة',
        },
      });
    }

    // التحقق من عدم وجود جدول سابق
    const existingSchedule = await this.prisma.paymentSchedule.findUnique({
      where: { dealId: dto.dealId },
    });

    if (existingSchedule) {
      throw new ConflictException({
        success: false,
        error: {
          code: 'SCHEDULE_EXISTS',
          message: 'Payment schedule already exists for this deal',
          messageAr: 'يوجد جدول أقساط سابق لهذه الصفقة',
        },
      });
    }

    // إنشاء جدول الأقساط
    const schedule = await this.prisma.paymentSchedule.create({
      data: {
        organizationId,
        dealId: dto.dealId,
        totalAmount: dto.totalAmount,
        currency: dto.currency || 'EGP',
        notes: dto.notes,
      },
    });

    // إنشاء الأقساط
    if (dto.installments && Array.isArray(dto.installments)) {
      for (const installment of dto.installments) {
        await this.prisma.installment.create({
          data: {
            organizationId,
            paymentScheduleId: schedule.id,
            installmentNumber: installment.number,
            type: installment.type,
            amount: installment.amount,
            currency: dto.currency || 'EGP',
            dueDate: new Date(installment.dueDate),
            notes: installment.notes,
          },
        });
      }
    }

    return schedule;
  }

  /**
   * الحصول على جدول أقساط صفقة
   */
  async getSchedule(dealId: string, organizationId: string) {
    const schedule = await this.prisma.paymentSchedule.findFirst({
      where: { dealId, organizationId },
      include: {
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'SCHEDULE_NOT_FOUND',
          message: 'Payment schedule not found',
          messageAr: 'جدول الأقساط غير موجود',
        },
      });
    }

    return schedule;
  }

  /**
   * الحصول على الأقساط المتأخرة
   */
  async getOverdueInstallments(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.installment.findMany({
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
                client: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    firstNameAr: true,
                    lastNameAr: true,
                    phone: true,
                  },
                },
                property: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
        payments: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * تجميع حسب حقل معين
   */
  private groupBy(
    payments: any[],
    field: string,
    translations: Record<string, string>
  ) {
    const grouped: Record<string, { count: number; amount: number }> = {};

    for (const payment of payments) {
      const key = payment[field];
      if (!grouped[key]) {
        grouped[key] = { count: 0, amount: 0 };
      }
      grouped[key].count++;
      grouped[key].amount += payment.amount;
    }

    return Object.entries(grouped).map(([key, value]) => ({
      [field]: key,
      [`${field}Ar`]: translations[key] || key,
      ...value,
    }));
  }

  /**
   * التحقق من HMAC Paymob
   */
  private verifyPaymobHmac(dto: PaymobWebhookDto): boolean {
    const hmacSecret = this.configService.get<string>('PAYMOB_HMAC_SECRET');
    if (!hmacSecret) {
      this.logger.warn('PAYMOB_HMAC_SECRET not configured, skipping HMAC verification');
      return true; // Skip verification if not configured
    }

    const { obj } = dto;
    const concatenated = [
      obj.amount_cents,
      obj.created_at,
      obj.currency,
      obj.error_occured ? 'true' : 'false',
      obj.id,
      obj.order.id,
      obj.pending ? 'true' : 'false',
      obj.source_data.pan,
      obj.source_data.sub_type,
      obj.source_data.type,
      obj.success ? 'true' : 'false',
    ].join('');

    const calculatedHmac = crypto
      .createHmac('sha512', hmacSecret)
      .update(concatenated)
      .digest('hex');

    return calculatedHmac === obj.hmac;
  }

  /**
   * التحقق من توقيع Fawry
   */
  private verifyFawrySignature(dto: FawryWebhookDto): boolean {
    const fawrySecret = this.configService.get<string>('FAWRY_SECRET_KEY');
    if (!fawrySecret) {
      this.logger.warn('FAWRY_SECRET_KEY not configured, skipping signature verification');
      return true; // Skip verification if not configured
    }

    const concatenated = [
      dto.referenceNumber,
      dto.merchantRefNumber,
      String(dto.paymentAmount),
      fawrySecret,
    ].join('');

    const calculatedSignature = crypto
      .createHash('sha256')
      .update(concatenated)
      .digest('hex');

    return calculatedSignature === dto.signature;
  }
}
