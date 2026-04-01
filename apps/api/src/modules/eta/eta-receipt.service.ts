// ═══════════════════════════════════════════════════════════════
// ETA Receipt Service - خدمة إدارة الإيصالات
// Professional Receipt v1.2
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ETAAuthService } from './eta-auth.service';
import { ETAUuidService } from './eta-uuid.service';
import { ETASignerService } from './eta-signer.service';
import {
  CreateETAReceiptDto,
  ETAReceiptResponseDto,
  GetETAReceiptsDto,
  ProfessionalReceiptDto,
  ReceiptSubmissionDto,
  SubmissionResponseDto,
  ETAReceiptStatsDto,
  ETAReceiptStatus,
  BuyerType,
  ReceiptItemDto,
  RetryReceiptDto,
} from './dto/eta.dto';

@Injectable()
export class ETAReceiptService {
  private readonly logger = new Logger(ETAReceiptService.name);

  // الحد الأدنى لاشتراط الرقم القومي (150,000 جنيه)
  private readonly NATIONAL_ID_THRESHOLD = 150000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: ETAAuthService,
    private readonly uuidService: ETAUuidService,
    private readonly signerService: ETASignerService,
  ) {}

  /**
   * إنشاء إيصال جديد وإرساله لـ ETA
   */
  async createReceipt(
    organizationId: string,
    userId: string,
    dto: CreateETAReceiptDto,
  ): Promise<ETAReceiptResponseDto> {
    // 1. الحصول على بيانات الدفعة
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: dto.paymentId,
        organizationId,
      },
      include: {
        installment: {
          include: {
            paymentSchedule: {
              include: {
                deal: {
                  include: {
                    client: true,
                    property: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException({
        message: 'Payment not found',
        messageAr: 'الدفعة غير موجودة',
      });
    }

    // 2. التحقق من عدم وجود إيصال سابق
    const existingReceipt = await this.prisma.eTAReceipt.findFirst({
      where: {
        paymentId: dto.paymentId,
        status: { not: ETAReceiptStatus.CANCELLED },
      },
    });

    if (existingReceipt) {
      throw new BadRequestException({
        message: 'Receipt already exists for this payment',
        messageAr: 'يوجد إيصال سابق لهذه الدفعة',
        receiptId: existingReceipt.id,
      });
    }

    // 3. الحصول على جهاز POS
    const posDevice = await this.prisma.posDevice.findFirst({
      where: {
        id: dto.posDeviceId,
        organizationId,
        status: 'ACTIVE',
      },
    });

    if (!posDevice) {
      throw new NotFoundException({
        message: 'POS device not found or inactive',
        messageAr: 'جهاز POS غير موجود أو غير نشط',
      });
    }

    // 4. الحصول على بيانات المؤسسة
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId },
      include: { branches: true },
    });

    if (!organization?.taxId) {
      throw new BadRequestException({
        message: 'Organization tax ID (RIN) not configured',
        messageAr: 'الرقم الضريبي للمؤسسة غير مُعدّ',
      });
    }

    // 5. الحصول على UUID الإيصال السابق من نفس الـ POS
    const previousReceipt = await this.prisma.eTAReceipt.findFirst({
      where: {
        posDeviceId: dto.posDeviceId,
        status: ETAReceiptStatus.VALID,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 6. بناء الإيصال
    const receipt = await this.buildReceipt({
      organization,
      payment,
      posDeviceId: dto.posDeviceId,
      serviceDescription: dto.serviceDescription,
      netAmount: dto.netAmount,
      taxRate: dto.taxRate ?? 14,
      remarks: dto.remarks,
      previousUUID: previousReceipt?.documentUUID || null,
    });

    // 7. حساب UUID
    const uuid = this.uuidService.generateUUID(receipt);
    receipt.uuid = uuid;

    // 8. تخزين الإيصال في قاعدة البيانات
    const etaReceipt = await this.prisma.eTAReceipt.create({
      data: {
        organizationId,
        paymentId: dto.paymentId,
        posDeviceId: dto.posDeviceId,
        documentUUID: uuid,
        previousUUID: receipt.previousUUID || null,
        internalId: receipt.internalId,
        status: ETAReceiptStatus.PENDING,
        receiptType: 'professional',
        documentVersion: '1.2',
        receiptPayload: JSON.stringify(receipt),
      },
    });

    // 9. إرسال الإيصال لـ ETA (في الخلفية أو مباشرة)
    try {
      const submissionResult = await this.submitReceipt(receipt);

      // تحديث الإيصال بالنتيجة
      if (submissionResult.acceptedDocuments.length > 0) {
        const accepted = submissionResult.acceptedDocuments[0];
        await this.prisma.eTAReceipt.update({
          where: { id: etaReceipt.id },
          data: {
            submissionUUID: submissionResult.submissionUUID,
            longId: accepted.longId,
            status: ETAReceiptStatus.VALID,
            submittedAt: new Date(),
            processedAt: new Date(),
            etaResponse: JSON.stringify(submissionResult),
            qrCodeData: this.generateQRCodeData(receipt, organization.taxId),
          },
        });

        return {
          id: etaReceipt.id,
          documentUUID: uuid,
          status: ETAReceiptStatus.VALID,
          submissionUUID: submissionResult.submissionUUID,
          longId: accepted.longId,
          internalId: receipt.internalId,
          qrCodeData: this.generateQRCodeData(receipt, organization.taxId),
          createdAt: etaReceipt.createdAt.toISOString(),
        };
      } else if (submissionResult.rejectedDocuments.length > 0) {
        const rejected = submissionResult.rejectedDocuments[0];
        await this.prisma.eTAReceipt.update({
          where: { id: etaReceipt.id },
          data: {
            submissionUUID: submissionResult.submissionUUID,
            status: ETAReceiptStatus.INVALID,
            etaResponse: JSON.stringify(submissionResult),
            lastError: rejected.error.message,
            processedAt: new Date(),
          },
        });

        return {
          id: etaReceipt.id,
          documentUUID: uuid,
          status: ETAReceiptStatus.INVALID,
          submissionUUID: submissionResult.submissionUUID,
          lastError: rejected.error.message,
          createdAt: etaReceipt.createdAt.toISOString(),
        };
      }
    } catch (error) {
      // في حالة فشل الإرسال
      this.logger.error(`Failed to submit receipt: ${error.message}`);
      await this.prisma.eTAReceipt.update({
        where: { id: etaReceipt.id },
        data: {
          status: ETAReceiptStatus.QUEUED_FOR_RETRY,
          lastError: error.message,
          retryCount: { increment: 1 },
        },
      });

      return {
        id: etaReceipt.id,
        documentUUID: uuid,
        status: ETAReceiptStatus.QUEUED_FOR_RETRY,
        lastError: error.message,
        createdAt: etaReceipt.createdAt.toISOString(),
      };
    }

    return {
      id: etaReceipt.id,
      documentUUID: uuid,
      status: ETAReceiptStatus.PENDING,
      createdAt: etaReceipt.createdAt.toISOString(),
    };
  }

  /**
   * بناء الإيصال Professional Receipt v1.2
   */
  private async buildReceipt(params: {
    organization: any;
    payment: any;
    posDeviceId: string;
    serviceDescription: string;
    netAmount: number;
    taxRate: number;
    remarks?: string;
    previousUUID: string | null;
  }): Promise<ProfessionalReceiptDto> {
    const {
      organization,
      payment,
      serviceDescription,
      netAmount,
      taxRate,
      remarks,
      previousUUID,
    } = params;

    // حساب الضريبة والمبلغ الإجمالي
    const taxAmount = netAmount * (taxRate / 100);
    const totalAmount = netAmount + taxAmount;

    // الحصول على بيانات العميل
    const client = payment.installment?.paymentSchedule?.deal?.client;
    const isPerson = !client?.clientType || client?.clientType === 'individual';

    // تحقق من اشتراط الرقم القومي
    const nationalIdRequired = totalAmount >= this.NATIONAL_ID_THRESHOLD && isPerson;

    // إنشاء البند
    const item: ReceiptItemDto = {
      internalCode: 'brokerage_services',
      description: serviceDescription,
      taxType: 'VAT',
      taxRate: taxRate,
      quantity: 1,
      unitPrice: netAmount,
      discount: 0,
      netAmount: netAmount,
      taxAmount: taxAmount,
      totalAmount: totalAmount,
    };

    // بناء الإيصال
    const receipt: ProfessionalReceiptDto = {
      uuid: '', // سيتم حسابه لاحقاً
      documentType: 'R', // Receipt
      documentTypeVersion: '1.2',
      previousUUID: previousUUID || undefined,
      internalId: `REC-${Date.now()}`,
      issuanceDateTime: new Date().toISOString(),
      issuer: {
        id: organization.taxId,
        name: organization.name,
        type: 'B', // شخص اعتباري
        branchId: organization.branches[0]?.etaBranchCode,
      },
      receiver: {
        type: isPerson ? BuyerType.P : BuyerType.B,
        id: client?.taxId || undefined,
        name: client
          ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
          : undefined,
        nationalId: nationalIdRequired ? client?.nationalId : undefined,
        phone: client?.phone,
        email: client?.email,
      },
      items: [item],
      totalDiscountAmount: 0,
      totalNetAmount: netAmount,
      totalTaxAmount: taxAmount,
      totalAmount: totalAmount,
      remarks: remarks,
    };

    return receipt;
  }

  /**
   * إرسال الإيصال إلى ETA
   */
  async submitReceipt(receipt: ProfessionalReceiptDto): Promise<SubmissionResponseDto> {
    const token = await this.authService.getToken();
    const apiUrl = this.authService.getApiUrl();

    // توقيع الإيصال
    const signature = await this.signerService.signReceipt(receipt);

    // بناء الطلب
    const payload: ReceiptSubmissionDto = {
      receipts: [receipt],
      signatures: [signature],
    };

    // إرسال الطلب
    const response = await fetch(`${apiUrl}/api/v1/receiptsubmissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      // انتهت صلاحية التوكن - إعادة المحاولة
      await this.authService.invalidateToken();
      const newToken = await this.authService.getToken();

      const retryResponse = await fetch(`${apiUrl}/api/v1/receiptsubmissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${newToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.text();
        throw new Error(`ETA submission failed after re-auth: ${error}`);
      }

      return retryResponse.json();
    }

    if (response.status === 422) {
      // Duplicate submission - انتظر Retry-After
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Duplicate submission. Retry after ${retryAfter || 'unknown'} seconds`);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ETA submission failed: ${response.status} - ${error}`);
    }

    // 202 Accepted
    return response.json();
  }

  /**
   * توليد بيانات QR Code
   * Format: {URL}#Total:{Total},IssuerRIN:{RIN}
   */
  private generateQRCodeData(receipt: ProfessionalReceiptDto, rin: string): string {
    const portalUrl = this.authService.getPortalUrl();
    const uuid = receipt.uuid;
    const dateTime = encodeURIComponent(receipt.issuanceDateTime);

    const url = `${portalUrl}/receipts/search/${uuid}/share/${dateTime}`;
    const total = receipt.totalAmount.toFixed(3);

    return `${url}#Total:${total},IssuerRIN:${rin}`;
  }

  /**
   * الحصول على إيصال بالمعرف
   */
  async getReceipt(organizationId: string, receiptId: string): Promise<ETAReceiptResponseDto> {
    const receipt = await this.prisma.eTAReceipt.findFirst({
      where: {
        id: receiptId,
        organizationId,
      },
    });

    if (!receipt) {
      throw new NotFoundException({
        message: 'Receipt not found',
        messageAr: 'الإيصال غير موجود',
      });
    }

    return {
      id: receipt.id,
      documentUUID: receipt.documentUUID || '',
      status: receipt.status as ETAReceiptStatus,
      submissionUUID: receipt.submissionUUID || undefined,
      longId: receipt.longId || undefined,
      internalId: receipt.internalId,
      qrCodeData: receipt.qrCodeData || undefined,
      lastError: receipt.lastError || undefined,
      createdAt: receipt.createdAt.toISOString(),
    };
  }

  /**
   * قائمة الإيصالات مع الفلترة
   */
  async getReceipts(
    organizationId: string,
    dto: GetETAReceiptsDto,
  ): Promise<{ data: ETAReceiptResponseDto[]; total: number }> {
    const { page = 1, limit = 20, status, startDate, endDate, posDeviceId } = dto;

    const where: any = { organizationId };

    if (status) {
      where.status = status;
    }

    if (posDeviceId) {
      where.posDeviceId = posDeviceId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [receipts, total] = await Promise.all([
      this.prisma.eTAReceipt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.eTAReceipt.count({ where }),
    ]);

    return {
      data: receipts.map((r) => ({
        id: r.id,
        documentUUID: r.documentUUID || '',
        status: r.status as ETAReceiptStatus,
        submissionUUID: r.submissionUUID || undefined,
        longId: r.longId || undefined,
        internalId: r.internalId,
        qrCodeData: r.qrCodeData || undefined,
        lastError: r.lastError || undefined,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
    };
  }

  /**
   * إحصائيات الإيصالات
   */
  async getStats(organizationId: string): Promise<ETAReceiptStatsDto> {
    const receipts = await this.prisma.eTAReceipt.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
      _sum: {
        // لا يمكن جمع الحقول من JSON
      },
    });

    // حساب المجاميع من payload
    const allReceipts = await this.prisma.eTAReceipt.findMany({
      where: { organizationId, status: ETAReceiptStatus.VALID },
      select: { receiptPayload: true },
    });

    let totalAmount = 0;
    let totalTaxAmount = 0;

    for (const r of allReceipts) {
      try {
        const payload = JSON.parse(r.receiptPayload) as ProfessionalReceiptDto;
        totalAmount += payload.totalAmount;
        totalTaxAmount += payload.totalTaxAmount;
      } catch {}
    }

    const stats: ETAReceiptStatsDto = {
      total: 0,
      valid: 0,
      invalid: 0,
      pending: 0,
      queuedForRetry: 0,
      totalAmount,
      totalTaxAmount,
    };

    for (const r of receipts) {
      stats.total += r._count;
      switch (r.status) {
        case ETAReceiptStatus.VALID:
          stats.valid = r._count;
          break;
        case ETAReceiptStatus.INVALID:
          stats.invalid = r._count;
          break;
        case ETAReceiptStatus.PENDING:
          stats.pending = r._count;
          break;
        case ETAReceiptStatus.QUEUED_FOR_RETRY:
          stats.queuedForRetry = r._count;
          break;
      }
    }

    return stats;
  }

  /**
   * إعادة محاولة إرسال إيصال فاشل
   */
  async retryReceipt(
    organizationId: string,
    receiptId: string,
    dto: RetryReceiptDto,
  ): Promise<ETAReceiptResponseDto> {
    const receipt = await this.prisma.eTAReceipt.findFirst({
      where: {
        id: receiptId,
        organizationId,
        status: { in: [ETAReceiptStatus.QUEUED_FOR_RETRY, ETAReceiptStatus.INVALID] },
      },
    });

    if (!receipt) {
      throw new NotFoundException({
        message: 'Receipt not found or cannot be retried',
        messageAr: 'الإيصال غير موجود أو لا يمكن إعادة محاولته',
      });
    }

    // تحميل payload
    const payload = JSON.parse(receipt.receiptPayload) as ProfessionalReceiptDto;

    // إعادة حساب UUID إذا تغير المحتوى
    const { uuid, ...receiptWithoutUuid } = payload;
    const newUuid = this.uuidService.generateUUID(receiptWithoutUuid);
    payload.uuid = newUuid;

    try {
      const submissionResult = await this.submitReceipt(payload);

      if (submissionResult.acceptedDocuments.length > 0) {
        const accepted = submissionResult.acceptedDocuments[0];
        await this.prisma.eTAReceipt.update({
          where: { id: receipt.id },
          data: {
            documentUUID: newUuid,
            submissionUUID: submissionResult.submissionUUID,
            longId: accepted.longId,
            status: ETAReceiptStatus.VALID,
            submittedAt: new Date(),
            processedAt: new Date(),
            etaResponse: JSON.stringify(submissionResult),
            lastError: null,
            receiptPayload: JSON.stringify(payload),
          },
        });

        return {
          id: receipt.id,
          documentUUID: newUuid,
          status: ETAReceiptStatus.VALID,
          submissionUUID: submissionResult.submissionUUID,
          longId: accepted.longId,
          createdAt: receipt.createdAt.toISOString(),
        };
      } else {
        const rejected = submissionResult.rejectedDocuments[0];
        await this.prisma.eTAReceipt.update({
          where: { id: receipt.id },
          data: {
            status: ETAReceiptStatus.INVALID,
            lastError: rejected.error.message,
            retryCount: { increment: 1 },
            etaResponse: JSON.stringify(submissionResult),
          },
        });

        return {
          id: receipt.id,
          documentUUID: newUuid,
          status: ETAReceiptStatus.INVALID,
          lastError: rejected.error.message,
          createdAt: receipt.createdAt.toISOString(),
        };
      }
    } catch (error) {
      await this.prisma.eTAReceipt.update({
        where: { id: receipt.id },
        data: {
          status: ETAReceiptStatus.QUEUED_FOR_RETRY,
          lastError: error.message,
          retryCount: { increment: 1 },
        },
      });

      return {
        id: receipt.id,
        documentUUID: newUuid,
        status: ETAReceiptStatus.QUEUED_FOR_RETRY,
        lastError: error.message,
        createdAt: receipt.createdAt.toISOString(),
      };
    }
  }

  /**
   * الحصول على بيانات QR Code للإيصال
   * Format: {URL}#Total:{Total},IssuerRIN:{RIN}
   */
  async getReceiptQRData(
    organizationId: string,
    receiptId: string,
  ): Promise<{
    qrCodeData: string;
    url: string;
    total: number;
    issuerRIN: string;
  }> {
    const receipt = await this.prisma.eTAReceipt.findFirst({
      where: {
        id: receiptId,
        organizationId,
        status: ETAReceiptStatus.VALID,
      },
    });

    if (!receipt) {
      throw new NotFoundException({
        message: 'Valid receipt not found',
        messageAr: 'الإيصال الصالح غير موجود',
      });
    }

    // تحميل payload
    const payload = JSON.parse(receipt.receiptPayload) as ProfessionalReceiptDto;

    // الحصول على RIN من المؤسسة
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId },
    });

    const rin = organization?.taxId || payload.issuer.id;
    const portalUrl = this.authService.getPortalUrl();
    const uuid = receipt.documentUUID || payload.uuid;
    const dateTime = encodeURIComponent(payload.issuanceDateTime);

    const url = `${portalUrl}/receipts/search/${uuid}/share/${dateTime}`;
    const total = payload.totalAmount;
    const qrCodeData = `${url}#Total:${total.toFixed(3)},IssuerRIN:${rin}`;

    return {
      qrCodeData,
      url,
      total,
      issuerRIN: rin,
    };
  }
}
