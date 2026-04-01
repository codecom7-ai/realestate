// ═══════════════════════════════════════════════════════════════
// Payment Schedules Service - خدمة إدارة جداول الأقساط
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreatePaymentScheduleDto,
  AddInstallmentDto,
  RecalculateScheduleDto,
  GetInstallmentsDto,
  InstallmentStatus,
  InstallmentType,
  INSTALLMENT_TYPE_AR,
  INSTALLMENT_STATUS_AR,
} from './dto/payment-schedules.dto';
import { PaymentStatus } from '../payments/dto/payments.dto';
import { DealStage } from '@realestate/shared-types';

@Injectable()
export class PaymentSchedulesService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
  ) {}

  /**
   * إنشاء جدول أقساط جديد
   */
  async create(
    dto: CreatePaymentScheduleDto,
    organizationId: string,
    userId: string,
  ) {
    // التحقق من وجود الصفقة
    const deal = await this.prisma.deal.findFirst({
      where: { id: dto.dealId, organizationId, deletedAt: null },
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
    const existingSchedule = await this.prisma.paymentSchedule.findFirst({
      where: { dealId: dto.dealId },
    });

    if (existingSchedule) {
      throw new ConflictException({
        success: false,
        error: {
          code: 'SCHEDULE_ALREADY_EXISTS',
          message: 'Deal already has a payment schedule',
          messageAr: 'الصفقة لها جدول أقساط سابق',
        },
      });
    }

    // التحقق من مرحلة الصفقة
    if (
      deal.stage !== DealStage.CONTRACT_SIGNED &&
      deal.stage !== DealStage.PAYMENT_ACTIVE &&
      deal.stage !== DealStage.CONTRACT_PREPARATION
    ) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STAGE_FOR_SCHEDULE',
          message: 'Payment schedule can only be created from CONTRACT_SIGNED, CONTRACT_PREPARATION or PAYMENT_ACTIVE stage',
          messageAr: 'يمكن إنشاء جدول الأقساط فقط من مرحلة العقد الموقع أو إعداد العقد أو الدفع النشط',
        },
      });
    }

    // التحقق من صحة مجموع الأقساط
    const installmentsSum = dto.installments.reduce((sum, i) => sum + i.amount, 0);
    if (Math.abs(installmentsSum - dto.totalAmount) > 0.01) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INSTALLMENTS_SUM_MISMATCH',
          message: `Installments sum (${installmentsSum}) does not match total amount (${dto.totalAmount})`,
          messageAr: `مجموع الأقساط (${installmentsSum}) لا يساوي المبلغ الإجمالي (${dto.totalAmount})`,
        },
      });
    }

    // إنشاء جدول الأقساط
    const schedule = await this.prisma.$transaction(async (tx) => {
      // إنشاء الجدول
      const newSchedule = await tx.paymentSchedule.create({
        data: {
          dealId: dto.dealId,
          organizationId,
          totalAmount: dto.totalAmount,
          currency: dto.currency || 'EGP',
          notes: dto.notes,
        },
      });

      // إنشاء الأقساط
      for (const installment of dto.installments) {
        await tx.installment.create({
          data: {
            paymentScheduleId: newSchedule.id,
            organizationId,
            installmentNumber: installment.installmentNumber,
            type: installment.type,
            amount: installment.amount,
            currency: installment.currency || 'EGP',
            dueDate: new Date(installment.dueDate),
            notes: installment.notes,
            status: InstallmentStatus.PENDING,
          },
        });
      }

      // تحديث مرحلة الصفقة
      if (deal.stage !== DealStage.PAYMENT_ACTIVE) {
        await tx.deal.update({
          where: { id: dto.dealId },
          data: { stage: DealStage.PAYMENT_ACTIVE, updatedAt: new Date() },
        });
      }

      return newSchedule;
    });

    // جلب الجدول مع الأقساط
    const fullSchedule = await this.prisma.paymentSchedule.findUnique({
      where: { id: schedule.id },
      include: {
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
        deal: {
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
          },
        },
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'PAYMENT_SCHEDULE_CREATED',
      entityType: 'payment_schedule',
      entityId: schedule.id,
      newValue: {
        dealId: dto.dealId,
        totalAmount: dto.totalAmount,
        installmentsCount: dto.installments.length,
      },
    });

    // إرسال حدث
    this.eventEmitter.emit('payment_schedule.created', {
      type: 'payment_schedule.created',
      entityId: schedule.id,
      entityType: 'payment_schedule',
      data: { schedule: fullSchedule, dealId: dto.dealId },
      timestamp: new Date(),
      userId,
    });

    return fullSchedule;
  }

  /**
   * الحصول على جدول أقساط صفقة
   */
  async getByDeal(dealId: string, organizationId: string) {
    const schedule = await this.prisma.paymentSchedule.findFirst({
      where: { dealId, organizationId },
      include: {
        installments: {
          orderBy: { installmentNumber: 'asc' },
          include: {
            payments: {
              where: { status: PaymentStatus.CONFIRMED },
            },
          },
        },
        deal: {
          select: {
            id: true,
            dealType: true,
            agreedPrice: true,
            stage: true,
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
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'SCHEDULE_NOT_FOUND',
          message: 'Payment schedule not found for this deal',
          messageAr: 'لا يوجد جدول أقساط لهذه الصفقة',
        },
      });
    }

    return this.enrichScheduleWithPaymentInfo(schedule);
  }

  /**
   * الحصول على جدول أقساط بالمعرف
   */
  async findOne(id: string, organizationId: string) {
    const schedule = await this.prisma.paymentSchedule.findFirst({
      where: { id, organizationId },
      include: {
        installments: {
          orderBy: { installmentNumber: 'asc' },
          include: {
            payments: {
              where: { status: PaymentStatus.CONFIRMED },
            },
          },
        },
        deal: {
          select: {
            id: true,
            dealType: true,
            agreedPrice: true,
            stage: true,
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
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

    return this.enrichScheduleWithPaymentInfo(schedule);
  }

  /**
   * إضافة قسط لجدول موجود
   */
  async addInstallment(
    scheduleId: string,
    dto: AddInstallmentDto,
    organizationId: string,
    userId: string,
  ) {
    const schedule = await this.prisma.paymentSchedule.findFirst({
      where: { id: scheduleId, organizationId },
      include: {
        installments: true,
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

    // التحقق من عدم وجود قسط بنفس الرقم
    const existingInstallment = schedule.installments.find(
      (i) => i.installmentNumber === dto.installmentNumber,
    );

    if (existingInstallment) {
      throw new ConflictException({
        success: false,
        error: {
          code: 'INSTALLMENT_NUMBER_EXISTS',
          message: 'Installment with this number already exists',
          messageAr: 'يوجد قسط بنفس الرقم مسبقاً',
        },
      });
    }

    // إنشاء القسط
    const installment = await this.prisma.installment.create({
      data: {
        paymentScheduleId: scheduleId,
        organizationId,
        installmentNumber: dto.installmentNumber,
        type: dto.type,
        amount: dto.amount,
        currency: dto.currency || schedule.currency,
        dueDate: new Date(dto.dueDate),
        notes: dto.notes,
        status: InstallmentStatus.PENDING,
      },
    });

    // تحديث المبلغ الإجمالي
    await this.prisma.paymentSchedule.update({
      where: { id: scheduleId },
      data: {
        totalAmount: schedule.totalAmount + dto.amount,
        updatedAt: new Date(),
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'INSTALLMENT_ADDED',
      entityType: 'payment_schedule',
      entityId: scheduleId,
      newValue: {
        installmentId: installment.id,
        installmentNumber: dto.installmentNumber,
        amount: dto.amount,
      },
    });

    return installment;
  }

  /**
   * حذف قسط من جدول
   */
  async removeInstallment(
    scheduleId: string,
    installmentId: string,
    organizationId: string,
    userId: string,
  ) {
    const schedule = await this.prisma.paymentSchedule.findFirst({
      where: { id: scheduleId, organizationId },
      include: {
        installments: {
          include: {
            payments: true,
          },
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

    const installment = schedule.installments.find((i) => i.id === installmentId);

    if (!installment) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'INSTALLMENT_NOT_FOUND',
          message: 'Installment not found in this schedule',
          messageAr: 'القسط غير موجود في هذا الجدول',
        },
      });
    }

    // التحقق من عدم وجود مدفوعات على القسط
    if (installment.payments && installment.payments.length > 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INSTALLMENT_HAS_PAYMENTS',
          message: 'Cannot delete installment with existing payments',
          messageAr: 'لا يمكن حذف قسط له مدفوعات مسجلة',
        },
      });
    }

    // حذف القسط
    await this.prisma.installment.delete({
      where: { id: installmentId },
    });

    // تحديث المبلغ الإجمالي
    await this.prisma.paymentSchedule.update({
      where: { id: scheduleId },
      data: {
        totalAmount: schedule.totalAmount - installment.amount,
        updatedAt: new Date(),
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'INSTALLMENT_REMOVED',
      entityType: 'payment_schedule',
      entityId: scheduleId,
      oldValue: {
        installmentId: installment.id,
        installmentNumber: installment.installmentNumber,
        amount: installment.amount,
      },
    });

    return { success: true, message: 'تم حذف القسط بنجاح' };
  }

  /**
   * إعادة حساب جدول الأقساط
   */
  async recalculate(
    scheduleId: string,
    dto: RecalculateScheduleDto,
    organizationId: string,
    userId: string,
  ) {
    const schedule = await this.prisma.paymentSchedule.findFirst({
      where: { id: scheduleId, organizationId },
      include: {
        installments: {
          orderBy: { installmentNumber: 'asc' },
          include: {
            payments: {
              where: { status: PaymentStatus.CONFIRMED },
            },
          },
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

    const oldTotal = schedule.totalAmount;
    const difference = dto.totalAmount - oldTotal;

    if (dto.autoDistribute) {
      // توزيع الفرق على الأقساط غير المدفوعة
      const unpaidInstallments = schedule.installments.filter(
        (i) => i.status !== InstallmentStatus.PAID && (!i.payments || i.payments.length === 0),
      );

      if (unpaidInstallments.length === 0) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'NO_UNPAID_INSTALLMENTS',
            message: 'No unpaid installments to redistribute to',
            messageAr: 'لا توجد أقساط غير مدفوعة لإعادة التوزيع عليها',
          },
        });
      }

      const perInstallment = difference / unpaidInstallments.length;

      await this.prisma.$transaction(async (tx) => {
        // تحديث المبلغ الإجمالي
        await tx.paymentSchedule.update({
          where: { id: scheduleId },
          data: {
            totalAmount: dto.totalAmount,
            updatedAt: new Date(),
          },
        });

        // تحديث مبالغ الأقساط غير المدفوعة
        for (const installment of unpaidInstallments) {
          await tx.installment.update({
            where: { id: installment.id },
            data: {
              amount: installment.amount + perInstallment,
            },
          });
        }
      });
    } else {
      // تحديث المبلغ الإجمالي فقط
      await this.prisma.paymentSchedule.update({
        where: { id: scheduleId },
        data: {
          totalAmount: dto.totalAmount,
          updatedAt: new Date(),
        },
      });
    }

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'SCHEDULE_RECALCULATED',
      entityType: 'payment_schedule',
      entityId: scheduleId,
      oldValue: { totalAmount: oldTotal },
      newValue: { totalAmount: dto.totalAmount, autoDistribute: dto.autoDistribute },
    });

    return this.findOne(scheduleId, organizationId);
  }

  /**
   * الحصول على الأقساط القادمة
   */
  async getUpcoming(organizationId: string, options: GetInstallmentsDto = {}) {
    const {
      fromDate = new Date().toISOString(),
      toDate,
      page = 1,
      limit = 20,
    } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      status: { notIn: [InstallmentStatus.PAID, InstallmentStatus.CANCELLED] },
      dueDate: { gte: new Date(fromDate) },
    };

    if (toDate) {
      where.dueDate.lte = new Date(toDate);
    }

    const [installments, total] = await Promise.all([
      this.prisma.installment.findMany({
        where,
        skip,
        take: limit,
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
              },
            },
          },
          payments: {
            where: { status: PaymentStatus.CONFIRMED },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.installment.count({ where }),
    ]);

    const enrichedInstallments = installments.map((inst) => {
      const paidAmount = inst.payments.reduce((sum, p) => sum + p.amount, 0);
      const remainingAmount = inst.amount - paidAmount;

      return {
        ...inst,
        typeAr: INSTALLMENT_TYPE_AR[inst.type as InstallmentType] || inst.type,
        statusAr: INSTALLMENT_STATUS_AR[inst.status as InstallmentStatus] || inst.status,
        paidAmount,
        remainingAmount,
        payments: undefined,
      };
    });

    return {
      data: enrichedInstallments,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + installments.length < total,
      },
    };
  }

  /**
   * الحصول على الأقساط المتأخرة
   */
  async getOverdue(organizationId: string, options: GetInstallmentsDto = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: any = {
      organizationId,
      status: { notIn: [InstallmentStatus.PAID, InstallmentStatus.CANCELLED] },
      dueDate: { lt: now },
    };

    const [installments, total] = await Promise.all([
      this.prisma.installment.findMany({
        where,
        skip,
        take: limit,
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
                  assignedBroker: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
          payments: {
            where: { status: PaymentStatus.CONFIRMED },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.installment.count({ where }),
    ]);

    const enrichedInstallments = installments.map((inst) => {
      const paidAmount = inst.payments.reduce((sum, p) => sum + p.amount, 0);
      const remainingAmount = inst.amount - paidAmount;
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(inst.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...inst,
        typeAr: INSTALLMENT_TYPE_AR[inst.type as InstallmentType] || inst.type,
        statusAr: INSTALLMENT_STATUS_AR[InstallmentStatus.OVERDUE],
        paidAmount,
        remainingAmount,
        daysOverdue,
        isOverdue: true,
        payments: undefined,
      };
    });

    return {
      data: enrichedInstallments,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + installments.length < total,
      },
    };
  }

  /**
   * إثراء جدول الأقساط بمعلومات الدفع
   */
  private enrichScheduleWithPaymentInfo(schedule: any) {
    const now = new Date();
    let totalPaid = 0;
    let paidInstallmentsCount = 0;
    let overdueInstallmentsCount = 0;

    const installmentsWithPayments = schedule.installments.map((inst: any) => {
      const paidAmount = inst.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
      const remainingAmount = inst.amount - paidAmount;
      const isOverdue = new Date(inst.dueDate) < now && inst.status !== InstallmentStatus.PAID;

      totalPaid += paidAmount;
      if (inst.status === InstallmentStatus.PAID) paidInstallmentsCount++;
      if (isOverdue) overdueInstallmentsCount++;

      return {
        ...inst,
        typeAr: INSTALLMENT_TYPE_AR[inst.type as InstallmentType] || inst.type,
        statusAr: INSTALLMENT_STATUS_AR[inst.status as InstallmentStatus] || inst.status,
        paidAmount,
        remainingAmount,
        isOverdue,
        daysOverdue: isOverdue
          ? Math.floor((now.getTime() - new Date(inst.dueDate).getTime()) / (1000 * 60 * 60 * 24))
          : undefined,
        payments: undefined,
      };
    });

    return {
      ...schedule,
      installments: installmentsWithPayments,
      summary: {
        totalAmount: schedule.totalAmount,
        totalPaid,
        totalRemaining: schedule.totalAmount - totalPaid,
        paidPercentage: schedule.totalAmount > 0 ? (totalPaid / schedule.totalAmount) * 100 : 0,
        installmentsCount: schedule.installments.length,
        paidInstallmentsCount,
        overdueInstallmentsCount,
      },
    };
  }
}
