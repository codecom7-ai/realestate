// ═══════════════════════════════════════════════════════════════
// Reservations Service - خدمة إدارة الحجوزات
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateReservationDto,
  UpdateReservationDto,
  ExtendReservationDto,
  CancelReservationDto,
  GetReservationsDto,
} from './dto/reservations.dto';
import { DealStage, PropertyStatus } from '@realestate/shared-types';

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
  ) {}

  /**
   * إنشاء حجز جديد مع التحقق من Unit Lock
   */
  async create(
    dto: CreateReservationDto,
    organizationId: string,
    userId: string,
  ) {
    // التحقق من وجود الصفقة
    const deal = await this.prisma.deal.findFirst({
      where: { id: dto.dealId, organizationId, deletedAt: null },
      include: { property: true, reservation: true },
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

    // التحقق من عدم وجود حجز سابق
    if (deal.reservation) {
      throw new ConflictException({
        success: false,
        error: {
          code: 'RESERVATION_ALREADY_EXISTS',
          message: 'Deal already has a reservation',
          messageAr: 'الصفقة لها حجز سابق',
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

    // التحقق من وجود عقار
    if (!deal.propertyId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NO_PROPERTY_LINKED',
          message: 'Deal has no linked property',
          messageAr: 'الصفقة ليس لها عقار مرتبط',
        },
      });
    }

    // ATOMIC: إنشاء الحجز مع حجز العقار
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // إنشاء حجز العقار
        const lock = await tx.propertyLock.create({
          data: {
            organizationId,
            propertyId: deal.propertyId!,
            lockedByDealId: dto.dealId,
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
            dealId: dto.dealId,
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
          where: { id: dto.dealId },
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
          dealId: dto.dealId,
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
          dealId: dto.dealId,
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
        throw new ConflictException({
          success: false,
          error: {
            code: 'UNIT_ALREADY_LOCKED',
            message: 'Property is already reserved',
            messageAr: 'العقار محجوز مسبقاً',
          },
        });
      }
      throw error;
    }
  }

  /**
   * الحصول على حجز بالمعرف
   */
  async findOne(id: string, organizationId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, organizationId },
      include: {
        deal: {
          select: {
            id: true,
            stage: true,
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
                district: true,
              },
            },
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'RESERVATION_NOT_FOUND',
          message: 'Reservation not found',
          messageAr: 'الحجز غير موجود',
        },
      });
    }

    return reservation;
  }

  /**
   * الحصول على حجز صفقة معينة
   */
  async getByDeal(dealId: string, organizationId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { dealId, organizationId },
      include: {
        deal: {
          select: {
            id: true,
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

    if (!reservation) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'RESERVATION_NOT_FOUND',
          message: 'No reservation found for this deal',
          messageAr: 'لا يوجد حجز لهذه الصفقة',
        },
      });
    }

    return reservation;
  }

  /**
   * الحصول على جميع الحجوزات
   */
  async findAll(organizationId: string, options: GetReservationsDto = {}) {
    const {
      dealId,
      expiresBefore,
      status = 'active',
      page = 1,
      limit = 20,
    } = options;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (dealId) where.dealId = dealId;

    if (expiresBefore) {
      where.expiresAt = { lte: new Date(expiresBefore) };
    }

    if (status === 'active') {
      where.expiresAt = { gt: new Date() };
    } else if (status === 'expired') {
      where.expiresAt = { lte: new Date() };
    }

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        include: {
          deal: {
            select: {
              id: true,
              stage: true,
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
                  district: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      data: reservations,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + reservations.length < total,
      },
    };
  }

  /**
   * تحديث حجز
   */
  async update(
    id: string,
    dto: UpdateReservationDto,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.reservation.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'RESERVATION_NOT_FOUND',
          message: 'Reservation not found',
          messageAr: 'الحجز غير موجود',
        },
      });
    }

    const updateData: any = { updatedAt: new Date() };

    if (dto.depositAmount !== undefined) updateData.depositAmount = dto.depositAmount;
    if (dto.depositMethod !== undefined) updateData.depositMethod = dto.depositMethod;
    if (dto.expiresAt !== undefined) updateData.expiresAt = new Date(dto.expiresAt);
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const reservation = await this.prisma.reservation.update({
      where: { id },
      data: updateData,
    });

    // تحديث تاريخ انتهاء حجز العقار أيضاً
    if (dto.expiresAt) {
      await this.prisma.propertyLock.updateMany({
        where: { lockedByDealId: existing.dealId },
        data: { expiresAt: new Date(dto.expiresAt) },
      });
    }

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'RESERVATION_UPDATED',
      entityType: 'reservation',
      entityId: id,
      oldValue: { expiresAt: existing.expiresAt },
      newValue: updateData,
    });

    return reservation;
  }

  /**
   * تمديد حجز
   */
  async extend(
    id: string,
    dto: ExtendReservationDto,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.reservation.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'RESERVATION_NOT_FOUND',
          message: 'Reservation not found',
          messageAr: 'الحجز غير موجود',
        },
      });
    }

    const newExpiresAt = new Date(dto.newExpiresAt);

    // التحقق من أن التاريخ الجديد أحدث
    if (newExpiresAt <= existing.expiresAt) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_EXTENSION_DATE',
          message: 'New expiration date must be later than current',
          messageAr: 'تاريخ الانتهاء الجديد يجب أن يكون أحدث من الحالي',
        },
      });
    }

    // تحديث الحجز وحجز العقار
    await this.prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id },
        data: { expiresAt: newExpiresAt },
      });

      await tx.propertyLock.updateMany({
        where: { lockedByDealId: existing.dealId },
        data: { expiresAt: newExpiresAt },
      });
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'RESERVATION_EXTENDED',
      entityType: 'reservation',
      entityId: id,
      oldValue: { expiresAt: existing.expiresAt },
      newValue: { expiresAt: newExpiresAt, reason: dto.reason },
    });

    // إرسال حدث
    this.eventEmitter.emit('reservation.extended', {
      type: 'reservation.extended',
      entityId: id,
      entityType: 'reservation',
      data: {
        dealId: existing.dealId,
        previousExpiresAt: existing.expiresAt,
        newExpiresAt,
        reason: dto.reason,
      },
      timestamp: new Date(),
      userId,
    });

    return { success: true, newExpiresAt };
  }

  /**
   * إلغاء حجز - unlock الوحدة
   */
  async cancel(
    id: string,
    dto: CancelReservationDto,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.reservation.findFirst({
      where: { id, organizationId },
      include: {
        deal: {
          select: { propertyId: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'RESERVATION_NOT_FOUND',
          message: 'Reservation not found',
          messageAr: 'الحجز غير موجود',
        },
      });
    }

    // ATOMIC: إلغاء الحجز
    await this.prisma.$transaction(async (tx) => {
      // حذف الحجز
      await tx.reservation.delete({
        where: { id },
      });

      // إلغاء حجز العقار
      if (existing.deal.propertyId) {
        await tx.propertyLock.updateMany({
          where: { lockedByDealId: existing.dealId },
          data: { unlockedAt: new Date() },
        });

        // تحديث حالة العقار
        await tx.property.update({
          where: { id: existing.deal.propertyId },
          data: { status: PropertyStatus.AVAILABLE },
        });
      }

      // تحديث مرحلة الصفقة
      await tx.deal.update({
        where: { id: existing.dealId },
        data: { stage: DealStage.NEGOTIATION, updatedAt: new Date() },
      });
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'RESERVATION_CANCELLED',
      entityType: 'reservation',
      entityId: id,
      newValue: { reason: dto.reason },
    });

    // إرسال حدث
    this.eventEmitter.emit('reservation.cancelled', {
      type: 'reservation.cancelled',
      entityId: id,
      entityType: 'reservation',
      data: {
        dealId: existing.dealId,
        propertyId: existing.deal.propertyId,
        reason: dto.reason,
      },
      timestamp: new Date(),
      userId,
    });

    return { success: true };
  }

  /**
   * الحصول على الحجوزات المنتهية
   */
  async getExpiredReservations(organizationId: string) {
    const now = new Date();

    const expiredReservations = await this.prisma.reservation.findMany({
      where: {
        organizationId,
        expiresAt: { lte: now },
      },
      include: {
        deal: {
          select: {
            id: true,
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
      orderBy: { expiresAt: 'asc' },
    });

    return expiredReservations;
  }

  /**
   * الحصول على الحجوزات القريبة من الانتهاء
   * @param daysBeforeExpiry عدد الأيام قبل انتهاء الصلاحية (افتراضياً 7 أيام)
   */
  async getExpiringReservations(organizationId: string, daysBeforeExpiry: number = 7) {
    const now = new Date();
    const expiryThreshold = new Date(now.getTime() + daysBeforeExpiry * 24 * 60 * 60 * 1000);

    const expiringReservations = await this.prisma.reservation.findMany({
      where: {
        organizationId,
        expiresAt: {
          gt: now,
          lte: expiryThreshold,
        },
      },
      include: {
        deal: {
          select: {
            id: true,
            stage: true,
            dealType: true,
            agreedPrice: true,
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
            property: {
              select: {
                id: true,
                title: true,
                city: true,
                district: true,
              },
            },
            assignedBroker: {
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
      orderBy: { expiresAt: 'asc' },
    });

    return expiringReservations.map((reservation) => ({
      ...reservation,
      daysUntilExpiry: Math.ceil(
        (reservation.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      ),
    }));
  }
}
