// @ts-nocheck
// ═══════════════════════════════════════════════════════════════
// Properties Service - خدمة العقارات
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  LockPropertyDto,
  GetPropertiesDto,
  PROPERTY_STATUS_AR,
  PROPERTY_TYPES_AR,
} from './dto/create-property.dto';
import { PropertyStatus, PropertyType } from '@realestate/shared-types';
import { Prisma } from '@prisma/client';

type PropertyOrderByInput = Record<string, 'asc' | 'desc'>;

@Injectable()
export class PropertiesService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * إنشاء عقار جديد
   */
  async create(dto: CreatePropertyDto, organizationId: string, userId: string) {
    const property = await this.prisma.property.create({
      data: {
        organizationId,
        title: dto.title,
        titleAr: dto.titleAr,
        description: dto.description,
        propertyType: dto.propertyType,
        finishingType: dto.finishingType,
        status: dto.status || PropertyStatus.AVAILABLE,
        city: dto.city,
        district: dto.district,
        address: dto.address,
        floor: dto.floor,
        unitNumber: dto.unitNumber,
        areaM2: dto.areaM2,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        parking: dto.parking,
        askingPrice: dto.askingPrice,
        currency: dto.currency || 'EGP',
        branchId: dto.branchId,
        projectId: dto.projectId,
        developerId: dto.developerId,
        isListed: dto.isListed ?? true,
        isOffPlan: dto.isOffPlan ?? false,
        commissionRate: dto.commissionRate,
      },
      include: {
        branch: {
          select: { id: true, name: true, nameAr: true },
        },
        project: {
          select: { id: true, name: true, nameAr: true },
        },
        developer: {
          select: { id: true, name: true, nameAr: true },
        },
        images: {
          orderBy: { order: 'asc' },
          take: 5,
        },
        lock: true,
      },
    });

    // إرسال حدث
    this.eventEmitter.emit('property.created', {
      type: 'property.created',
      entityId: property.id,
      entityType: 'property',
      data: { property },
      timestamp: new Date(),
      userId,
    });

    return property;
  }

  /**
   * الحصول على قائمة العقارات
   */
  async findAll(organizationId: string, options: GetPropertiesDto = {}) {
    const {
      status,
      propertyType,
      city,
      district,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      minBedrooms,
      maxBedrooms,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyWhereInput = {
      organizationId,
      deletedAt: null,
    };

    // الفلاتر
    if (status) where.status = status;
    if (propertyType) where.propertyType = propertyType;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (district) where.district = { contains: district, mode: 'insensitive' };

    // نطاق السعر
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.askingPrice = {};
      if (minPrice !== undefined) where.askingPrice.gte = minPrice;
      if (maxPrice !== undefined) where.askingPrice.lte = maxPrice;
    }

    // نطاق المساحة
    if (minArea !== undefined || maxArea !== undefined) {
      where.areaM2 = {};
      if (minArea !== undefined) where.areaM2.gte = minArea;
      if (maxArea !== undefined) where.areaM2.lte = maxArea;
    }

    // نطاق غرف النوم
    if (minBedrooms !== undefined || maxBedrooms !== undefined) {
      where.bedrooms = {};
      if (minBedrooms !== undefined) where.bedrooms.gte = minBedrooms;
      if (maxBedrooms !== undefined) where.bedrooms.lte = maxBedrooms;
    }

    // البحث النصي
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { titleAr: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { district: { contains: search, mode: 'insensitive' } },
      ];
    }

    // الترتيب
    const orderBy: PropertyOrderByInput = {};
    orderBy[sortBy] = sortOrder;

    const [properties, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          lock: true,
          branch: {
            select: { id: true, name: true, nameAr: true },
          },
        },
      }),
      this.prisma.property.count({ where }),
    ]);

    return {
      data: properties,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + properties.length < total,
      },
    };
  }

  /**
   * الحصول على عقار بالمعرف
   */
  async findOne(id: string, organizationId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        branch: {
          select: { id: true, name: true, nameAr: true },
        },
        project: {
          select: { id: true, name: true, nameAr: true },
        },
        developer: {
          select: { id: true, name: true, nameAr: true },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        lock: true,
        priceHistory: {
          orderBy: { changedAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            viewings: true,
            deals: true,
          },
        },
      },
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

    return property;
  }

  /**
   * تحديث عقار
   */
  async update(
    id: string,
    dto: UpdatePropertyDto,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.property.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPERTY_NOT_FOUND',
          message: 'Property not found',
          messageAr: 'العقار غير موجود',
        },
      });
    }

    // تسجيل تغيير السعر
    if (dto.askingPrice && dto.askingPrice !== existing.askingPrice) {
      await this.prisma.propertyPriceHistory.create({
        data: {
          propertyId: id,
          price: dto.askingPrice,
          changedById: userId,
          reason: 'تحديث السعر',
        },
      });
    }

    const property = await this.prisma.property.update({
      where: { id },
      data: {
        title: dto.title,
        titleAr: dto.titleAr,
        description: dto.description,
        finishingType: dto.finishingType,
        status: dto.status,
        askingPrice: dto.askingPrice,
        commissionRate: dto.commissionRate,
        isListed: dto.isListed,
      },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
        lock: true,
      },
    });

    // إرسال حدث
    this.eventEmitter.emit('property.updated', {
      type: 'property.updated',
      entityId: property.id,
      entityType: 'property',
      data: { property },
      timestamp: new Date(),
      userId,
    });

    return property;
  }

  /**
   * حذف عقار (soft delete)
   */
  async remove(id: string, organizationId: string, userId: string) {
    const existing = await this.prisma.property.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { lock: true },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPERTY_NOT_FOUND',
          message: 'Property not found',
          messageAr: 'العقار غير موجود',
        },
      });
    }

    // التحقق من عدم وجود حجز نشط
    if (existing.lock && !existing.lock.unlockedAt) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PROPERTY_IS_LOCKED',
          message: 'Cannot delete a locked property',
          messageAr: 'لا يمكن حذف عقار محجوز',
        },
      });
    }

    await this.prisma.property.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  /**
   * حجز عقار (ATOMIC - يمنع الحجز المزدوج)
   */
  async lock(
    propertyId: string,
    dto: LockPropertyDto,
    organizationId: string,
    userId: string,
  ) {
    // التحقق من وجود العقار
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, organizationId, deletedAt: null },
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

    // التحقق من حالة العقار
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

    // ATOMIC: محاولة إنشاء حجز
    // إذا كان هناك حجز سابق غير منتهي، سيفشل الـ unique constraint
    try {
      const lock = await this.prisma.propertyLock.create({
        data: {
          organizationId,
          propertyId,
          lockedByDealId: dto.dealId,
          lockType: dto.lockType,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        },
      });

      // تحديث حالة العقار
      const newStatus =
        dto.lockType === 'temporary'
          ? PropertyStatus.RESERVED_TEMP
          : PropertyStatus.RESERVED_CONFIRMED;

      await this.prisma.property.update({
        where: { id: propertyId },
        data: { status: newStatus },
      });

      // إرسال حدث
      this.eventEmitter.emit('property.locked', {
        type: 'property.locked',
        entityId: propertyId,
        entityType: 'property',
        data: { lock, dealId: dto.dealId, lockType: dto.lockType },
        timestamp: new Date(),
        userId,
      });

      return {
        propertyId,
        lockedByDealId: dto.dealId,
        lockType: dto.lockType,
        lockedAt: lock.lockedAt,
      };
    } catch (error: unknown) {
      // Prisma unique constraint violation
      const prismaError = error as { code?: string };
      if (prismaError.code === 'P2002') {
        // العقار محجوز بالفعل
        const existingLock = await this.prisma.propertyLock.findUnique({
          where: { propertyId },
        });

        throw new ConflictException({
          success: false,
          error: {
            code: 'UNIT_ALREADY_LOCKED',
            message: 'Property is already locked',
            messageAr: 'العقار محجوز مسبقاً',
            lockedByDealId: existingLock?.lockedByDealId,
          },
        });
      }
      throw error;
    }
  }

  /**
   * إلغاء حجز عقار
   */
  async unlock(
    propertyId: string,
    dealId: string,
    organizationId: string,
    userId: string,
  ) {
    // التحقق من وجود العقار
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, organizationId, deletedAt: null },
      include: { lock: true },
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

    if (!property.lock || property.lock.lockedByDealId !== dealId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'LOCK_NOT_FOUND_OR_NOT_OWNER',
          message: 'Lock not found or you are not the owner',
          messageAr: 'الحجز غير موجود أو لست صاحبه',
        },
      });
    }

    // تحديث الحجز
    await this.prisma.propertyLock.update({
      where: { propertyId },
      data: { unlockedAt: new Date() },
    });

    // تحديث حالة العقار
    await this.prisma.property.update({
      where: { id: propertyId },
      data: { status: PropertyStatus.AVAILABLE },
    });

    // إرسال حدث
    this.eventEmitter.emit('property.unlocked', {
      type: 'property.unlocked',
      entityId: propertyId,
      entityType: 'property',
      data: { dealId },
      timestamp: new Date(),
      userId,
    });

    return { success: true };
  }

  /**
   * الحصول على إحصائيات العقارات
   */
  async getStats(organizationId: string) {
    const [total, available, reserved, sold, rented] = await Promise.all([
      this.prisma.property.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.property.count({
        where: { organizationId, deletedAt: null, status: PropertyStatus.AVAILABLE },
      }),
      this.prisma.property.count({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: [PropertyStatus.RESERVED_TEMP, PropertyStatus.RESERVED_CONFIRMED] },
        },
      }),
      this.prisma.property.count({
        where: { organizationId, deletedAt: null, status: PropertyStatus.SOLD },
      }),
      this.prisma.property.count({
        where: { organizationId, deletedAt: null, status: PropertyStatus.RENTED },
      }),
    ]);

    // توزيع حسب النوع
    const byType = await this.prisma.property.groupBy({
      by: ['propertyType'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
    });

    // إجمالي القيمة
    const totalValue = await this.prisma.property.aggregate({
      where: { organizationId, deletedAt: null },
      _sum: { askingPrice: true },
    });

    return {
      total,
      available,
      reserved,
      sold,
      rented,
      byType: byType.map((item: { propertyType: PropertyType; _count: { id: number } }) => ({
        type: item.propertyType,
        typeAr: PROPERTY_TYPES_AR[item.propertyType],
        count: item._count.id,
      })),
      totalValue: totalValue._sum.askingPrice || 0,
    };
  }
}
