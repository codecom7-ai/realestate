// ═══════════════════════════════════════════════════════════════
// Deals Service - خدمة إدارة الصفقات
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
  CreateDealDto,
  UpdateDealDto,
  ChangeStageDto,
  CreateReservationDto,
  GetDealsDto,
  DEAL_STAGE_AR,
  DEAL_TYPE_AR,
  DealType,
} from './dto/deals.dto';
import { DealStage, PropertyStatus, CommissionStatus } from '@realestate/shared-types';

// تعريف الانتقالات المسموحة بين المراحل
const VALID_STAGE_TRANSITIONS: Record<DealStage, DealStage[]> = {
  [DealStage.LEAD]: [DealStage.VIEWING, DealStage.CANCELLED],
  [DealStage.VIEWING]: [DealStage.NEGOTIATION, DealStage.LEAD, DealStage.CANCELLED],
  [DealStage.NEGOTIATION]: [DealStage.RESERVATION, DealStage.VIEWING, DealStage.CANCELLED],
  [DealStage.RESERVATION]: [DealStage.CONTRACT_PREPARATION, DealStage.NEGOTIATION, DealStage.CANCELLED],
  [DealStage.CONTRACT_PREPARATION]: [DealStage.CONTRACT_SIGNED, DealStage.RESERVATION, DealStage.CANCELLED],
  [DealStage.CONTRACT_SIGNED]: [DealStage.PAYMENT_ACTIVE, DealStage.CANCELLED],
  [DealStage.PAYMENT_ACTIVE]: [DealStage.HANDOVER_PENDING, DealStage.CLOSED],
  [DealStage.HANDOVER_PENDING]: [DealStage.CLOSED],
  [DealStage.CLOSED]: [],
  [DealStage.CANCELLED]: [DealStage.LEAD], // يمكن إعادة فتح صفقة ملغاة
};

@Injectable()
export class DealsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
  ) {}

  /**
   * الحصول على جميع الصفقات مع الصفحات والفلترة
   */
  async findAll(organizationId: string, options: GetDealsDto = {}) {
    const {
      stage,
      dealType,
      assignedBrokerId,
      clientId,
      propertyId,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;
    const skip = (page - 1) * limit;

    const where: any = { organizationId, deletedAt: null };

    if (stage) where.stage = stage;
    if (dealType) where.dealType = dealType;
    if (assignedBrokerId) where.assignedBrokerId = assignedBrokerId;
    if (clientId) where.clientId = clientId;
    if (propertyId) where.propertyId = propertyId;

    if (search) {
      where.OR = [
        { notes: { contains: search } },
        { client: { firstName: { contains: search } } },
        { client: { lastName: { contains: search } } },
        { client: { phone: { contains: search } } },
        { property: { title: { contains: search } } },
        { property: { city: { contains: search } } },
      ];
    }

    const [deals, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          stage: true,
          dealType: true,
          agreedPrice: true,
          currency: true,
          notes: true,
          closedAt: true,
          closedReason: true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              firstNameAr: true,
              lastNameAr: true,
              phone: true,
              isVip: true,
            },
          },
          property: {
            select: {
              id: true,
              title: true,
              city: true,
              district: true,
              propertyType: true,
              askingPrice: true,
            },
          },
          assignedBroker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              firstNameAr: true,
              lastNameAr: true,
              avatarUrl: true,
            },
          },
          reservation: {
            select: {
              id: true,
              depositAmount: true,
              expiresAt: true,
            },
          },
          contract: {
            select: {
              id: true,
              contractNumber: true,
              signedByClient: true,
              signedByOffice: true,
            },
          },
          _count: {
            select: {
              commissions: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.deal.count({ where }),
    ]);

    return {
      data: deals,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + deals.length < total,
      },
    };
  }

  /**
   * الحصول على صفقة بالمعرف
   */
  async findOne(id: string, organizationId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true,
        stage: true,
        dealType: true,
        agreedPrice: true,
        currency: true,
        notes: true,
        closedAt: true,
        closedReason: true,
        createdAt: true,
        updatedAt: true,
        leadId: true,
        branch: {
          select: { id: true, name: true, nameAr: true },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
            phone: true,
            phone2: true,
            email: true,
            isVip: true,
            clientType: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
            titleAr: true,
            city: true,
            district: true,
            address: true,
            propertyType: true,
            areaM2: true,
            bedrooms: true,
            bathrooms: true,
            askingPrice: true,
            currency: true,
            status: true,
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
        assignedBroker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
            phone: true,
            email: true,
            avatarUrl: true,
          },
        },
        cobrokerUserId: true,
        externalBroker: true,
        reservation: true,
        contract: true,
        paymentSchedule: {
          include: {
            installments: {
              orderBy: { installmentNumber: 'asc' },
            },
          },
        },
        commissions: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
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

    return deal;
  }

  /**
   * إنشاء صفقة جديدة
   */
  async create(
    dto: CreateDealDto,
    organizationId: string,
    userId: string,
  ) {
    // التحقق من وجود العميل
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, organizationId, deletedAt: null },
    });

    if (!client) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'CLIENT_NOT_FOUND',
          message: 'Client not found',
          messageAr: 'العميل غير موجود',
        },
      });
    }

    // التحقق من وجود العقار
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, organizationId, deletedAt: null },
    });

    if (!property) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPERTY_NOT_FOUND',
          message: 'Property not found',
          messageAr: 'العقار غير موجود',
        },
      });
    }

    // التحقق من حالة العقار (لا يمكن إنشاء صفقة على عقار مباع/مؤجر)
    if (property.status === PropertyStatus.SOLD) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PROPERTY_ALREADY_SOLD',
          message: 'Property is already sold',
          messageAr: 'العقار مباع مسبقاً',
        },
      });
    }

    if (property.status === PropertyStatus.RENTED) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PROPERTY_ALREADY_RENTED',
          message: 'Property is already rented',
          messageAr: 'العقار مؤجر مسبقاً',
        },
      });
    }

    // التحقق من السمسار المسؤول
    if (dto.assignedBrokerId) {
      const broker = await this.prisma.user.findFirst({
        where: { id: dto.assignedBrokerId, organizationId, isActive: true, deletedAt: null },
      });

      if (!broker) {
        throw new NotFoundException({
          success: false,
          error: {
            code: 'BROKER_NOT_FOUND',
            message: 'Assigned broker not found',
            messageAr: 'السمسار المسؤول غير موجود',
          },
        });
      }
    }

    const deal = await this.prisma.deal.create({
      data: {
        organizationId,
        leadId: dto.leadId,
        clientId: dto.clientId,
        propertyId: dto.propertyId,
        assignedBrokerId: dto.assignedBrokerId,
        cobrokerUserId: dto.cobrokerUserId,
        externalBroker: dto.externalBroker,
        branchId: dto.branchId,
        stage: DealStage.LEAD,
        dealType: dto.dealType,
        agreedPrice: dto.agreedPrice,
        currency: dto.currency || 'EGP',
        notes: dto.notes,
      },
      select: {
        id: true,
        stage: true,
        dealType: true,
        agreedPrice: true,
        currency: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
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

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'DEAL_CREATED',
      entityType: 'deal',
      entityId: deal.id,
      newValue: {
        stage: deal.stage,
        dealType: deal.dealType,
        clientId: dto.clientId,
        propertyId: dto.propertyId,
      },
    });

    // إرسال حدث
    this.eventEmitter.emit('deal.created', {
      type: 'deal.created',
      entityId: deal.id,
      entityType: 'deal',
      data: { deal },
      timestamp: new Date(),
      userId,
    });

    return deal;
  }

  /**
   * تحديث صفقة
   */
  async update(
    id: string,
    dto: UpdateDealDto,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.deal.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'DEAL_NOT_FOUND',
          message: 'Deal not found',
          messageAr: 'الصفقة غير موجودة',
        },
      });
    }

    const updateData: any = { updatedAt: new Date() };

    if (dto.agreedPrice !== undefined) updateData.agreedPrice = dto.agreedPrice;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.assignedBrokerId !== undefined) updateData.assignedBrokerId = dto.assignedBrokerId;

    const deal = await this.prisma.deal.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        stage: true,
        agreedPrice: true,
        notes: true,
        updatedAt: true,
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'DEAL_UPDATED',
      entityType: 'deal',
      entityId: id,
      oldValue: { agreedPrice: existing.agreedPrice },
      newValue: { agreedPrice: deal.agreedPrice },
    });

    return deal;
  }

  /**
   * تغيير مرحلة الصفقة
   */
  async changeStage(
    id: string,
    dto: ChangeStageDto,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.deal.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'DEAL_NOT_FOUND',
          message: 'Deal not found',
          messageAr: 'الصفقة غير موجودة',
        },
      });
    }

    // التحقق من صحة الانتقال
    const allowedTransitions = VALID_STAGE_TRANSITIONS[existing.stage as DealStage];
    if (!allowedTransitions.includes(dto.stage)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STAGE_TRANSITION',
          message: `Cannot transition from ${existing.stage} to ${dto.stage}`,
          messageAr: `لا يمكن الانتقال من ${DEAL_STAGE_AR[existing.stage as DealStage]} إلى ${DEAL_STAGE_AR[dto.stage]}`,
          details: {
            currentStage: existing.stage,
            targetStage: dto.stage,
            allowedTransitions,
          },
        },
      });
    }

    // التحقق من سبب الإلغاء
    if (dto.stage === DealStage.CANCELLED && !dto.reason) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'CANCELLATION_REASON_REQUIRED',
          message: 'Reason is required when cancelling a deal',
          messageAr: 'سبب الإلغاء مطلوب عند إلغاء صفقة',
        },
      });
    }

    const updateData: any = {
      stage: dto.stage,
      updatedAt: new Date(),
    };

    if (dto.stage === DealStage.CANCELLED) {
      updateData.closedAt = new Date();
      updateData.closedReason = dto.reason;
    }

    if (dto.stage === DealStage.CLOSED) {
      updateData.closedAt = new Date();
    }

    // استخدام transaction لتحديث الصفقة وإلغاء الحجز عند الإلغاء
    const deal = await this.prisma.$transaction(async (tx) => {
      const updatedDeal = await tx.deal.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          stage: true,
          closedAt: true,
          closedReason: true,
          updatedAt: true,
          propertyId: true,
        },
      });

      // إذا تم الإلغاء، إلغاء حجز العقار
      if (dto.stage === DealStage.CANCELLED && existing.propertyId) {
        // تحديث حالة العقار
        await tx.property.update({
          where: { id: existing.propertyId },
          data: { status: PropertyStatus.AVAILABLE },
        });

        // إلغاء الحجز
        await tx.propertyLock.updateMany({
          where: { lockedByDealId: id },
          data: { unlockedAt: new Date() },
        });
      }

      return updatedDeal;
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'DEAL_STAGE_CHANGED',
      entityType: 'deal',
      entityId: id,
      oldValue: { stage: existing.stage },
      newValue: { stage: dto.stage, reason: dto.reason },
    });

    // إرسال حدث
    this.eventEmitter.emit('deal.stage_changed', {
      type: 'deal.stage_changed',
      entityId: id,
      entityType: 'deal',
      data: {
        previousStage: existing.stage,
        newStage: dto.stage,
        reason: dto.reason,
        deal,
      },
      timestamp: new Date(),
      userId,
    });

    return deal;
  }

  /**
   * حذف صفقة (soft delete)
   */
  async remove(id: string, organizationId: string, userId: string) {
    const existing = await this.prisma.deal.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { reservation: true, contract: true },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'DEAL_NOT_FOUND',
          message: 'Deal not found',
          messageAr: 'الصفقة غير موجودة',
        },
      });
    }

    // لا يمكن حذف صفقة لها حجز أو عقد نشط
    if (existing.reservation || existing.contract) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'DEAL_HAS_ACTIVE_TRANSACTION',
          message: 'Cannot delete a deal with active reservation or contract',
          messageAr: 'لا يمكن حذف صفقة لها حجز أو عقد نشط',
        },
      });
    }

    // Soft delete
    await this.prisma.deal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'DEAL_DELETED',
      entityType: 'deal',
      entityId: id,
      oldValue: { stage: existing.stage },
    });

    return { success: true };
  }

  /**
   * إنشاء حجز للصفقة (Unit Lock Flow)
   */
  async createReservation(
    dealId: string,
    dto: CreateReservationDto,
    organizationId: string,
    userId: string,
  ) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId, deletedAt: null },
      include: { property: true },
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
    if (deal.stage !== DealStage.NEGOTIATION && deal.stage !== DealStage.RESERVATION) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STAGE_FOR_RESERVATION',
          message: 'Reservation can only be created from NEGOTIATION stage',
          messageAr: 'يمكن إنشاء الحجز فقط من مرحلة التفاوض',
        },
      });
    }

    // ATOMIC: محاولة إنشاء حجز العقار
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // محاولة إنشاء حجز العقار
        const lock = await tx.propertyLock.create({
          data: {
            organizationId,
            propertyId: deal.propertyId!,
            lockedByDealId: dealId,
            lockType: 'confirmed',
            expiresAt: new Date(dto.expiresAt),
          },
        });

        // تحديث حالة العقار
        await tx.property.update({
          where: { id: deal.propertyId! },
          data: { status: PropertyStatus.RESERVED_CONFIRMED },
        });

        // إنشاء الحجز
        const reservation = await tx.reservation.create({
          data: {
            dealId,
            organizationId,
            depositAmount: dto.depositAmount,
            depositMethod: dto.depositMethod,
            depositPaidAt: dto.depositPaidAt ? new Date(dto.depositPaidAt) : null,
            expiresAt: new Date(dto.expiresAt),
            notes: dto.notes,
          },
        });

        // تحديث مرحلة الصفقة
        await tx.deal.update({
          where: { id: dealId },
          data: { stage: DealStage.RESERVATION, updatedAt: new Date() },
        });

        return { lock, reservation };
      });

      // تسجيل في سجل التدقيق
      await this.auditService.log({
        organizationId,
        userId,
        action: 'RESERVATION_CREATED',
        entityType: 'reservation',
        entityId: result.reservation.id,
        newValue: {
          dealId,
          depositAmount: dto.depositAmount,
          expiresAt: dto.expiresAt,
        },
      });

      // إرسال حدث
      this.eventEmitter.emit('reservation.created', {
        type: 'reservation.created',
        entityId: result.reservation.id,
        entityType: 'reservation',
        data: {
          dealId,
          reservation: result.reservation,
          propertyId: deal.propertyId,
        },
        timestamp: new Date(),
        userId,
      });

      return result.reservation;
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      // Prisma unique constraint violation
      if (prismaError.code === 'P2002') {
        const existingLock = await this.prisma.propertyLock.findUnique({
          where: { propertyId: deal.propertyId! },
        });

        throw new ConflictException({
          success: false,
          error: {
            code: 'UNIT_ALREADY_LOCKED',
            message: 'Property is already reserved',
            messageAr: 'العقار محجوز مسبقاً',
            lockedByDealId: existingLock?.lockedByDealId,
          },
        });
      }
      throw error;
    }
  }

  /**
   * إلغاء الحجز
   */
  async cancelReservation(
    dealId: string,
    organizationId: string,
    userId: string,
    reason?: string,
  ) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId, deletedAt: null },
      include: { reservation: true, property: true },
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

    if (!deal.reservation) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NO_ACTIVE_RESERVATION',
          message: 'No active reservation for this deal',
          messageAr: 'لا يوجد حجز نشط لهذه الصفقة',
        },
      });
    }

    // ATOMIC: إلغاء الحجز
    await this.prisma.$transaction(async (tx) => {
      // تحديث حالة الحجز (soft delete)
      await tx.reservation.delete({
        where: { dealId },
      });

      // إلغاء حجز العقار
      await tx.propertyLock.updateMany({
        where: { lockedByDealId: dealId },
        data: { unlockedAt: new Date() },
      });

      // تحديث حالة العقار
      await tx.property.update({
        where: { id: deal.propertyId! },
        data: { status: PropertyStatus.AVAILABLE },
      });

      // تحديث مرحلة الصفقة
      await tx.deal.update({
        where: { id: dealId },
        data: {
          stage: DealStage.NEGOTIATION,
          updatedAt: new Date(),
        },
      });
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'RESERVATION_CANCELLED',
      entityType: 'reservation',
      entityId: deal.reservation.id,
      newValue: { reason },
    });

    // إرسال حدث
    this.eventEmitter.emit('reservation.cancelled', {
      type: 'reservation.cancelled',
      entityId: deal.reservation.id,
      entityType: 'reservation',
      data: { dealId, propertyId: deal.propertyId, reason },
      timestamp: new Date(),
      userId,
    });

    return { success: true };
  }

  /**
   * الحصول على إحصائيات الصفقات
   */
  async getStats(organizationId: string) {
    const stageCounts = await this.prisma.deal.groupBy({
      by: ['stage'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
    });

    const totalDeals = await this.prisma.deal.count({
      where: { organizationId, deletedAt: null },
    });

    const totalValue = await this.prisma.deal.aggregate({
      where: { organizationId, deletedAt: null, agreedPrice: { not: null } },
      _sum: { agreedPrice: true },
    });

    // تحويل النتائج
    const stagesMap: Record<string, number> = {};
    for (const item of stageCounts) {
      stagesMap[item.stage] = item._count.id;
    }

    return {
      stages: stagesMap,
      totalDeals,
      totalValue: totalValue._sum.agreedPrice || 0,
    };
  }
}
