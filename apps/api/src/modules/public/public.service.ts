// ═══════════════════════════════════════════════════════════════
// Public Service
// خدمة الواجهة العامة (بدون مصادقة)
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateViewingRequestDto, ConfirmViewingDto } from './dto/public.dto';
import { LeadStage } from '@realestate/shared-types';

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * الحصول على بيانات عقار عامة (بدون مصادقة)
   */
  async getPropertyPublic(propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        deletedAt: null,
        isListed: true,
      },
      select: {
        id: true,
        title: true,
        titleAr: true,
        description: true,
        propertyType: true,
        finishingType: true,
        city: true,
        district: true,
        address: true,
        floor: true,
        unitNumber: true,
        areaM2: true,
        bedrooms: true,
        bathrooms: true,
        parking: true,
        askingPrice: true,
        currency: true,
        status: true,
        images: {
          select: {
            id: true,
            url: true,
            isPrimary: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
        branch: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            phone: true,
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPERTY_NOT_FOUND',
          message: 'Property not found or not available',
          messageAr: 'العقار غير موجود أو غير متاح',
        },
      });
    }

    return property;
  }

  /**
   * إنشاء طلب معاينة (بدون مصادقة)
   * - يُنشئ Client جديد إذا لم يكن موجوداً
   * - يُنشئ Lead جديد
   * - يُنشئ Viewing Request
   * - يُرسل إشعار للـ Admins
   */
  async createViewingRequest(dto: CreateViewingRequestDto) {
    // التحقق من العقار
    const property = await this.prisma.property.findFirst({
      where: {
        id: dto.propertyId,
        deletedAt: null,
      },
      include: {
        organization: {
          select: { id: true, name: true },
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

    const organizationId = property.organizationId;

    // البحث عن العميل أو إنشاؤه
    let client = await this.prisma.client.findFirst({
      where: {
        organizationId,
        phone: dto.phone,
        deletedAt: null,
      },
    });

    if (!client) {
      // تقسيم الاسم
      const nameParts = dto.name.trim().split(/\s+/);
      const firstName = nameParts[0] || 'عميل';
      const lastName = nameParts.slice(1).join(' ') || '';

      client = await this.prisma.client.create({
        data: {
          organizationId,
          firstName,
          lastName,
          firstNameAr: dto.name,
          lastNameAr: '',
          phone: dto.phone,
          email: dto.email,
          source: 'customer_portal',
          notes: `تم التسجيل من بوابة العملاء - طلب معاينة عقار: ${property.titleAr || property.title}`,
        },
      });

      this.logger.log(`Created new client: ${client.id}`);
    }

    // إنشاء Lead جديد
    const lead = await this.prisma.lead.create({
      data: {
        organizationId,
        clientId: client.id,
        stage: LeadStage.NEW,
        source: 'customer_portal',
        notes: dto.message
          ? `رسالة العميل: ${dto.message}${dto.preferredDate ? `\nالتاريخ المفضل: ${dto.preferredDate}` : ''}${dto.preferredTime ? `\nالوقت المفضل: ${dto.preferredTime}` : ''}`
          : undefined,
      },
    });

    this.logger.log(`Created new lead: ${lead.id}`);

    // إنشاء Activity للطلب
    const activity = await this.prisma.activity.create({
      data: {
        organizationId,
        entityType: 'lead',
        entityId: lead.id,
        activityType: 'viewing_request',
        title: 'طلب معاينة جديد',
        body: `طلب ${dto.name} (${dto.phone}) معاينة للعقار "${property.titleAr || property.title}"`,
        metadata: JSON.stringify({
          propertyId: dto.propertyId,
          propertyName: property.titleAr || property.title,
          clientName: dto.name,
          clientPhone: dto.phone,
          message: dto.message,
          preferredDate: dto.preferredDate,
          preferredTime: dto.preferredTime,
        }),
      },
    });

    // إرسال حدث للنظام
    this.eventEmitter.emit('viewing.request_created', {
      organizationId,
      leadId: lead.id,
      clientId: client.id,
      propertyId: dto.propertyId,
      activityId: activity.id,
      clientName: dto.name,
      clientPhone: dto.phone,
      message: dto.message,
    });

    // إرسال إشعار للمدراء
    await this.notifyAdmins(organizationId, {
      leadId: lead.id,
      propertyId: dto.propertyId,
      propertyName: property.titleAr || property.title,
      clientName: dto.name,
      clientPhone: dto.phone,
    });

    return {
      success: true,
      requestId: lead.id,
      message: 'Your viewing request has been submitted successfully. We will contact you soon.',
      messageAr: 'تم إرسال طلبك بنجاح. سنتواصل معك قريباً.',
    };
  }

  /**
   * الحصول على بيانات العميل برقم الهاتف
   * ⚠️ SECURITY: Returns full client data (for authenticated use)
   */
  async getClientByPhone(phone: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        phone,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        firstNameAr: true,
        lastNameAr: true,
        phone: true,
        email: true,
        isVip: true,
      },
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

    return client;
  }

  /**
   * الحصول على بيانات العميل المحدودة برقم الهاتف
   * ⚠️ SECURITY: Returns MINIMAL data only - prevents data enumeration
   * Used for public endpoints without authentication
   */
  async getClientByPhoneLimited(phone: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        phone,
        deletedAt: null,
      },
      select: {
        // Only return non-sensitive, necessary data
        id: true,
        firstName: true,
        lastName: true,
        // DO NOT return: email, isVip, notes, or any sensitive data
      },
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

    // Return minimal data
    return {
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      exists: true,
    };
  }

  /**
   * الحصول على بيانات العميل الكاملة (معاينات، صفقات، مدفوعات)
   */
  async getClientData(phone: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        phone,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        firstNameAr: true,
        lastNameAr: true,
        phone: true,
        email: true,
        leads: {
          where: { deletedAt: null },
          select: {
            id: true,
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
                    titleAr: true,
                    city: true,
                    district: true,
                    areaM2: true,
                    bedrooms: true,
                    bathrooms: true,
                    askingPrice: true,
                    currency: true,
                    images: {
                      select: { url: true, isPrimary: true },
                      where: { isPrimary: true },
                      take: 1,
                    },
                  },
                },
              },
              orderBy: { scheduledAt: 'desc' },
              take: 20,
            },
          },
        },
        deals: {
          where: { deletedAt: null },
          select: {
            id: true,
            stage: true,
            agreedPrice: true,
            currency: true,
            createdAt: true,
            property: {
              select: {
                id: true,
                title: true,
                titleAr: true,
                city: true,
                district: true,
                areaM2: true,
                bedrooms: true,
                bathrooms: true,
                askingPrice: true,
                currency: true,
                images: {
                  select: { url: true, isPrimary: true },
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
            paymentSchedule: {
              select: {
                installments: {
                  select: {
                    id: true,
                    amount: true,
                    currency: true,
                    dueDate: true,
                    status: true,
                    payments: {
                      select: {
                        id: true,
                        paidAt: true,
                        status: true,
                      },
                    },
                  },
                  orderBy: { dueDate: 'asc' },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
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

    // تجميع المعاينات
    const viewings = client.leads.flatMap((lead: any) => lead.viewings);

    // تجميع المدفوعات من الصفقات
    const payments = client.deals.flatMap((deal: any) =>
      (deal.paymentSchedule?.installments || []).map((inst: any) => ({
        id: inst.id,
        amount: inst.amount,
        currency: inst.currency,
        dueDate: inst.dueDate,
        status: inst.status,
        paidAt: inst.payments?.[0]?.paidAt,
      }))
    );

    return {
      name: `${client.firstNameAr || client.firstName} ${client.lastNameAr || client.lastName}`,
      phone: client.phone,
      email: client.email,
      viewings,
      deals: client.deals,
      payments,
    };
  }

  /**
   * تأكيد حضور المعاينة
   */
  async confirmViewing(viewingId: string, dto: ConfirmViewingDto) {
    const viewing = await this.prisma.viewing.findFirst({
      where: { id: viewingId },
      include: {
        lead: {
          include: { client: true },
        },
      },
    });

    if (!viewing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'VIEWING_NOT_FOUND',
          message: 'Viewing not found',
          messageAr: 'المعاينة غير موجودة',
        },
      });
    }

    // التحقق من رقم الهاتف
    if (viewing.lead?.client?.phone !== dto.phone) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PHONE_MISMATCH',
          message: 'Phone number does not match',
          messageAr: 'رقم الهاتف غير مطابق',
        },
      });
    }

    // تحديث حالة المعاينة (إضافة ملاحظة تأكيد)
    await this.prisma.viewing.update({
      where: { id: viewingId },
      data: {
        notes: viewing.notes
          ? `${viewing.notes}\nتم تأكيد الحضور من العميل`
          : 'تم تأكيد الحضور من العميل',
      },
    });

    // إرسال حدث
    this.eventEmitter.emit('viewing.confirmed_by_client', {
      organizationId: viewing.organizationId,
      viewingId,
    });

    return { success: true };
  }

  /**
   * إرسال إشعار للمدراء بطلب جديد
   */
  private async notifyAdmins(
    organizationId: string,
    data: {
      leadId: string;
      propertyId: string;
      propertyName: string;
      clientName: string;
      clientPhone: string;
    },
  ) {
    // الحصول على المستخدمين الذين يجب إشعارهم
    const admins = await this.prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { in: ['OWNER', 'GENERAL_MANAGER', 'SALES_MANAGER'] },
      },
      select: { id: true },
    });

    // إنشاء إشعارات
    for (const admin of admins) {
      await this.prisma.notification.create({
        data: {
          organizationId,
          userId: admin.id,
          type: 'new_viewing_request',
          title: 'طلب معاينة جديد',
          body: `${data.clientName} (${data.clientPhone}) طلب معاينة للعقار "${data.propertyName}"`,
          data: JSON.stringify({
            leadId: data.leadId,
            propertyId: data.propertyId,
          }),
        },
      });
    }

    this.logger.log(`Notified ${admins.length} admins about new viewing request`);
  }
}
