// ═══════════════════════════════════════════════════════════════
// Documents Service - نظام تشغيل المكتب العقاري المصري
// Phase 5.01 — Document Vault + OCR
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  GetDocumentsDto,
  ClassifyDocumentDto,
  GetUploadUrlDto,
  ConfirmUploadDto,
  DocumentType,
  DocumentStatus,
  OCRStatus,
  EntityType,
  DOCUMENT_TYPE_AR,
  DOCUMENT_STATUS_AR,
  OCR_STATUS_AR,
  OCRResultDto,
} from './dto/documents.dto';
import {
  DOCUMENT_TYPES_CONFIG,
  isMimeTypeAllowed,
  isFileSizeValid,
} from './config/document-types.config';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private r2Enabled = true;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventEmitter: EventEmitter2,
    private configService: ConfigService,
  ) {
    this.initializeS3Client();
  }

  /**
   * تهيئة عميل S3 للاتصال بـ Cloudflare R2
   */
  private initializeS3Client() {
    const accountId = this.configService.get('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('R2_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get('R2_BUCKET_NAME', 'documents');

    if (!accountId || !accessKeyId || !secretAccessKey) {
      this.logger.warn('R2 credentials not configured, using local fallback');
      this.r2Enabled = false;
      return;
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Upload URL Generation (API Contracts Module 9)
  // ═══════════════════════════════════════════════════════════════

  /**
   * إنشاء رابط رفع موقّع (Presigned URL)
   */
  async getUploadUrl(
    organizationId: string,
    userId: string,
    dto: GetUploadUrlDto,
    ipAddress?: string,
  ) {
    // التحقق من نوع الملف
    if (!isMimeTypeAllowed(dto.documentType, dto.mimeType)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_MIME_TYPE',
          message: `MIME type ${dto.mimeType} is not allowed for document type ${dto.documentType}`,
          messageAr: `نوع الملف ${dto.mimeType} غير مسموح لهذا النوع من المستندات`,
          traceId: crypto.randomUUID(),
        },
      });
    }

    // التحقق من حجم الملف
    if (!isFileSizeValid(dto.documentType, dto.sizeBytes)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size exceeds maximum allowed for document type ${dto.documentType}`,
          messageAr: `حجم الملف يتجاوز الحد المسموح لهذا النوع من المستندات`,
          traceId: crypto.randomUUID(),
        },
      });
    }

    // التحقق من وجود الكيان
    await this.validateEntityExists(dto.entityType, dto.entityId, organizationId);

    // إنشاء مفتاح الملف
    const fileExtension = this.getFileExtension(dto.mimeType);
    const fileKey = `docs/${organizationId}/${dto.entityType}/${dto.entityId}/${dto.documentType}-${crypto.randomUUID()}${fileExtension}`;

    // إنشاء المستند في قاعدة البيانات (pending)
    const document = await this.prisma.document.create({
      data: {
        organizationId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        documentType: dto.documentType,
        title: dto.title,
        fileUrl: '', // سيتم تحديثه بعد الرفع
        fileKey,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        status: DocumentStatus.PENDING_REVIEW,
        ocrStatus: OCRStatus.PENDING,
        uploadedById: userId,
      },
    });

    let uploadUrl: string;

    if (this.r2Enabled && this.s3Client) {
      // إنشاء presigned URL
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        ContentType: dto.mimeType,
        Metadata: {
          'document-id': document.id,
          'organization-id': organizationId,
          'entity-type': dto.entityType,
          'entity-id': dto.entityId,
        },
      });

      uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600, // ساعة واحدة
      });
    } else {
      // Fallback للتطوير المحلي
      uploadUrl = `${this.configService.get('API_URL', 'http://localhost:3001')}/uploads/local/${fileKey}`;
    }

    // تسجيل في الـ audit
    await this.auditService.log({
      organizationId,
      userId,
      action: 'document.upload_url_generated',
      entityType: 'document',
      entityId: document.id,
      newValue: {
        documentType: dto.documentType,
        entityType: dto.entityType,
        entityId: dto.entityId,
        fileKey,
      },
      ipAddress,
    });

    return {
      uploadUrl,
      fileKey,
      documentId: document.id,
    };
  }

  /**
   * تأكيد رفع المستند
   */
  async confirmUpload(
    documentId: string,
    organizationId: string,
    userId: string,
    dto: ConfirmUploadDto,
    ipAddress?: string,
  ) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, organizationId },
    });

    if (!document) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          messageAr: 'المستند غير موجود',
          traceId: crypto.randomUUID(),
        },
      });
    }

    if (document.status !== DocumentStatus.PENDING_REVIEW) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'DOCUMENT_ALREADY_CONFIRMED',
          message: 'Document upload already confirmed',
          messageAr: 'تم تأكيد رفع المستند مسبقاً',
          traceId: crypto.randomUUID(),
        },
      });
    }

    // تحديث رابط الملف
    const fileUrl = this.r2Enabled
      ? `${this.configService.get('R2_PUBLIC_URL', `https://cdn.example.com`)}/${document.fileKey}`
      : document.fileUrl;

    // تحديث المستند
    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        fileUrl,
        status: DocumentStatus.PENDING_REVIEW,
      },
    });

    // إرسال حدث رفع المستند
    this.eventEmitter.emit('document.uploaded', {
      documentId,
      organizationId,
      userId,
      documentType: document.documentType,
      entityType: document.entityType,
      entityId: document.entityId,
      fileUrl,
    });

    // بدء OCR تلقائياً إذا كان نوع المستند يدعمه
    const docType = document.documentType as DocumentType;
    const config = DOCUMENT_TYPES_CONFIG[docType];
    if (config?.ocrEnabled) {
      this.eventEmitter.emit('document.ocr_requested', {
        documentId,
        organizationId,
        userId,
        fileUrl,
        mimeType: document.mimeType,
      });
    }

    // تسجيل في الـ audit
    await this.auditService.log({
      organizationId,
      userId,
      action: 'document.upload_confirmed',
      entityType: 'document',
      entityId: documentId,
      newValue: { fileUrl },
      ipAddress,
    });

    return this.formatDocumentResponse(updatedDocument);
  }

  // ═══════════════════════════════════════════════════════════════
  // CRUD Operations
  // ═══════════════════════════════════════════════════════════════

  /**
   * رفع مستند جديد (الطريقة القديمة - للتوافق)
   */
  async create(
    organizationId: string,
    userId: string,
    dto: CreateDocumentDto,
    ipAddress?: string,
  ) {
    // التحقق من أن الكيان موجود
    await this.validateEntityExists(dto.entityType, dto.entityId, organizationId);

    const document = await this.prisma.document.create({
      data: {
        organizationId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        documentType: dto.documentType,
        title: dto.title,
        fileUrl: dto.fileUrl,
        fileKey: dto.fileKey,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        status: DocumentStatus.PENDING_REVIEW,
        ocrStatus: OCRStatus.PENDING,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: dto.notes,
        uploadedById: userId,
      },
    });

    // تسجيل في الـ audit
    await this.auditService.log({
      organizationId,
      userId,
      action: 'document.uploaded',
      entityType: 'document',
      entityId: document.id,
      newValue: {
        title: dto.title,
        documentType: dto.documentType,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
      ipAddress,
    });

    // إرسال حدث رفع المستند
    this.eventEmitter.emit('document.uploaded', {
      documentId: document.id,
      organizationId,
      userId,
      documentType: dto.documentType,
      entityType: dto.entityType,
      entityId: dto.entityId,
      fileUrl: dto.fileUrl,
    });

    // بدء OCR تلقائياً
    const config = DOCUMENT_TYPES_CONFIG[dto.documentType as DocumentType];
    if (config?.ocrEnabled) {
      this.eventEmitter.emit('document.ocr_requested', {
        documentId: document.id,
        organizationId,
        userId,
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType,
      });
    }

    return this.formatDocumentResponse(document);
  }

  /**
   * قائمة المستندات مع الفلترة
   */
  async findAll(organizationId: string, query: GetDocumentsDto) {
    const {
      page = 1,
      limit = 20,
      entityType,
      entityId,
      documentType,
      status,
      ocrStatus,
      search,
      expiringWithinDays,
      startDate,
      endDate,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (documentType) where.documentType = documentType;
    if (status) where.status = status;
    if (ocrStatus) where.ocrStatus = ocrStatus;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (expiringWithinDays) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiringWithinDays);
      where.expiresAt = {
        gte: new Date(),
        lte: expiryDate,
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      data: documents.map((doc) => this.formatDocumentResponse(doc)),
      meta: {
        total,
        page,
        limit,
        hasMore: skip + documents.length < total,
      },
    };
  }

  /**
   * تفاصيل مستند
   */
  async findOne(id: string, organizationId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, organizationId },
    });

    if (!document) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          messageAr: 'المستند غير موجود',
          traceId: crypto.randomUUID(),
        },
      });
    }

    return this.formatDocumentResponse(document);
  }

  /**
   * تحديث مستند
   */
  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateDocumentDto,
    ipAddress?: string,
  ) {
    const existingDoc = await this.findOne(id, organizationId);

    const updateData: any = {};
    if (dto.title) updateData.title = dto.title;
    if (dto.documentType) updateData.documentType = dto.documentType;
    if (dto.status) updateData.status = dto.status;
    if (dto.notes) updateData.notes = dto.notes;
    if (dto.expiresAt) updateData.expiresAt = new Date(dto.expiresAt);

    // إذا تم التحقق من المستند
    if (dto.status === DocumentStatus.VERIFIED) {
      updateData.verifiedById = userId;
      updateData.verifiedAt = new Date();
    }

    const document = await this.prisma.document.update({
      where: { id },
      data: updateData,
    });

    // تسجيل في الـ audit
    await this.auditService.log({
      organizationId,
      userId,
      action: 'document.updated',
      entityType: 'document',
      entityId: id,
      oldValue: {
        status: existingDoc.status,
        documentType: existingDoc.documentType,
      },
      newValue: updateData,
      ipAddress,
    });

    return this.formatDocumentResponse(document);
  }

  /**
   * حذف مستند
   */
  async remove(
    id: string,
    organizationId: string,
    userId: string,
    ipAddress?: string,
  ) {
    const document = await this.findOne(id, organizationId);

    // تسجيل قبل الحذف
    await this.auditService.log({
      organizationId,
      userId,
      action: 'document.deleted',
      entityType: 'document',
      entityId: id,
      oldValue: {
        title: document.title,
        documentType: document.documentType,
        fileKey: document.fileKey,
      },
      ipAddress,
    });

    // حذف من قاعدة البيانات
    await this.prisma.document.delete({
      where: { id },
    });

    // إرسال حدث لحذف الملف من R2
    this.eventEmitter.emit('document.deleted', {
      documentId: id,
      fileKey: document.fileKey,
      organizationId,
    });

    return { success: true };
  }

  /**
   * بدء عملية OCR
   */
  async triggerOCR(id: string, organizationId: string, userId: string) {
    const document = await this.findOne(id, organizationId);

    if (document.ocrStatus === OCRStatus.PROCESSING) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'OCR_IN_PROGRESS',
          message: 'OCR is already in progress',
          messageAr: 'معالجة OCR جارية بالفعل',
          traceId: crypto.randomUUID(),
        },
      });
    }

    // تحديث الحالة
    await this.prisma.document.update({
      where: { id },
      data: { ocrStatus: OCRStatus.PROCESSING },
    });

    // إرسال حدث لبدء OCR
    this.eventEmitter.emit('document.ocr_requested', {
      documentId: id,
      organizationId,
      userId,
      fileUrl: document.fileUrl,
      mimeType: document.mimeType,
    });

    return {
      success: true,
      message: 'OCR processing started',
      messageAr: 'بدأت معالجة OCR',
    };
  }

  /**
   * تحديث حالة المستند
   */
  async updateStatus(
    id: string,
    organizationId: string,
    userId: string,
    status: DocumentStatus,
    notes?: string,
    ipAddress?: string,
  ) {
    const document = await this.findOne(id, organizationId);

    const updateData: any = { status };
    if (notes) updateData.notes = notes;

    if (status === DocumentStatus.VERIFIED) {
      updateData.verifiedById = userId;
      updateData.verifiedAt = new Date();
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'document.status_updated',
      entityType: 'document',
      entityId: id,
      oldValue: { status: document.status },
      newValue: { status },
      ipAddress,
    });

    return this.formatDocumentResponse(updated);
  }

  /**
   * تصنيف مستند يدوياً
   */
  async classify(
    id: string,
    organizationId: string,
    userId: string,
    dto: ClassifyDocumentDto,
    ipAddress?: string,
  ) {
    // First fetch the existing document
    const existingDoc = await this.prisma.document.findFirst({
      where: { id, organizationId },
    });

    if (!existingDoc) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          messageAr: 'المستند غير موجود',
          traceId: crypto.randomUUID(),
        },
      });
    }

    const document = await this.prisma.document.update({
      where: { id },
      data: {
        documentType: dto.documentType,
        notes: dto.notes ? `${existingDoc.notes || ''}\n${dto.notes}` : undefined,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'document.classified',
      entityType: 'document',
      entityId: id,
      newValue: { documentType: dto.documentType },
      ipAddress,
    });

    return this.formatDocumentResponse(document);
  }

  /**
   * مستندات كيان معين
   */
  async getDocumentsByEntity(
    entityType: EntityType,
    entityId: string,
    organizationId: string,
  ) {
    await this.validateEntityExists(entityType, entityId, organizationId);

    const documents = await this.prisma.document.findMany({
      where: {
        organizationId,
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((doc) => this.formatDocumentResponse(doc));
  }

  /**
   * فحص المستندات المنتهية
   */
  async checkExpiring(organizationId: string, days: number = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const expired = await this.prisma.document.findMany({
      where: {
        organizationId,
        expiresAt: { lte: new Date() },
        status: { not: DocumentStatus.EXPIRED },
      },
    });

    const expiringSoon = await this.prisma.document.findMany({
      where: {
        organizationId,
        expiresAt: {
          gt: new Date(),
          lte: expiryDate,
        },
        status: { notIn: [DocumentStatus.EXPIRED, DocumentStatus.REJECTED] },
      },
    });

    // تحديث حالة المستندات المنتهية
    if (expired.length > 0) {
      await this.prisma.document.updateMany({
        where: {
          id: { in: expired.map((d) => d.id) },
        },
        data: { status: DocumentStatus.EXPIRED },
      });

      // إرسال تنبيهات
      this.eventEmitter.emit('documents.expired', {
        organizationId,
        documents: expired,
      });
    }

    // إرسال تنبيهات للمستندات القريبة من الانتهاء
    if (expiringSoon.length > 0) {
      this.eventEmitter.emit('documents.expiring_soon', {
        organizationId,
        documents: expiringSoon,
        daysRemaining: days,
      });
    }

    return {
      expired: expired.map((d) => this.formatDocumentResponse(d)),
      expiringSoon: expiringSoon.map((d) => this.formatDocumentResponse(d)),
      totalExpired: expired.length,
      totalExpiringSoon: expiringSoon.length,
    };
  }

  /**
   * إحصائيات المستندات
   */
  async getStats(organizationId: string) {
    const [
      total,
      byStatus,
      byType,
      pendingReview,
      verified,
      expired,
    ] = await Promise.all([
      this.prisma.document.count({ where: { organizationId } }),
      this.prisma.document.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { id: true },
      }),
      this.prisma.document.groupBy({
        by: ['documentType'],
        where: { organizationId },
        _count: { id: true },
      }),
      this.prisma.document.count({
        where: { organizationId, status: DocumentStatus.PENDING_REVIEW },
      }),
      this.prisma.document.count({
        where: { organizationId, status: DocumentStatus.VERIFIED },
      }),
      this.prisma.document.count({
        where: { organizationId, status: DocumentStatus.EXPIRED },
      }),
    ]);

    return {
      total,
      pendingReview,
      verified,
      expired,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byType: byType.reduce((acc, item) => {
        acc[item.documentType] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * بدء عملية OCR للمستند
   */
  async startOCR(id: string, organizationId: string, userId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, organizationId },
    });

    if (!document) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          messageAr: 'المستند غير موجود',
          traceId: crypto.randomUUID(),
        },
      });
    }

    if (document.ocrStatus === 'PROCESSING') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'OCR_IN_PROGRESS',
          message: 'OCR processing already in progress',
          messageAr: 'معالجة OCR جارية بالفعل',
          traceId: crypto.randomUUID(),
        },
      });
    }

    // تحديث حالة OCR
    await this.prisma.document.update({
      where: { id },
      data: { ocrStatus: 'PROCESSING' },
    });

    // إرسال حدث لبدء OCR
    this.eventEmitter.emit('document.ocr_requested', {
      documentId: id,
      organizationId,
      userId,
      fileUrl: document.fileUrl,
      mimeType: document.mimeType,
    });

    return {
      success: true,
      message: 'OCR processing started',
      messageAr: 'بدأت معالجة OCR',
      documentId: id,
    };
  }

  /**
   * معالجة نتيجة OCR
   */
  async processOCRResult(
    id: string,
    organizationId: string,
    result: OCRResultDto,
  ) {
    const document = await this.prisma.document.update({
      where: { id },
      data: {
        ocrStatus: result.status,
        ocrData: result.structuredData
          ? JSON.stringify(result.structuredData)
          : null,
      },
    });

    // إرسال حدث اكتمال OCR
    this.eventEmitter.emit('document.ocr_completed', {
      documentId: id,
      organizationId,
      status: result.status,
      structuredData: result.structuredData,
      suggestedDocumentType: result.suggestedDocumentType,
    });

    return this.formatDocumentResponse(document);
  }

  // ═══════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * التحقق من وجود الكيان
   */
  private async validateEntityExists(
    entityType: EntityType,
    entityId: string,
    organizationId: string,
  ) {
    let exists = false;

    switch (entityType) {
      case EntityType.CLIENT:
        exists = !!(await this.prisma.client.findFirst({
          where: { id: entityId, organizationId },
        }));
        break;
      case EntityType.USER:
        exists = !!(await this.prisma.user.findFirst({
          where: { id: entityId, organizationId },
        }));
        break;
      case EntityType.PROPERTY:
        exists = !!(await this.prisma.property.findFirst({
          where: { id: entityId, organizationId },
        }));
        break;
      case EntityType.DEAL:
        exists = !!(await this.prisma.deal.findFirst({
          where: { id: entityId, organizationId },
        }));
        break;
      case EntityType.CONTRACT:
        exists = !!(await this.prisma.contract.findFirst({
          where: { id: entityId, organizationId },
        }));
        break;
      case EntityType.ORGANIZATION:
        exists = !!(await this.prisma.organization.findFirst({
          where: { id: organizationId },
        }));
        break;
    }

    if (!exists) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'ENTITY_NOT_FOUND',
          message: `${entityType} not found`,
          messageAr: `${entityType} غير موجود`,
          traceId: crypto.randomUUID(),
        },
      });
    }
  }

  /**
   * الحصول على امتداد الملف من MIME type
   */
  private getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };
    return extensions[mimeType] || '';
  }

  /**
   * تنسيق استجابة المستند
   */
  private formatDocumentResponse(doc: any) {
    return {
      ...doc,
      documentTypeAr: DOCUMENT_TYPE_AR[doc.documentType as DocumentType] || doc.documentType,
      statusAr: DOCUMENT_STATUS_AR[doc.status as DocumentStatus] || doc.status,
      ocrStatusAr: doc.ocrStatus
        ? OCR_STATUS_AR[doc.ocrStatus as OCRStatus] || doc.ocrStatus
        : null,
      ocrData: doc.ocrData ? JSON.parse(doc.ocrData) : null,
    };
  }
}
