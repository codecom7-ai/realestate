// ═══════════════════════════════════════════════════════════════
// Contracts Service - خدمة إدارة العقود
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
  CreateContractDto,
  UpdateContractDto,
  SignContractDto,
  LinkDocumentDto,
  GetContractsDto,
  SignatureStatus,
} from './dto/contracts.dto';
import { DealStage } from '@realestate/shared-types';

@Injectable()
export class ContractsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
  ) {}

  /**
   * توليد رقم العقد
   */
  private async generateContractNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // الحصول على عدد العقود هذا الشهر
    const count = await this.prisma.contract.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(year, new Date().getMonth(), 1),
          lt: new Date(year, new Date().getMonth() + 1, 1),
        },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `CTR-${year}${month}-${sequence}`;
  }

  /**
   * الحصول على حالة التوقيع
   */
  private getSignatureStatus(
    signedByClient: boolean,
    signedByOffice: boolean,
  ): SignatureStatus {
    if (signedByClient && signedByOffice) {
      return SignatureStatus.FULLY_SIGNED;
    }
    if (signedByClient) {
      return SignatureStatus.CLIENT_SIGNED;
    }
    if (signedByOffice) {
      return SignatureStatus.OFFICE_SIGNED;
    }
    return SignatureStatus.PENDING;
  }

  /**
   * إنشاء عقد جديد
   */
  async create(
    dto: CreateContractDto,
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

    // التحقق من عدم وجود عقد سابق
    const existingContract = await this.prisma.contract.findFirst({
      where: { dealId: dto.dealId },
    });

    if (existingContract) {
      throw new ConflictException({
        success: false,
        error: {
          code: 'CONTRACT_ALREADY_EXISTS',
          message: 'Deal already has a contract',
          messageAr: 'الصفقة لها عقد سابق',
        },
      });
    }

    // التحقق من مرحلة الصفقة
    if (
      deal.stage !== DealStage.RESERVATION &&
      deal.stage !== DealStage.CONTRACT_PREPARATION &&
      deal.stage !== DealStage.NEGOTIATION
    ) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STAGE_FOR_CONTRACT',
          message: 'Contract can only be created from RESERVATION or CONTRACT_PREPARATION stage',
          messageAr: 'يمكن إنشاء العقد فقط من مرحلة الحجز أو إعداد العقد',
        },
      });
    }

    // توليد رقم العقد
    const contractNumber = dto.contractNumber || await this.generateContractNumber(organizationId);

    // إنشاء العقد وتحديث مرحلة الصفقة
    const contract = await this.prisma.$transaction(async (tx) => {
      const newContract = await tx.contract.create({
        data: {
          dealId: dto.dealId,
          organizationId,
          contractNumber,
          contractDate: dto.contractDate ? new Date(dto.contractDate) : new Date(),
          fileUrl: dto.fileUrl,
          notes: dto.notes,
          signedByClient: false,
          signedByOffice: false,
        },
      });

      // تحديث مرحلة الصفقة
      await tx.deal.update({
        where: { id: dto.dealId },
        data: { stage: DealStage.CONTRACT_PREPARATION, updatedAt: new Date() },
      });

      return newContract;
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'CONTRACT_CREATED',
      entityType: 'contract',
      entityId: contract.id,
      newValue: {
        dealId: dto.dealId,
        contractNumber,
      },
    });

    // إرسال حدث
    this.eventEmitter.emit('contract.created', {
      type: 'contract.created',
      entityId: contract.id,
      entityType: 'contract',
      data: { contract, dealId: dto.dealId },
      timestamp: new Date(),
      userId,
    });

    return contract;
  }

  /**
   * الحصول على عقد بالمعرف
   */
  async findOne(id: string, organizationId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, organizationId },
      include: {
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
                email: true,
              },
            },
            property: {
              select: {
                id: true,
                title: true,
                city: true,
                district: true,
                address: true,
              },
            },
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found',
          messageAr: 'العقد غير موجود',
        },
      });
    }

    return {
      ...contract,
      signatureStatus: this.getSignatureStatus(contract.signedByClient, contract.signedByOffice),
    };
  }

  /**
   * الحصول على عقد صفقة معينة
   */
  async getByDeal(dealId: string, organizationId: string) {
    const contract = await this.prisma.contract.findFirst({
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

    if (!contract) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'No contract found for this deal',
          messageAr: 'لا يوجد عقد لهذه الصفقة',
        },
      });
    }

    return {
      ...contract,
      signatureStatus: this.getSignatureStatus(contract.signedByClient, contract.signedByOffice),
    };
  }

  /**
   * الحصول على جميع العقود
   */
  async findAll(organizationId: string, options: GetContractsDto = {}) {
    const {
      dealId,
      signatureStatus,
      search,
      page = 1,
      limit = 20,
    } = options;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (dealId) where.dealId = dealId;

    // فلترة حسب حالة التوقيع
    if (signatureStatus) {
      switch (signatureStatus) {
        case SignatureStatus.PENDING:
          where.signedByClient = false;
          where.signedByOffice = false;
          break;
        case SignatureStatus.CLIENT_SIGNED:
          where.signedByClient = true;
          where.signedByOffice = false;
          break;
        case SignatureStatus.OFFICE_SIGNED:
          where.signedByClient = false;
          where.signedByOffice = true;
          break;
        case SignatureStatus.FULLY_SIGNED:
          where.signedByClient = true;
          where.signedByOffice = true;
          break;
      }
    }

    if (search) {
      where.OR = [
        { contractNumber: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const [contracts, total] = await Promise.all([
      this.prisma.contract.findMany({
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
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      data: contracts.map((c) => ({
        ...c,
        signatureStatus: this.getSignatureStatus(c.signedByClient, c.signedByOffice),
      })),
      meta: {
        total,
        page,
        limit,
        hasMore: skip + contracts.length < total,
      },
    };
  }

  /**
   * تحديث عقد
   */
  async update(
    id: string,
    dto: UpdateContractDto,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.contract.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found',
          messageAr: 'العقد غير موجود',
        },
      });
    }

    const updateData: any = { updatedAt: new Date() };

    if (dto.contractNumber !== undefined) updateData.contractNumber = dto.contractNumber;
    if (dto.contractDate !== undefined) updateData.contractDate = new Date(dto.contractDate);
    if (dto.fileUrl !== undefined) updateData.fileUrl = dto.fileUrl;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const contract = await this.prisma.contract.update({
      where: { id },
      data: updateData,
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'CONTRACT_UPDATED',
      entityType: 'contract',
      entityId: id,
      newValue: updateData,
    });

    return {
      ...contract,
      signatureStatus: this.getSignatureStatus(contract.signedByClient, contract.signedByOffice),
    };
  }

  /**
   * توقيع العقد
   */
  async markSigned(
    id: string,
    dto: SignContractDto,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.contract.findFirst({
      where: { id, organizationId },
      include: { deal: true },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found',
          messageAr: 'العقد غير موجود',
        },
      });
    }

    // التحقق من عدم التوقيع المسبق
    if (dto.signedBy === 'client' && existing.signedByClient) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ALREADY_SIGNED_BY_CLIENT',
          message: 'Contract is already signed by client',
          messageAr: 'العقد موقّع مسبقاً من العميل',
        },
      });
    }

    if (dto.signedBy === 'office' && existing.signedByOffice) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ALREADY_SIGNED_BY_OFFICE',
          message: 'Contract is already signed by office',
          messageAr: 'العقد موقّع مسبقاً من المكتب',
        },
      });
    }

    const signedAt = dto.signedAt ? new Date(dto.signedAt) : new Date();

    // تحديث العقد ومرحلة الصفقة
    const contract = await this.prisma.$transaction(async (tx) => {
      const updateData: any = {
        updatedAt: new Date(),
        signedAt,
      };

      if (dto.signedBy === 'client') {
        updateData.signedByClient = true;
      } else {
        updateData.signedByOffice = true;
      }

      const updated = await tx.contract.update({
        where: { id },
        data: updateData,
      });

      // إذا تم التوقيع من الطرفين، تحديث مرحلة الصفقة
      const newSignedByClient = dto.signedBy === 'client' ? true : existing.signedByClient;
      const newSignedByOffice = dto.signedBy === 'office' ? true : existing.signedByOffice;

      if (newSignedByClient && newSignedByOffice) {
        await tx.deal.update({
          where: { id: existing.dealId },
          data: { stage: DealStage.CONTRACT_SIGNED, updatedAt: new Date() },
        });
      }

      return updated;
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'CONTRACT_SIGNED',
      entityType: 'contract',
      entityId: id,
      newValue: {
        signedBy: dto.signedBy,
        signedAt,
      },
    });

    // إرسال حدث
    this.eventEmitter.emit('contract.signed', {
      type: 'contract.signed',
      entityId: id,
      entityType: 'contract',
      data: {
        dealId: existing.dealId,
        signedBy: dto.signedBy,
        signedAt,
        fullySigned: contract.signedByClient && contract.signedByOffice,
      },
      timestamp: new Date(),
      userId,
    });

    return {
      ...contract,
      signatureStatus: this.getSignatureStatus(contract.signedByClient, contract.signedByOffice),
    };
  }

  /**
   * ربط مستند بالعقد
   */
  async linkDocument(
    id: string,
    dto: LinkDocumentDto,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.contract.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found',
          messageAr: 'العقد غير موجود',
        },
      });
    }

    const contract = await this.prisma.contract.update({
      where: { id },
      data: {
        fileUrl: dto.fileUrl,
        updatedAt: new Date(),
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      userId,
      action: 'CONTRACT_DOCUMENT_LINKED',
      entityType: 'contract',
      entityId: id,
      newValue: { fileUrl: dto.fileUrl, fileName: dto.fileName },
    });

    return contract;
  }
}
