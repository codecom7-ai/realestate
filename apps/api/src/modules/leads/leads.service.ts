// ═══════════════════════════════════════════════════════════════
// Leads Service - إدارة Leads Pipeline
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeadDto, ChangeStageDto, AssignLeadDto, UpdateLeadDto } from './dto/create-lead.dto';
import { LeadStage, PropertyType } from '@realestate/shared-types';

// تعريف المراحل المسموحة للانتقال
const VALID_STAGE_TRANSITIONS: Record<LeadStage, LeadStage[]> = {
  [LeadStage.NEW]: [LeadStage.CONTACTED, LeadStage.CLOSED_LOST],
  [LeadStage.CONTACTED]: [LeadStage.QUALIFIED, LeadStage.CLOSED_LOST, LeadStage.NEW],
  [LeadStage.QUALIFIED]: [LeadStage.PROPERTY_PRESENTED, LeadStage.CLOSED_LOST, LeadStage.CONTACTED],
  [LeadStage.PROPERTY_PRESENTED]: [LeadStage.VIEWING_SCHEDULED, LeadStage.CLOSED_LOST, LeadStage.QUALIFIED],
  [LeadStage.VIEWING_SCHEDULED]: [LeadStage.VIEWED, LeadStage.CLOSED_LOST, LeadStage.PROPERTY_PRESENTED],
  [LeadStage.VIEWED]: [LeadStage.NEGOTIATING, LeadStage.CLOSED_LOST, LeadStage.VIEWING_SCHEDULED],
  [LeadStage.NEGOTIATING]: [LeadStage.RESERVED, LeadStage.CLOSED_LOST, LeadStage.VIEWED],
  [LeadStage.RESERVED]: [LeadStage.CONTRACT_SENT, LeadStage.CLOSED_LOST, LeadStage.NEGOTIATING],
  [LeadStage.CONTRACT_SENT]: [LeadStage.CONTRACT_SIGNED, LeadStage.CLOSED_LOST, LeadStage.RESERVED],
  [LeadStage.CONTRACT_SIGNED]: [LeadStage.CLOSED_WON, LeadStage.CLOSED_LOST],
  [LeadStage.CLOSED_WON]: [],
  [LeadStage.CLOSED_LOST]: [LeadStage.NEW], // يمكن إعادة فتح lead مغلق
};

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * الحصول على جميع الـ Leads مع الصفحات والفلترة
   */
  async findAll(
    organizationId: string,
    options: {
      stage?: LeadStage;
      assignedToId?: string;
      clientId?: string;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ) {
    const {
      stage,
      assignedToId,
      clientId,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;
    const skip = (page - 1) * limit;

    const where: any = { organizationId, deletedAt: null };

    if (stage) where.stage = stage;
    if (assignedToId) where.assignedToId = assignedToId;
    if (clientId) where.clientId = clientId;

    if (search) {
      where.OR = [
        { source: { contains: search } },
        { notes: { contains: search } },
        { client: { firstName: { contains: search } } },
        { client: { lastName: { contains: search } } },
        { client: { phone: { contains: search } } },
        { assignedTo: { firstName: { contains: search } } },
        { assignedTo: { lastName: { contains: search } } },
      ];
    }

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          stage: true,
          source: true,
          budget: true,
          budgetCurrency: true,
          preferredAreas: true,
          propertyTypes: true,
          minSize: true,
          maxSize: true,
          minBedrooms: true,
          maxBedrooms: true,
          aiScore: true,
          expectedCloseDate: true,
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
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              firstNameAr: true,
              lastNameAr: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              viewings: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data: leads,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + leads.length < total,
      },
    };
  }

  /**
   * الحصول على إحصائيات الـ Pipeline
   */
  async getPipelineStats(organizationId: string) {
    const stageCounts = await this.prisma.lead.groupBy({
      by: ['stage'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
    });

    const totalLeads = await this.prisma.lead.count({
      where: { organizationId, deletedAt: null },
    });

    const totalBudget = await this.prisma.lead.aggregate({
      where: { organizationId, deletedAt: null, budget: { not: null } },
      _sum: { budget: true },
    });

    // تحويل النتائج إلى كائن
    const stagesMap: Record<string, number> = {};
    for (const item of stageCounts) {
      stagesMap[item.stage] = item._count.id;
    }

    return {
      stages: stagesMap,
      totalLeads,
      totalBudget: totalBudget._sum.budget || 0,
    };
  }

  /**
   * الحصول على lead بالمعرف
   */
  async findOne(id: string, organizationId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true,
        stage: true,
        source: true,
        budget: true,
        budgetCurrency: true,
        preferredAreas: true,
        propertyTypes: true,
        minSize: true,
        maxSize: true,
        minBedrooms: true,
        maxBedrooms: true,
        notes: true,
        aiScore: true,
        aiScoreDetails: true,
        expectedCloseDate: true,
        lostReason: true,
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
            phone2: true,
            email: true,
            isVip: true,
            clientType: true,
          },
        },
        assignedTo: {
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
        viewings: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            feedback: true,
            rating: true,
            property: {
              select: {
                id: true,
                title: true,
                city: true,
                district: true,
              },
            },
          },
          take: 5,
          orderBy: { scheduledAt: 'desc' },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found',
          messageAr: 'الـ Lead غير موجود',
        },
      });
    }

    return lead;
  }

  /**
   * إنشاء lead جديد
   */
  async create(
    dto: CreateLeadDto,
    organizationId: string,
    createdBy: string,
  ) {
    // التحقق من وجود العميل إذا تم تحديده
    if (dto.clientId) {
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
    }

    // التحقق من وجود المستخدم المسؤول إذا تم تحديده
    if (dto.assignedToId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.assignedToId, organizationId, isActive: true, deletedAt: null },
      });

      if (!user) {
        throw new NotFoundException({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Assigned user not found',
            messageAr: 'المستخدم المسؤول غير موجود',
          },
        });
      }
    }

    const lead = await this.prisma.lead.create({
      data: {
        organizationId,
        clientId: dto.clientId,
        assignedToId: dto.assignedToId,
        source: dto.source,
        budget: dto.budget,
        budgetCurrency: dto.budgetCurrency || 'EGP',
        preferredAreas: dto.preferredAreas || [],
        propertyTypes: dto.propertyTypes || [],
        minSize: dto.minSize,
        maxSize: dto.maxSize,
        minBedrooms: dto.minBedrooms,
        maxBedrooms: dto.maxBedrooms,
        notes: dto.notes,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
      },
      select: {
        id: true,
        stage: true,
        source: true,
        budget: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // إنشاء سجل تدقيق
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: createdBy,
        action: 'LEAD_CREATED',
        entityType: 'lead',
        entityId: lead.id,
        newValue: JSON.stringify({ stage: lead.stage, source: lead.source }),
      },
    });

    // إرسال حدث lead.created
    this.eventEmitter.emit('lead.created', {
      type: 'lead.created',
      entityId: lead.id,
      entityType: 'lead',
      data: { lead },
      timestamp: new Date(),
      userId: createdBy,
    });

    return lead;
  }

  /**
   * تحديث lead
   */
  async update(
    id: string,
    dto: UpdateLeadDto,
    organizationId: string,
    updatedBy: string,
  ) {
    const existing = await this.prisma.lead.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found',
          messageAr: 'الـ Lead غير موجود',
        },
      });
    }

    const updateData: any = { ...dto, updatedAt: new Date() };

    if (dto.expectedCloseDate) {
      updateData.expectedCloseDate = new Date(dto.expectedCloseDate);
    }

    if (dto.propertyTypes) {
      updateData.propertyTypes = dto.propertyTypes as PropertyType[];
    }

    const lead = await this.prisma.lead.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        stage: true,
        budget: true,
        preferredAreas: true,
        updatedAt: true,
      },
    });

    // إنشاء سجل تدقيق
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: updatedBy,
        action: 'LEAD_UPDATED',
        entityType: 'lead',
        entityId: id,
        oldValue: JSON.stringify({ budget: existing.budget }),
        newValue: JSON.stringify({ budget: lead.budget }),
      },
    });

    return lead;
  }

  /**
   * تغيير مرحلة الـ Lead
   */
  async changeStage(
    id: string,
    dto: ChangeStageDto,
    organizationId: string,
    changedBy: string,
  ) {
    const existing = await this.prisma.lead.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found',
          messageAr: 'الـ Lead غير موجود',
        },
      });
    }

    // التحقق من صحة الانتقال
    const allowedTransitions = VALID_STAGE_TRANSITIONS[existing.stage as LeadStage];
    if (!allowedTransitions.includes(dto.stage)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STAGE_TRANSITION',
          message: `Cannot transition from ${existing.stage} to ${dto.stage}`,
          messageAr: `لا يمكن الانتقال من ${this.getStageNameAr(existing.stage as LeadStage)} إلى ${this.getStageNameAr(dto.stage)}`,
          details: {
            currentStage: existing.stage,
            targetStage: dto.stage,
            allowedTransitions,
          },
        },
      });
    }

    // التحقق من سبب الإغلاق عند CLOSED_LOST
    if (dto.stage === LeadStage.CLOSED_LOST && !dto.reason) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'LOST_REASON_REQUIRED',
          message: 'Reason is required when closing a lead as lost',
          messageAr: 'سبب الإغلاق مطلوب عند إغلاق الـ Lead كخاسر',
        },
      });
    }

    const updateData: any = {
      stage: dto.stage,
      updatedAt: new Date(),
    };

    if (dto.stage === LeadStage.CLOSED_LOST) {
      updateData.lostReason = dto.reason;
    }

    const lead = await this.prisma.lead.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        stage: true,
        lostReason: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // إنشاء سجل تدقيق
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: changedBy,
        action: 'LEAD_STAGE_CHANGED',
        entityType: 'lead',
        entityId: id,
        oldValue: JSON.stringify({ stage: existing.stage }),
        newValue: JSON.stringify({ stage: dto.stage, reason: dto.reason }),
      },
    });

    // إرسال حدث lead.stage_changed
    this.eventEmitter.emit('lead.stage_changed', {
      type: 'lead.stage_changed',
      entityId: id,
      entityType: 'lead',
      data: {
        previousStage: existing.stage,
        newStage: dto.stage,
        reason: dto.reason,
        lead,
      },
      timestamp: new Date(),
      userId: changedBy,
    });

    return lead;
  }

  /**
   * تعيين مسؤول للـ Lead
   */
  async assign(
    id: string,
    dto: AssignLeadDto,
    organizationId: string,
    assignedBy: string,
  ) {
    const existing = await this.prisma.lead.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found',
          messageAr: 'الـ Lead غير موجود',
        },
      });
    }

    // التحقق من وجود المستخدم
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

    const previousAssigneeId = existing.assignedToId;

    const lead = await this.prisma.lead.update({
      where: { id },
      data: {
        assignedToId: dto.userId,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        stage: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // إنشاء سجل تدقيق
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: assignedBy,
        action: 'LEAD_ASSIGNED',
        entityType: 'lead',
        entityId: id,
        oldValue: JSON.stringify({ assignedToId: previousAssigneeId }),
        newValue: JSON.stringify({ assignedToId: dto.userId }),
      },
    });

    // إرسال حدث lead.assigned
    this.eventEmitter.emit('lead.assigned', {
      type: 'lead.assigned',
      entityId: id,
      entityType: 'lead',
      data: {
        previousAssigneeId,
        newAssigneeId: dto.userId,
        assigneeName: `${user.firstName} ${user.lastName}`,
        lead,
      },
      timestamp: new Date(),
      userId: assignedBy,
    });

    return lead;
  }

  /**
   * حذف lead (soft delete)
   */
  async remove(id: string, organizationId: string, deletedBy: string) {
    const existing = await this.prisma.lead.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found',
          messageAr: 'الـ Lead غير موجود',
        },
      });
    }

    // Soft delete
    await this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // إنشاء سجل تدقيق
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: deletedBy,
        action: 'LEAD_DELETED',
        entityType: 'lead',
        entityId: id,
        oldValue: JSON.stringify({ stage: existing.stage }),
      },
    });

    return { success: true };
  }

  /**
   * الحصول على اسم المرحلة بالعربية
   */
  private getStageNameAr(stage: LeadStage): string {
    const stageNames: Record<LeadStage, string> = {
      [LeadStage.NEW]: 'جديد',
      [LeadStage.CONTACTED]: 'تم التواصل',
      [LeadStage.QUALIFIED]: 'مؤهل',
      [LeadStage.PROPERTY_PRESENTED]: 'تم تقديم عقار',
      [LeadStage.VIEWING_SCHEDULED]: 'معاينة مجدولة',
      [LeadStage.VIEWED]: 'تمت المعاينة',
      [LeadStage.NEGOTIATING]: 'في التفاوض',
      [LeadStage.RESERVED]: 'محجوز',
      [LeadStage.CONTRACT_SENT]: 'تم إرسال العقد',
      [LeadStage.CONTRACT_SIGNED]: 'العقد موقع',
      [LeadStage.CLOSED_WON]: 'مغلق رابح',
      [LeadStage.CLOSED_LOST]: 'مغلق خاسر',
    };
    return stageNames[stage] || stage;
  }
}
