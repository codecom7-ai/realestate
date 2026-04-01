// ═══════════════════════════════════════════════════════════════
// Activities Service - خدمة الأنشطة والمواعيد
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CreateActivityDto,
  UpdateActivityDto,
  GetTimelineDto,
  ActivityType,
  EntityType,
} from './dto/create-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * إنشاء نشاط جديد
   */
  async create(
    dto: CreateActivityDto,
    organizationId: string,
    userId?: string,
  ) {
    // التحقق من وجود الكيان المرتبط حسب النوع
    await this.validateEntity(dto.entityType, dto.entityId, organizationId);

    // التحقق من المستخدم إذا تم تحديده
    if (dto.userId || userId) {
      const user = await this.prisma.user.findFirst({
        where: {
          id: dto.userId || userId,
          organizationId,
          isActive: true,
          deletedAt: null,
        },
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

    const activity = await this.prisma.activity.create({
      data: {
        organizationId,
        userId: dto.userId || userId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        activityType: dto.activityType,
        title: dto.title,
        body: dto.body,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
        aiGenerated: dto.aiGenerated || false,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
            avatarUrl: true,
          },
        },
      },
    });

    // إرسال حدث activity.created
    this.eventEmitter.emit('activity.created', {
      type: 'activity.created',
      entityId: activity.id,
      entityType: 'activity',
      data: { activity },
      timestamp: new Date(),
      userId: userId || dto.userId,
    });

    return activity;
  }

  /**
   * الحصول على timeline موحد
   */
  async getTimeline(
    organizationId: string,
    options: GetTimelineDto = {},
  ) {
    const {
      entityType,
      entityId,
      activityType,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = options;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (activityType) where.activityType = activityType;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) where.occurredAt.gte = new Date(startDate);
      if (endDate) where.occurredAt.lte = new Date(endDate);
    }

    const [activities, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              firstNameAr: true,
              lastNameAr: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      data: activities,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + activities.length < total,
      },
    };
  }

  /**
   * الحصول على نشاط بالمعرف
   */
  async findOne(id: string, organizationId: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id, organizationId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'ACTIVITY_NOT_FOUND',
          message: 'Activity not found',
          messageAr: 'النشاط غير موجود',
        },
      });
    }

    return activity;
  }

  /**
   * تحديث نشاط
   */
  async update(
    id: string,
    dto: UpdateActivityDto,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.activity.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'ACTIVITY_NOT_FOUND',
          message: 'Activity not found',
          messageAr: 'النشاط غير موجود',
        },
      });
    }

    const activity = await this.prisma.activity.update({
      where: { id },
      data: {
        title: dto.title,
        body: dto.body,
        metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return activity;
  }

  /**
   * حذف نشاط
   */
  async remove(id: string, organizationId: string, userId: string) {
    const existing = await this.prisma.activity.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'ACTIVITY_NOT_FOUND',
          message: 'Activity not found',
          messageAr: 'النشاط غير موجود',
        },
      });
    }

    await this.prisma.activity.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * الحصول على أنشطة كيان معين
   */
  async getEntityTimeline(
    entityType: EntityType,
    entityId: string,
    organizationId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    await this.validateEntity(entityType, entityId, organizationId);

    const [activities, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: {
          organizationId,
          entityType,
          entityId,
        },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              firstNameAr: true,
              lastNameAr: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.activity.count({
        where: { organizationId, entityType, entityId },
      }),
    ]);

    return {
      data: activities,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + activities.length < total,
      },
    };
  }

  /**
   * إنشاء نشاط من نظام AI
   */
  async createAiActivity(
    entityType: EntityType,
    entityId: string,
    activityType: ActivityType,
    title: string,
    body: string,
    organizationId: string,
    metadata?: Record<string, unknown>,
  ) {
    const activity = await this.prisma.activity.create({
      data: {
        organizationId,
        entityType,
        entityId,
        activityType,
        title,
        body,
        metadata: metadata ? JSON.stringify(metadata) : null,
        aiGenerated: true,
        occurredAt: new Date(),
      },
    });

    return activity;
  }

  /**
   * التحقق من وجود الكيان
   */
  private async validateEntity(
    entityType: EntityType,
    entityId: string,
    organizationId: string,
  ) {
    let entity: unknown;

    switch (entityType) {
      case EntityType.LEAD:
        entity = await this.prisma.lead.findFirst({
          where: { id: entityId, organizationId, deletedAt: null },
        });
        break;
      case EntityType.CLIENT:
        entity = await this.prisma.client.findFirst({
          where: { id: entityId, organizationId, deletedAt: null },
        });
        break;
      case EntityType.PROPERTY:
        entity = await this.prisma.property.findFirst({
          where: { id: entityId, organizationId, deletedAt: null },
        });
        break;
      case EntityType.DEAL:
        entity = await this.prisma.deal.findFirst({
          where: { id: entityId, organizationId, deletedAt: null },
        });
        break;
      case EntityType.CONTRACT:
        entity = await this.prisma.contract.findFirst({
          where: { id: entityId, organizationId },
        });
        break;
      case EntityType.PAYMENT:
        entity = await this.prisma.payment.findFirst({
          where: { id: entityId, organizationId },
        });
        break;
      default:
        throw new BadRequestException({
          success: false,
          error: {
            code: 'INVALID_ENTITY_TYPE',
            message: 'Invalid entity type',
            messageAr: 'نوع الكيان غير صالح',
          },
        });
    }

    if (!entity) {
      const entityNamesAr: Record<EntityType, string> = {
        [EntityType.LEAD]: 'العميل المحتمل',
        [EntityType.CLIENT]: 'العميل',
        [EntityType.PROPERTY]: 'العقار',
        [EntityType.DEAL]: 'الصفقة',
        [EntityType.CONTRACT]: 'العقد',
        [EntityType.PAYMENT]: 'الدفعة',
      };

      throw new NotFoundException({
        success: false,
        error: {
          code: 'ENTITY_NOT_FOUND',
          message: `${entityType} not found`,
          messageAr: `${entityNamesAr[entityType]} غير موجود`,
        },
      });
    }

    return entity;
  }
}
