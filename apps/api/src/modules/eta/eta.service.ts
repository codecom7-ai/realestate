// @ts-nocheck
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateETAReceiptDto,
  GetETAReceiptsDto,
  CancelETAReceiptDto,
  RegisterPOSDeviceDto,
  ActivatePOSDeviceDto,
  ETAReceiptStatus,
  BuyerType,
} from './dto/eta.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash, createSign } from 'crypto';
import axios from 'axios';

const ETA_TOKEN_CACHE_PREFIX = 'eta:token:';
const TOKEN_TTL_SECONDS = 3300; // أقل من 3600 بقليل لتجنب مشاكل التوقيت

@Injectable()
export class ETAService {
  private readonly identityUrl: string;
  private readonly apiUrl: string;

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private eventEmitter: EventEmitter2,
    private config: ConfigService,
  ) {
    this.identityUrl = this.config.get('ETA_IDENTITY_URL', 'https://id.preprod.eta.gov.eg');
    this.apiUrl = this.config.get('ETA_API_URL', 'https://api.preprod.invoicing.eta.gov.eg');
  }

  // ═════════════════════════════════════════════════════════════════
  // POS DEVICE MANAGEMENT
  // ═════════════════════════════════════════════════════════════════

  async registerDevice(organizationId: string, userId: string, dto: RegisterPOSDeviceDto) {
    // التحقق من عدم وجود جهاز بنفس الرقم التسلسلي
    const existing = await this.prisma.posDevice.findFirst({
      where: { organizationId, posSerial: dto.posSerial },
    });

    if (existing) {
      throw new ConflictException({
        code: 'POS_SERIAL_EXISTS',
        message: 'POS device with this serial already exists',
        messageAr: 'جهاز POS بهذا الرقم التسلسلي موجود بالفعل',
      });
    }

    const device = await this.prisma.posDevice.create({
      data: {
        organizationId,
        branchId: dto.branchId || organizationId, // Use organization ID as default if no branch specified
        assignedToUserId: dto.assignedToUserId,
        posSerial: dto.posSerial,
        posOsVersion: dto.posOsVersion,
        posModelFramework: dto.posModelFramework,
        deviceName: dto.deviceName,
        deviceModel: dto.deviceModel,
        status: 'INACTIVE',
      },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'pos_device.registered',
      entityType: 'pos_device',
      entityId: device.id,
      newValue: device,
    });

    return device;
  }

  async activateDevice(
    organizationId: string,
    userId: string,
    deviceId: string,
    dto: ActivatePOSDeviceDto,
  ) {
    const device = await this.prisma.posDevice.findFirst({
      where: { id: deviceId, organizationId },
    });

    if (!device) {
      throw new NotFoundException({
        code: 'POS_DEVICE_NOT_FOUND',
        message: 'POS device not found',
        messageAr: 'جهاز POS غير موجود',
      });
    }

    // محاولة الحصول على توكن للتحقق من صحة البيانات
    try {
      await this.getToken(device.posSerial, device.posOsVersion, device.posModelFramework, dto);
    } catch (error) {
      throw new BadRequestException({
        code: 'ETA_AUTH_FAILED',
        message: 'Failed to authenticate with ETA',
        messageAr: 'فشل التوثيق مع ETA',
      });
    }

    // تحديث الجهاز
    const activated = await this.prisma.posDevice.update({
      where: { id: deviceId },
      data: {
        status: 'ACTIVE',
        // لا نخزن credentials في DB - تُقرأ من .env
      },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'pos_device.activated',
      entityType: 'pos_device',
      entityId: deviceId,
    });

    return activated;
  }

  async getDevices(organizationId: string) {
    return this.prisma.posDevice.findMany({
      where: { organizationId },
      include: {
        branch: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { etaReceipts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ═════════════════════════════════════════════════════════════════
  // RECEIPTS
  // ═════════════════════════════════════════════════════════════════

  async createReceipt(organizationId: string, userId: string, dto: CreateETAReceiptDto) {
    // التحقق من الدفعة
    const payment = await this.prisma.payment.findFirst({
      where: { id: dto.paymentId, organizationId },
    });

    if (!payment) {
      throw new NotFoundException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found',
        messageAr: 'الدفعة غير موجودة',
      });
    }

    // التحقق من عدم وجود إيصال سابق
    const existingReceipt = await this.prisma.eTAReceipt.findUnique({
      where: { paymentId: dto.paymentId },
    });

    if (existingReceipt) {
      throw new ConflictException({
        code: 'RECEIPT_EXISTS',
        message: 'Receipt already exists for this payment',
        messageAr: 'يوجد إيصال لهذه الدفعة بالفعل',
      });
    }

    // التحقق من جهاز POS
    const posDevice = await this.prisma.posDevice.findFirst({
      where: { id: dto.posDeviceId, organizationId },
    });

    if (!posDevice) {
      throw new NotFoundException({
        code: 'POS_DEVICE_NOT_FOUND',
        message: 'POS device not found',
        messageAr: 'جهاز POS غير موجود',
      });
    }

    if (posDevice.status !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'POS_NOT_ACTIVATED',
        message: 'POS device is not activated',
        messageAr: 'جهاز POS غير مفعّل',
      });
    }

    // حساب المبلغ الإجمالي
    const totalAmount = dto.items.reduce((sum, item) => sum + item.quantity * item.unitValueEGP, 0);

    // التحقق من الرقم القومي للمبالغ الكبيرة
    if (dto.buyerType === BuyerType.PERSON && totalAmount >= 150000 && !dto.buyerNationalId) {
      throw new BadRequestException({
        code: 'MISSING_NATIONAL_ID',
        message: 'National ID is required for amounts >= 150,000 EGP for individuals',
        messageAr: 'الرقم القومي مطلوب للمبالغ >= 150,000 جنيه للأشخاص الطبيعيين',
      });
    }

    // التحقق من اسم المشتري للأشخاص الاعتباريين
    if (dto.buyerType === BuyerType.BUSINESS && !dto.buyerName) {
      throw new BadRequestException({
        code: 'MISSING_BUYER_NAME',
        message: 'Buyer name is required for business buyers',
        messageAr: 'اسم المشتري مطلوب للأشخاص الاعتباريين',
      });
    }

    // بناء payload الإيصال
    const receiptPayload = this.buildReceiptPayload(dto, totalAmount, posDevice);

    // إنشاء الإيصال
    const receipt = await this.prisma.eTAReceipt.create({
      data: {
        organizationId,
        paymentId: dto.paymentId,
        posDeviceId: dto.posDeviceId,
        internalId: `REC-${Date.now()}`,
        status: ETAReceiptStatus.PENDING,
        receiptType: 'professional',
        documentVersion: '1.2',
        receiptPayload,
      },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'eta_receipt.created',
      entityType: 'eta_receipt',
      entityId: receipt.id,
      newValue: { totalAmount, buyerType: dto.buyerType },
    });

    // إرسال للـ queue
    this.eventEmitter.emit('eta_receipt.submitted', { receiptId: receipt.id, organizationId });

    return {
      receiptId: receipt.id,
      status: receipt.status,
    };
  }

  async getReceipts(organizationId: string, dto: GetETAReceiptsDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (dto.status) where.status = dto.status;
    if (dto.posDeviceId) where.posDeviceId = dto.posDeviceId;

    const [receipts, total] = await Promise.all([
      this.prisma.eTAReceipt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          payment: {
            include: {
              installment: { include: { paymentSchedule: { include: { deal: true } } } },
            },
          },
          posDevice: { select: { posSerial: true, deviceName: true } },
        },
      }),
      this.prisma.eTAReceipt.count({ where }),
    ]);

    return {
      data: receipts,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + receipts.length < total,
      },
    };
  }

  async getReceipt(organizationId: string, id: string) {
    const receipt = await this.prisma.eTAReceipt.findFirst({
      where: { id, organizationId },
      include: {
        payment: {
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
        },
        posDevice: true,
      },
    });

    if (!receipt) {
      throw new NotFoundException({
        code: 'RECEIPT_NOT_FOUND',
        message: 'Receipt not found',
        messageAr: 'الإيصال غير موجود',
      });
    }

    // بناء QR Code data
    const qrCodeData = this.buildQRCodeData(receipt);

    return {
      ...receipt,
      qrCodeData,
    };
  }

  async retryReceipt(organizationId: string, userId: string, id: string) {
    const receipt = await this.prisma.eTAReceipt.findFirst({
      where: { id, organizationId },
    });

    if (!receipt) {
      throw new NotFoundException({
        code: 'RECEIPT_NOT_FOUND',
        message: 'Receipt not found',
        messageAr: 'الإيصال غير موجود',
      });
    }

    if (receipt.status !== ETAReceiptStatus.INVALID && receipt.status !== ETAReceiptStatus.QUEUED_FOR_RETRY) {
      throw new BadRequestException({
        code: 'RECEIPT_NOT_RETRYABLE',
        message: 'Only failed or queued receipts can be retried',
        messageAr: 'يمكن إعادة إرسال الإيصالات الفاشلة أو المعلقة فقط',
      });
    }

    // تحديث الحالة
    await this.prisma.eTAReceipt.update({
      where: { id },
      data: {
        status: ETAReceiptStatus.QUEUED_FOR_RETRY,
        retryCount: { increment: 1 },
      },
    });

    // إرسال للـ queue
    this.eventEmitter.emit('eta_receipt.submitted', { receiptId: id, organizationId });

    return { success: true, message: 'Receipt queued for retry' };
  }

  // ═════════════════════════════════════════════════════════════════
  // ETA API METHODS
  // ═════════════════════════════════════════════════════════════════

  private async getToken(
    posSerial: string,
    posOsVersion: string,
    posModelFramework: string,
    credentials: { clientId: string; clientSecret: string; preSharedKey: string },
  ): Promise<string> {
    // في الإنتاج، نستخدم Redis للتخزين المؤقت
    const cacheKey = `${ETA_TOKEN_CACHE_PREFIX}${posSerial}`;

    // محاولة الحصول على توكن من الـ cache
    // const cachedToken = await this.cache.get(cacheKey);
    // if (cachedToken) return cachedToken;

    try {
      const response = await axios.post(
        `${this.identityUrl}/connect/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            posserial: posSerial,
            pososversion: posOsVersion,
            posmodelframework: posModelFramework,
            presharedkey: credentials.preSharedKey,
          },
        },
      );

      const { access_token, expires_in } = response.data;

      // تخزين في cache
      // await this.cache.set(cacheKey, access_token, TOKEN_TTL_SECONDS);

      return access_token;
    } catch (error) {
      console.error('ETA token error:', error.response?.data || error.message);
      throw new ServiceUnavailableException({
        code: 'ETA_SERVICE_UNAVAILABLE',
        message: 'Failed to get ETA token',
        messageAr: 'فشل الحصول على توكن ETA',
      });
    }
  }

  async submitReceipt(receiptId: string) {
    const receipt = await this.prisma.eTAReceipt.findUnique({
      where: { id: receiptId },
      include: {
        posDevice: true,
        organization: true,
      },
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    // الحصول على credentials من .env
    const clientId = process.env.ETA_CLIENT_ID;
    const clientSecret = process.env.ETA_CLIENT_SECRET;
    const preSharedKey = process.env.ETA_PRE_SHARED_KEY;

    if (!clientId || !clientSecret || !preSharedKey) {
      console.error('ETA credentials not configured');
      await this.updateReceiptStatus(receiptId, ETAReceiptStatus.QUEUED_FOR_RETRY, 'ETA credentials not configured');
      return;
    }

    try {
      // الحصول على التوكن
      const token = await this.getToken(
        receipt.posDevice.posSerial,
        receipt.posDevice.posOsVersion,
        receipt.posDevice.posModelFramework,
        { clientId, clientSecret, preSharedKey },
      );

      // حساب UUID
      const payloadObj = typeof receipt.receiptPayload === 'string' 
        ? JSON.parse(receipt.receiptPayload) 
        : receipt.receiptPayload;
      const documentUUID = this.generateDocumentUUID(payloadObj);

      // التوقيع
      const signature = this.signDocument(payloadObj);

      // إرسال
      const response = await axios.post(
        `${this.apiUrl}/api/v1/receiptsubmissions`,
        {
          receipts: [
            {
              ...payloadObj,
              uuid: documentUUID,
            },
          ],
          signatures: [
            {
              signatureType: 'I',
              value: signature,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const { submissionUUID, acceptedDocuments, rejectedDocuments } = response.data;

      if (acceptedDocuments.length > 0) {
        const doc = acceptedDocuments[0];
        await this.prisma.eTAReceipt.update({
          where: { id: receiptId },
          data: {
            status: ETAReceiptStatus.VALID,
            submissionUUID,
            documentUUID: doc.uuid,
            longId: doc.longId,
            processedAt: new Date(),
          },
        });

        this.eventEmitter.emit('eta_receipt.validated', { receiptId, organizationId: receipt.organizationId });
      } else if (rejectedDocuments.length > 0) {
        const error = rejectedDocuments[0].error;
        await this.updateReceiptStatus(receiptId, ETAReceiptStatus.INVALID, error?.message || 'Rejected by ETA');
      }
    } catch (error) {
      console.error('ETA submission error:', error.response?.data || error.message);

      if (error.response?.status === 401) {
        // Token expired - need to retry
        await this.updateReceiptStatus(receiptId, ETAReceiptStatus.QUEUED_FOR_RETRY, 'Token expired');
      } else if (error.response?.status >= 500) {
        // Server error - retry with backoff
        await this.updateReceiptStatus(receiptId, ETAReceiptStatus.QUEUED_FOR_RETRY, 'ETA server error');
      } else {
        await this.updateReceiptStatus(receiptId, ETAReceiptStatus.INVALID, error.message);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // HELPERS
  // ═════════════════════════════════════════════════════════════════

  private buildReceiptPayload(dto: CreateETAReceiptDto, totalAmount: number, posDevice: any): any {
    const now = new Date();
    return {
      header: {
        receiptNumber: `REC-${Date.now()}`,
        receiptType: dto.buyerType,
        issueDate: now.toISOString().split('T')[0],
        issueTime: now.toTimeString().split(' ')[0],
        uuid: '', // سيُحسب لاحقاً
        previousUUID: '', // من الإيصال السابق
      },
      seller: {
        rin: process.env.ETA_RIN || '',
        name: 'شركة الوساطة العقارية',
        branchId: posDevice.branchId || '0',
      },
      buyer: {
        type: dto.buyerType,
        name: dto.buyerName,
        nationalId: dto.buyerNationalId,
      },
      items: dto.items.map((item, index) => ({
        internalCode: `ITEM-${index + 1}`,
        description: item.description,
        quantity: item.quantity,
        unitValue: item.unitValueEGP,
        totalValue: item.quantity * item.unitValueEGP,
        currency: 'EGP',
      })),
      totals: {
        totalSales: totalAmount,
        total: totalAmount,
        currency: 'EGP',
      },
    };
  }

  private generateDocumentUUID(payload: any): string {
    // SHA256 of serialized content
    const serialized = JSON.stringify(payload, Object.keys(payload).sort());
    return createHash('sha256').update(serialized).digest('hex');
  }

  private signDocument(payload: any): string {
    // في الإنتاج، نستخدم شهادة رقمية حقيقية
    // هنا نضع placeholder
    const serialized = JSON.stringify(payload);
    const sign = createSign('RSA-SHA256');
    sign.update(serialized);
    // sign.sign(privateKey, 'base64');
    return Buffer.from(serialized).toString('base64');
  }

  private buildQRCodeData(receipt: any): string {
    const url = `https://invoicing.eta.gov.eg/receipts/search/${receipt.documentUUID}/share/${receipt.submittedAt?.toISOString()}`;
    const rin = process.env.ETA_RIN || '';
    const total = receipt.receiptPayload?.totals?.total || 0;
    return `${url}#Total:${total},IssuerRIN:${rin}`;
  }

  private async updateReceiptStatus(id: string, status: ETAReceiptStatus, error?: string) {
    await this.prisma.eTAReceipt.update({
      where: { id },
      data: {
        status,
        lastError: error,
        retryCount: { increment: 1 },
      },
    });
  }
}
