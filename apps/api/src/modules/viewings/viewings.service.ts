// ═══════════════════════════════════════════════════════════════
// Viewings Service - جدولة المعاينات
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ScheduleViewingDto,
  UpdateViewingDto,
  CancelViewingDto,
  ViewingDto,
  ViewingStatsDto,
  GetViewingsDto,
  ViewingStatus,
} from './dto/viewings.dto';

@Injectable()
export class ViewingsService {
  private readonly logger = new Logger(ViewingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * جدولة معاينة جديدة
   */
  async schedule(
    organizationId: string,
    dto: ScheduleViewingDto,
    userId?: string,
  ): Promise<ViewingDto> {
    // التحقق من Lead
    const lead = await this.prisma.lead.findFirst({
      where: { id: dto.leadId, organizationId },
      include: { client: true },
    });

    if (!lead) {
      throw new NotFoundException({
        code: 'LEAD_NOT_FOUND',
        message: 'Lead not found',
        messageAr: 'العميل المحتمل غير موجود',
      });
    }

    // التحقق من Property
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, organizationId },
    });

    if (!property) {
      throw new NotFoundException({
        code: 'PROPERTY_NOT_FOUND',
        message: 'Property not found',
        messageAr: 'العقار غير موجود',
      });
    }

    // التحقق من عدم وجود تعارض (نفس العقار، نفس الوقت ± ساعة)
    const conflictWindow = new Date(dto.scheduledAt);
    conflictWindow.setHours(conflictWindow.getHours() - 1);
    const conflictWindowEnd = new Date(dto.scheduledAt);
    conflictWindowEnd.setHours(conflictWindowEnd.getHours() + 1);

    const conflicting = await this.prisma.viewing.findFirst({
      where: {
        organizationId,
        propertyId: dto.propertyId,
        status: { notIn: ['cancelled', 'no_show'] },
        scheduledAt: {
          gte: conflictWindow,
          lte: conflictWindowEnd,
        },
      },
    });

    if (conflicting) {
      throw new ConflictException({
        code: 'VIEWING_CONFLICT',
        message: 'Property has another viewing scheduled at this time',
        messageAr: 'يوجد معاينة أخرى مجدولة في هذا الوقت',
        conflictingViewingId: conflicting.id,
      });
    }

    // إنشاء المعاينة
    const viewing = await this.prisma.viewing.create({
      data: {
        organizationId,
        leadId: dto.leadId,
        propertyId: dto.propertyId,
        scheduledAt: dto.scheduledAt,
        notes: dto.notes,
        status: ViewingStatus.SCHEDULED,
      },
      include: {
        lead: {
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
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
    });

    // إنشاء Activity
    await this.prisma.activity.create({
      data: {
        organizationId,
        userId,
        entityType: 'viewing',
        entityId: viewing.id,
        activityType: 'viewing_scheduled',
        title: 'جدولة معاينة',
        body: `تم جدولة معاينة للعقار "${property.title}" مع العميل "${lead.client?.firstName || ''} ${lead.client?.lastName || ''}"`,
        metadata: JSON.stringify({
          leadId: dto.leadId,
          propertyId: dto.propertyId,
          scheduledAt: dto.scheduledAt,
        }),
      },
    });

    // إرسال حدث
    this.eventEmitter.emit('viewing.scheduled', {
      organizationId,
      viewingId: viewing.id,
      leadId: dto.leadId,
      propertyId: dto.propertyId,
      scheduledAt: dto.scheduledAt,
    });

    this.logger.log(`Viewing scheduled: ${viewing.id}`);

    return viewing as any;
  }

  /**
   * قائمة المعاينات
   */
  async findAll(
    organizationId: string,
    query: GetViewingsDto,
  ): Promise<{ data: any[]; meta: { total: number; page: number; limit: number; hasMore: boolean } }> {
    const { leadId, propertyId, status, from, to, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
    };

    if (leadId) where.leadId = leadId;
    if (propertyId) where.propertyId = propertyId;
    if (status) where.status = status;

    if (from || to) {
      where.scheduledAt = {};
      if (from) where.scheduledAt.gte = new Date(from);
      if (to) where.scheduledAt.lte = new Date(to);
    }

    const [viewings, total] = await Promise.all([
      this.prisma.viewing.findMany({
        where,
        include: {
          lead: {
            include: {
              client: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
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
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.viewing.count({ where }),
    ]);

    return {
      data: viewings,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + viewings.length < total,
      },
    };
  }

  /**
   * تفاصيل معاينة
   */
  async findOne(id: string, organizationId: string): Promise<ViewingDto> {
    const viewing = await this.prisma.viewing.findFirst({
      where: { id, organizationId },
      include: {
        lead: {
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
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
    });

    if (!viewing) {
      throw new NotFoundException({
        code: 'VIEWING_NOT_FOUND',
        message: 'Viewing not found',
        messageAr: 'المعاينة غير موجودة',
      });
    }

    return viewing as any;
  }

  /**
   * تحديث معاينة
   */
  async update(
    id: string,
    organizationId: string,
    dto: UpdateViewingDto,
    userId?: string,
  ): Promise<ViewingDto> {
    const viewing = await this.findOne(id, organizationId);

    // إذا تم تحديث الموعد، التحقق من التعارض
    if (dto.scheduledAt) {
      const newDate = new Date(dto.scheduledAt);
      if (newDate.getTime() !== viewing.scheduledAt.getTime()) {
      const conflictWindow = new Date(dto.scheduledAt);
      conflictWindow.setHours(conflictWindow.getHours() - 1);
      const conflictWindowEnd = new Date(dto.scheduledAt);
      conflictWindowEnd.setHours(conflictWindowEnd.getHours() + 1);

      const conflicting = await this.prisma.viewing.findFirst({
        where: {
          organizationId,
          propertyId: viewing.propertyId,
          status: { notIn: ['cancelled', 'no_show'] },
          scheduledAt: {
            gte: conflictWindow,
            lte: conflictWindowEnd,
          },
          id: { not: id },
        },
      });

      if (conflicting) {
        throw new ConflictException({
          code: 'VIEWING_CONFLICT',
          message: 'Property has another viewing scheduled at this time',
          messageAr: 'يوجد معاينة أخرى مجدولة في هذا الوقت',
        });
      }
      }
    }

    const updated = await this.prisma.viewing.update({
      where: { id },
      data: {
        scheduledAt: dto.scheduledAt,
        status: dto.status,
        feedback: dto.feedback,
        rating: dto.rating,
        notes: dto.notes,
        conductedAt: dto.status === ViewingStatus.COMPLETED ? new Date() : undefined,
      },
      include: {
        lead: {
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
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
    });

    // إرسال حدث
    this.eventEmitter.emit('viewing.updated', {
      organizationId,
      viewingId: id,
      status: dto.status,
    });

    return updated as any;
  }

  /**
   * إلغاء معاينة
   */
  async cancel(
    id: string,
    organizationId: string,
    dto: CancelViewingDto,
    userId?: string,
  ): Promise<ViewingDto> {
    return this.update(id, organizationId, {
      status: ViewingStatus.CANCELLED,
      notes: dto.reason,
    }, userId);
  }

  /**
   * إحصائيات المعاينات
   */
  async getStats(organizationId: string): Promise<ViewingStatsDto> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const [scheduled, completed, cancelled, noShow, today, thisWeek] = await Promise.all([
      this.prisma.viewing.count({
        where: { organizationId, status: ViewingStatus.SCHEDULED },
      }),
      this.prisma.viewing.count({
        where: { organizationId, status: ViewingStatus.COMPLETED },
      }),
      this.prisma.viewing.count({
        where: { organizationId, status: ViewingStatus.CANCELLED },
      }),
      this.prisma.viewing.count({
        where: { organizationId, status: ViewingStatus.NO_SHOW },
      }),
      this.prisma.viewing.count({
        where: {
          organizationId,
          status: { notIn: ['cancelled', 'no_show'] },
          scheduledAt: { gte: todayStart },
        },
      }),
      this.prisma.viewing.count({
        where: {
          organizationId,
          status: { notIn: ['cancelled', 'no_show'] },
          scheduledAt: { gte: weekStart },
        },
      }),
    ]);

    return { scheduled, completed, cancelled, noShow, today, thisWeek };
  }
}
