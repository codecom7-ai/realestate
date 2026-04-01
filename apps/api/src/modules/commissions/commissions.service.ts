// ═══════════════════════════════════════════════════════════════
// Commissions Service - خدمة إدارة العمولات
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  GetCommissionsDto,
  CalculateCommissionDto,
  ApproveCommissionDto,
  SettleCommissionDto,
  PayCommissionDto,
  UpdateCommissionDto,
  CalculateDealCommissionsDto,
  CommissionType,
  VAT_RATE,
  COMMISSION_TYPE_AR,
  COMMISSION_STATUS_AR,
  DEFAULT_COMMISSION_DISTRIBUTION,
} from './dto/commissions.dto';
import { CommissionStatus, DealStage } from '@realestate/shared-types';

@Injectable()
export class CommissionsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
  ) {}

  /**
   * حساب ضريبة القيمة المضافة (14%)
   */
  private calculateVat(amount: number): number {
    return Math.round(amount * VAT_RATE * 100) / 100;
  }

  /**
   * حساب مبلغ العمولة بناءً على النسبة المئوية
   */
  private calculateCommissionAmount(baseAmount: number, percentage: number): number {
    return Math.round(baseAmount * (percentage / 100) * 100) / 100;
  }

  /**
   * الحصول على جميع العمولات مع الصفحات والفلترة
   */
  async findAll(organizationId: string, options: GetCommissionsDto = {}) {
    const {
      status,
      commissionType,
      dealId,
      userId,
      isLocked,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (status) where.status = status;
    if (commissionType) where.commissionType = commissionType;
    if (dealId) where.dealId = dealId;
    if (userId) where.userId = userId;
    if (isLocked !== undefined) where.isLocked = isLocked;

    if (search) {
      where.OR = [
        { notes: { contains: search } },
        { deal: { notes: { contains: search } } },
        { user: { firstName: { contains: search } } },
        { user: { lastName: { contains: search } } },
      ];
    }

    const [commissions, total] = await Promise.all([
      this.prisma.commission.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          organizationId: true,
          dealId: true,
          userId: true,
          commissionType: true,
          baseAmount: true,
          percentage: true,
          amount: true,
          vatAmount: true,
          totalAmount: true,
          currency: true,
          status: true,
          isLocked: true,
          lockedAt: true,
          lockedById: true,
          settledAt: true,
          paidAt: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          deal: {
            select: {
              id: true,
              stage: true,
              dealType: true,
              agreedPrice: true,
              currency: true,
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
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              firstNameAr: true,
              lastNameAr: true,
              email: true,
            },
          },
          lockedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.commission.count({ where }),
    ]);

    return {
      data: commissions,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + commissions.length < total,
      },
    };
  }

  /**
   * الحصول على عمولة بالمعرف
   */
  async findOne(id: string, organizationId: string) {
    const commission = await this.prisma.commission.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        dealId: true,
        userId: true,
        commissionType: true,
        baseAmount: true,
        percentage: true,
        amount: true,
        vatAmount: true,
        totalAmount: true,
        currency: true,
        status: true,
        isLocked: true,
        lockedAt: true,
        lockedById: true,
        settledAt: true,
        paidAt: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        deal: {
          select: {
            id: true,
            stage: true,
            dealType: true,
            agreedPrice: true,
            currency: true,
            notes: true,
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                firstNameAr: true,
                lastNameAr: true,
                phone: true,
                email: true,
              },
            },
            property: {
              select: {
                id: true,
                title: true,
                titleAr: true,
                city: true,
                district: true,
                propertyType: true,
                askingPrice: true,
                currency: true,
              },
            },
            assignedBroker: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                firstNameAr: true,
                lastNameAr: true,
                email: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
            email: true,
            phone: true,
          },
        },
        lockedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!commission) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COMMISSION_NOT_FOUND',
          message: 'Commission not found',
          messageAr: 'العمولة غير موجودة',
        },
      });
    }

    return commission;
  }

  /**
   * حساب العمولة تلقائياً عند إغلاق صفقة
   * يُستدعى من DealsService عند تغيير مرحلة الصفقة إلى CLOSED
   */
  async calculateDealCommissions(
    dto: CalculateDealCommissionsDto,
    organizationId: string,
    userId: string,
  ) {
    // جلب الصفقة مع التفاصيل
    const deal = await this.prisma.deal.findFirst({
      where: { id: dto.dealId, organizationId, deletedAt: null },
      include: {
        property: true,
        assignedBroker: true,
        client: true,
        commissions: true,
      },
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

    // التحقق من مرحلة الصفقة
    if (deal.stage !== DealStage.CLOSED && deal.stage !== DealStage.CONTRACT_SIGNED) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'DEAL_NOT_CLOSED',
          message: 'Commissions can only be calculated for closed or signed deals',
          messageAr: 'يمكن حساب العمولات فقط للصفقات المغلقة أو الموقعة',
        },
      });
    }

    // التحقق من وجود عمولات سابقة
    if (deal.commissions.length > 0 && !dto.forceRecalculate) {
      throw new ConflictException({
        success: false,
        error: {
          code: 'COMMISSIONS_ALREADY_EXIST',
          message: 'Commissions already calculated for this deal',
          messageAr: 'تم حساب العمولات سابقاً لهذه الصفقة',
          existingCount: deal.commissions.length,
        },
      });
    }

    // تحديد سعر العمولة
    let commissionRate = dto.commissionRate;
    if (!commissionRate && deal.property?.commissionRate) {
      commissionRate = deal.property.commissionRate;
    }
    if (!commissionRate) {
      // نسبة افتراضية 2.5%
      commissionRate = 2.5;
    }

    // تحديد المبلغ الأساسي
    const baseAmount = deal.agreedPrice || deal.property?.askingPrice || 0;

    if (baseAmount <= 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_BASE_AMOUNT',
          message: 'Deal has no valid price to calculate commission',
          messageAr: 'الصفقة ليس لها سعر صالح لحساب العمولة',
        },
      });
    }

    // حساب مبلغ العمولة الإجمالي
    const totalCommissionAmount = this.calculateCommissionAmount(baseAmount, commissionRate);

    // توزيع العمولة
    const distribution = dto.customDistribution || DEFAULT_COMMISSION_DISTRIBUTION;
    
    // التأكد من وجود قيم افتراضية للتوزيع
    const brokerShare = distribution.broker ?? DEFAULT_COMMISSION_DISTRIBUTION.broker;
    const managerShare = distribution.manager ?? DEFAULT_COMMISSION_DISTRIBUTION.manager;
    const companyShare = distribution.company ?? DEFAULT_COMMISSION_DISTRIBUTION.company;
    const externalShare = distribution.external ?? DEFAULT_COMMISSION_DISTRIBUTION.external;

    // إذا كان forceRecalculate، احذف العمولات القديمة
    if (dto.forceRecalculate && deal.commissions.length > 0) {
      await this.prisma.commission.deleteMany({
        where: { dealId: dto.dealId },
      });
    }

    // إنشاء العمولات
    const commissions = [];

    // عمولة السمسار
    if (deal.assignedBrokerId && brokerShare > 0) {
      const brokerAmount = Math.round(totalCommissionAmount * brokerShare * 100) / 100;
      const brokerVat = this.calculateVat(brokerAmount);

      commissions.push(
        this.prisma.commission.create({
          data: {
            organizationId,
            dealId: dto.dealId,
            userId: deal.assignedBrokerId,
            commissionType: CommissionType.BROKER,
            baseAmount,
            percentage: commissionRate * brokerShare,
            amount: brokerAmount,
            vatAmount: brokerVat,
            totalAmount: Math.round((brokerAmount + brokerVat) * 100) / 100,
            currency: deal.currency,
            status: CommissionStatus.CALCULATED,
            isLocked: false,
          },
        }),
      );
    }

    // عمولة مدير المبيعات (إذا وجد)
    if (managerShare > 0) {
      // البحث عن مدير المبيعات في المنظمة
      const manager = await this.prisma.user.findFirst({
        where: {
          organizationId,
          role: 'SALES_MANAGER',
          isActive: true,
          deletedAt: null,
        },
      });

      if (manager) {
        const managerAmount = Math.round(totalCommissionAmount * managerShare * 100) / 100;
        const managerVat = this.calculateVat(managerAmount);

        commissions.push(
          this.prisma.commission.create({
            data: {
              organizationId,
              dealId: dto.dealId,
              userId: manager.id,
              commissionType: CommissionType.MANAGER,
              baseAmount,
              percentage: commissionRate * managerShare,
              amount: managerAmount,
              vatAmount: managerVat,
              totalAmount: Math.round((managerAmount + managerVat) * 100) / 100,
              currency: deal.currency,
              status: CommissionStatus.CALCULATED,
              isLocked: false,
            },
          }),
        );
      }
    }

    // عمولة الشركة
    if (companyShare > 0) {
      const companyAmount = Math.round(totalCommissionAmount * companyShare * 100) / 100;
      const companyVat = this.calculateVat(companyAmount);

      commissions.push(
        this.prisma.commission.create({
          data: {
            organizationId,
            dealId: dto.dealId,
            userId: null, // لا يوجد مستخدم للشركة
            commissionType: CommissionType.COMPANY,
            baseAmount,
            percentage: commissionRate * companyShare,
            amount: companyAmount,
            vatAmount: companyVat,
            totalAmount: Math.round((companyAmount + companyVat) * 100) / 100,
            currency: deal.currency,
            status: CommissionStatus.CALCULATED,
            isLocked: false,
          },
        }),
      );
    }

    // عمولة الوسيط الخارجي (إذا وجد)
    if (deal.externalBroker && externalShare > 0) {
      const externalAmount = Math.round(totalCommissionAmount * externalShare * 100) / 100;
      const externalVat = this.calculateVat(externalAmount);

      commissions.push(
        this.prisma.commission.create({
          data: {
            organizationId,
            dealId: dto.dealId,
            userId: null,
            commissionType: CommissionType.EXTERNAL,
            baseAmount,
            percentage: commissionRate * externalShare,
            amount: externalAmount,
            vatAmount: externalVat,
            totalAmount: Math.round((externalAmount + externalVat) * 100) / 100,
            currency: deal.currency,
            status: CommissionStatus.CALCULATED,
            isLocked: false,
            notes: `وسيط خارجي: ${deal.externalBroker}`,
          },
        }),
      );
    }

    // تنفيذ إنشاء العمولات
    const createdCommissions = await Promise.all(commissions);

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'COMMISSIONS_CALCULATED',
      entityType: 'commission',
      entityId: dto.dealId,
      newValue: {
        count: createdCommissions.length,
        totalAmount: totalCommissionAmount,
        distribution,
      },
    });

    // إرسال حدث
    this.eventEmitter.emit('commission.calculated', {
      type: 'commission.calculated',
      entityId: dto.dealId,
      entityType: 'commission',
      data: {
        dealId: dto.dealId,
        commissions: createdCommissions,
        totalAmount: totalCommissionAmount,
      },
      timestamp: new Date(),
      userId,
    });

    return {
      success: true,
      data: {
        dealId: dto.dealId,
        commissions: createdCommissions,
        summary: {
          totalCommission: totalCommissionAmount,
          totalVat: createdCommissions.reduce((sum, c) => sum + c.vatAmount, 0),
          totalWithVat: createdCommissions.reduce((sum, c) => sum + c.totalAmount, 0),
          count: createdCommissions.length,
        },
      },
    };
  }

  /**
   * إنشاء عمولة يدوياً
   */
  async create(
    dto: CalculateCommissionDto,
    organizationId: string,
    userId: string,
  ) {
    // التحقق من الصفقة
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

    // التحقق من المستخدم (إذا كان نوع العمولة سمسار أو مدير)
    if (dto.userId && (dto.commissionType === CommissionType.BROKER || dto.commissionType === CommissionType.MANAGER)) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.userId, organizationId, isActive: true, deletedAt: null },
      });

      if (!user) {
        throw new NotFoundException({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            messageAr: 'المستخدم غير موجود',
          },
        });
      }
    }

    // حساب مبلغ العمولة
    let amount = dto.baseAmount;
    if (dto.percentage) {
      amount = this.calculateCommissionAmount(dto.baseAmount, dto.percentage);
    }

    // حساب الضريبة
    const vatAmount = this.calculateVat(amount);
    const totalAmount = Math.round((amount + vatAmount) * 100) / 100;

    const commission = await this.prisma.commission.create({
      data: {
        organizationId,
        dealId: dto.dealId,
        userId: dto.userId || null,
        commissionType: dto.commissionType,
        baseAmount: dto.baseAmount,
        percentage: dto.percentage,
        amount,
        vatAmount,
        totalAmount,
        currency: dto.currency || 'EGP',
        status: CommissionStatus.CALCULATED,
        isLocked: false,
        notes: dto.notes,
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'COMMISSION_CREATED',
      entityType: 'commission',
      entityId: commission.id,
      newValue: {
        dealId: dto.dealId,
        commissionType: dto.commissionType,
        amount,
        vatAmount,
        totalAmount,
      },
    });

    return commission;
  }

  /**
   * تحديث عمولة (قبل القفل فقط)
   */
  async update(
    id: string,
    dto: UpdateCommissionDto,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.commission.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COMMISSION_NOT_FOUND',
          message: 'Commission not found',
          messageAr: 'العمولة غير موجودة',
        },
      });
    }

    // التحقق من عدم قفل العمولة
    if (existing.isLocked) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'COMMISSION_LOCKED',
          message: 'Cannot update a locked commission',
          messageAr: 'لا يمكن تعديل عمولة مقفولة',
          lockedAt: existing.lockedAt,
        },
      });
    }

    // حساب القيم الجديدة
    let amount = dto.amount ?? existing.amount;
    let vatAmount = existing.vatAmount;

    if (dto.baseAmount !== undefined || dto.percentage !== undefined) {
      const baseAmount = dto.baseAmount ?? existing.baseAmount;
      const percentage = dto.percentage ?? existing.percentage;

      if (percentage) {
        amount = this.calculateCommissionAmount(baseAmount, percentage);
      } else if (dto.baseAmount !== undefined) {
        amount = dto.baseAmount;
      }

      vatAmount = this.calculateVat(amount);
    }

    const totalAmount = Math.round((amount + vatAmount) * 100) / 100;

    const commission = await this.prisma.commission.update({
      where: { id },
      data: {
        baseAmount: dto.baseAmount,
        percentage: dto.percentage,
        amount,
        vatAmount,
        totalAmount,
        notes: dto.notes,
        updatedAt: new Date(),
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'COMMISSION_UPDATED',
      entityType: 'commission',
      entityId: id,
      oldValue: {
        amount: existing.amount,
        vatAmount: existing.vatAmount,
        totalAmount: existing.totalAmount,
      },
      newValue: {
        amount,
        vatAmount,
        totalAmount,
      },
    });

    return commission;
  }

  /**
   * الموافقة على عمولة (قفل العمولة)
   */
  async approve(
    id: string,
    dto: ApproveCommissionDto,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.commission.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COMMISSION_NOT_FOUND',
          message: 'Commission not found',
          messageAr: 'العمولة غير موجودة',
        },
      });
    }

    // التحقق من الحالة
    if (existing.status !== CommissionStatus.CALCULATED) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS_FOR_APPROVAL',
          message: 'Commission must be in CALCULATED status to approve',
          messageAr: 'يجب أن تكون العمولة في حالة "محسوبة" للموافقة عليها',
          currentStatus: existing.status,
        },
      });
    }

    // التحقق من عدم القفل المسبق
    if (existing.isLocked) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'COMMISSION_ALREADY_LOCKED',
          message: 'Commission is already locked',
          messageAr: 'العمولة مقفولة بالفعل',
        },
      });
    }

    const commission = await this.prisma.commission.update({
      where: { id },
      data: {
        status: CommissionStatus.APPROVED,
        isLocked: true,
        lockedAt: new Date(),
        lockedById: userId,
        notes: dto.notes ? `${existing.notes || ''}\n${dto.notes}`.trim() : existing.notes,
        updatedAt: new Date(),
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'COMMISSION_APPROVED',
      entityType: 'commission',
      entityId: id,
      newValue: {
        status: CommissionStatus.APPROVED,
        isLocked: true,
        lockedAt: commission.lockedAt,
      },
    });

    // إرسال حدث
    this.eventEmitter.emit('commission.approved', {
      type: 'commission.approved',
      entityId: id,
      entityType: 'commission',
      data: { commission },
      timestamp: new Date(),
      userId,
    });

    return commission;
  }

  /**
   * تسوية عمولة
   */
  async settle(
    id: string,
    dto: SettleCommissionDto,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.commission.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COMMISSION_NOT_FOUND',
          message: 'Commission not found',
          messageAr: 'العمولة غير موجودة',
        },
      });
    }

    // التحقق من الحالة
    if (existing.status !== CommissionStatus.APPROVED) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS_FOR_SETTLEMENT',
          message: 'Commission must be approved before settlement',
          messageAr: 'يجب الموافقة على العمولة قبل التسوية',
          currentStatus: existing.status,
        },
      });
    }

    // التحقق من القفل
    if (!existing.isLocked) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'COMMISSION_NOT_LOCKED',
          message: 'Commission must be locked before settlement',
          messageAr: 'يجب قفل العمولة قبل التسوية',
        },
      });
    }

    const commission = await this.prisma.commission.update({
      where: { id },
      data: {
        status: CommissionStatus.SETTLED,
        settledAt: new Date(),
        notes: dto.notes ? `${existing.notes || ''}\n${dto.notes}`.trim() : existing.notes,
        updatedAt: new Date(),
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'COMMISSION_SETTLED',
      entityType: 'commission',
      entityId: id,
      newValue: {
        status: CommissionStatus.SETTLED,
        settledAt: commission.settledAt,
      },
    });

    // إرسال حدث
    this.eventEmitter.emit('commission.settled', {
      type: 'commission.settled',
      entityId: id,
      entityType: 'commission',
      data: { commission },
      timestamp: new Date(),
      userId,
    });

    return commission;
  }

  /**
   * دفع عمولة
   */
  async pay(
    id: string,
    dto: PayCommissionDto,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.commission.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COMMISSION_NOT_FOUND',
          message: 'Commission not found',
          messageAr: 'العمولة غير موجودة',
        },
      });
    }

    // التحقق من الحالة
    if (existing.status !== CommissionStatus.SETTLED) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS_FOR_PAYMENT',
          message: 'Commission must be settled before payment',
          messageAr: 'يجب تسوية العمولة قبل الدفع',
          currentStatus: existing.status,
        },
      });
    }

    const commission = await this.prisma.commission.update({
      where: { id },
      data: {
        status: CommissionStatus.PAID,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        notes: dto.notes ? `${existing.notes || ''}\n${dto.notes}`.trim() : existing.notes,
        updatedAt: new Date(),
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'COMMISSION_PAID',
      entityType: 'commission',
      entityId: id,
      newValue: {
        status: CommissionStatus.PAID,
        paidAt: commission.paidAt,
      },
    });

    // إرسال حدث
    this.eventEmitter.emit('commission.paid', {
      type: 'commission.paid',
      entityId: id,
      entityType: 'commission',
      data: { commission },
      timestamp: new Date(),
      userId,
    });

    return commission;
  }

  /**
   * الحصول على ملخص عمولات صفقة
   */
  async getDealCommissions(dealId: string, organizationId: string) {
    const commissions = await this.prisma.commission.findMany({
      where: { dealId, organizationId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
            email: true,
          },
        },
      },
    });

    const totalAmount = commissions.reduce((sum: number, c: { amount: number }) => sum + c.amount, 0);
    const totalVat = commissions.reduce((sum: number, c: { vatAmount: number }) => sum + c.vatAmount, 0);
    const totalWithVat = commissions.reduce((sum: number, c: { totalAmount: number }) => sum + c.totalAmount, 0);
    const allLocked = commissions.every((c: { isLocked: boolean }) => c.isLocked);

    return {
      dealId,
      commissions,
      totalAmount,
      totalVat,
      totalWithVat,
      count: commissions.length,
      allLocked,
    };
  }

  /**
   * الحصول على إحصائيات العمولات
   */
  async getStats(organizationId: string) {
    // إحصائيات حسب الحالة
    const byStatus = await this.prisma.commission.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { id: true },
    });

    // إحصائيات حسب النوع
    const byType = await this.prisma.commission.groupBy({
      by: ['commissionType'],
      where: { organizationId },
      _count: { id: true },
    });

    // إجمالي المبالغ
    const totals = await this.prisma.commission.aggregate({
      where: { organizationId },
      _sum: {
        amount: true,
        vatAmount: true,
        totalAmount: true,
      },
      _count: { id: true },
    });

    // المبالغ حسب الحالة
    const byStatusAmounts = await this.prisma.commission.groupBy({
      by: ['status'],
      where: { organizationId },
      _sum: { totalAmount: true },
    });

    // تحويل النتائج
    const statusMap: Record<CommissionStatus, number> = {
      [CommissionStatus.CALCULATED]: 0,
      [CommissionStatus.APPROVED]: 0,
      [CommissionStatus.SETTLED]: 0,
      [CommissionStatus.PAID]: 0,
      [CommissionStatus.DISPUTED]: 0,
    };

    const typeMap: Record<CommissionType, number> = {
      [CommissionType.BROKER]: 0,
      [CommissionType.MANAGER]: 0,
      [CommissionType.COMPANY]: 0,
      [CommissionType.EXTERNAL]: 0,
    };

    for (const item of byStatus) {
      statusMap[item.status as CommissionStatus] = item._count.id;
    }

    for (const item of byType) {
      typeMap[item.commissionType as CommissionType] = item._count.id;
    }

    // المبالغ حسب الحالة
    const statusAmounts: Record<string, number> = {};
    for (const item of byStatusAmounts) {
      statusAmounts[item.status] = item._sum.totalAmount || 0;
    }

    return {
      total: totals._count.id,
      byStatus: statusMap,
      byType: typeMap,
      totalCalculated: statusAmounts[CommissionStatus.CALCULATED] || 0,
      totalApproved: statusAmounts[CommissionStatus.APPROVED] || 0,
      totalSettled: statusAmounts[CommissionStatus.SETTLED] || 0,
      totalPaid: statusAmounts[CommissionStatus.PAID] || 0,
      totalVat: totals._sum.vatAmount || 0,
      totalPending: (totals._sum.totalAmount || 0) - (statusAmounts[CommissionStatus.PAID] || 0),
    };
  }

  /**
   * وضع عمولة في حالة نزاع
   */
  async dispute(
    id: string,
    reason: string,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.commission.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COMMISSION_NOT_FOUND',
          message: 'Commission not found',
          messageAr: 'العمولة غير موجودة',
        },
      });
    }

    // التحقق من عدم الدفع
    if (existing.status === CommissionStatus.PAID) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'COMMISSION_ALREADY_PAID',
          message: 'Cannot dispute a paid commission',
          messageAr: 'لا يمكن وضع عمولة مدفوعة في حالة نزاع',
        },
      });
    }

    const commission = await this.prisma.commission.update({
      where: { id },
      data: {
        status: CommissionStatus.DISPUTED,
        notes: `${existing.notes || ''}\n[Nزاع]: ${reason}`.trim(),
        updatedAt: new Date(),
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'COMMISSION_DISPUTED',
      entityType: 'commission',
      entityId: id,
      newValue: {
        status: CommissionStatus.DISPUTED,
        reason,
      },
    });

    return commission;
  }

  /**
   * حل نزاع عمولة
   */
  async resolveDispute(
    id: string,
    resolution: string,
    newStatus: CommissionStatus,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.commission.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COMMISSION_NOT_FOUND',
          message: 'Commission not found',
          messageAr: 'العمولة غير موجودة',
        },
      });
    }

    if (existing.status !== CommissionStatus.DISPUTED) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'COMMISSION_NOT_DISPUTED',
          message: 'Commission is not in disputed status',
          messageAr: 'العمولة ليست في حالة نزاع',
        },
      });
    }

    const commission = await this.prisma.commission.update({
      where: { id },
      data: {
        status: newStatus,
        notes: `${existing.notes || ''}\n[حل النزاع]: ${resolution}`.trim(),
        updatedAt: new Date(),
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'COMMISSION_DISPUTE_RESOLVED',
      entityType: 'commission',
      entityId: id,
      newValue: {
        status: newStatus,
        resolution,
      },
    });

    return commission;
  }
}
