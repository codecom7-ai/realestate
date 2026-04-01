// ═══════════════════════════════════════════════════════════════
// Uploads Service - خدمة رفع الملفات
// ═══════════════════════════════════════════════════════════════

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import {
  GetPresignedUrlDto,
  ConfirmUploadDto,
  ReorderImagesDto,
  UploadEntityType,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZE,
  MAX_PROPERTY_IMAGES,
} from './dto/upload.dto';

export interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

export interface UploadedImage {
  id: string;
  url: string;
  key: string;
  order: number;
  isPrimary: boolean;
  createdAt: Date;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrlBase: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // تهيئة R2/S3 client
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME', 'realestate-assets');
    this.publicUrlBase = this.configService.get<string>('R2_PUBLIC_URL', '');

    const r2AccountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const r2AccessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const r2SecretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');

    // إذا كانت متغيرات البيئة موجودة، أنشئ العميل
    if (r2AccountId && r2AccessKeyId && r2SecretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
      });
      this.logger.log('R2 client initialized successfully');
    } else {
      // وضع التطوير بدون R2 - سنستخدم تخزين محلي
      this.logger.warn('R2 credentials not found - using local storage fallback');
      this.s3Client = null as any;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // إنشاء Presigned URL للرفع المباشر
  // ═══════════════════════════════════════════════════════════════

  async getPresignedUrl(
    dto: GetPresignedUrlDto,
    organizationId: string,
    userId: string,
  ): Promise<PresignedUrlResponse> {
    // التحقق من نوع الملف
    const allAllowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
    if (!allAllowedTypes.includes(dto.mimeType as any)) {
      throw new BadRequestException({
        code: 'INVALID_FILE_TYPE',
        message: 'File type not allowed',
        messageAr: 'نوع الملف غير مسموح به',
        allowedTypes: allAllowedTypes,
      });
    }

    // التحقق من الكيان
    await this.validateEntity(dto.entityType, dto.entityId, organizationId);

    // التحقق من عدد الصور للعقارات
    if (dto.entityType === UploadEntityType.PROPERTY) {
      const existingImages = await this.prisma.propertyImage.count({
        where: { propertyId: dto.entityId },
      });
      if (existingImages >= MAX_PROPERTY_IMAGES) {
        throw new BadRequestException({
          code: 'MAX_IMAGES_EXCEEDED',
          message: `Maximum ${MAX_PROPERTY_IMAGES} images allowed per property`,
          messageAr: `الحد الأقصى ${MAX_PROPERTY_IMAGES} صور لكل عقار`,
        });
      }
    }

    // إنشاء مفتاح فريد للملف
    const fileExtension = this.getFileExtension(dto.mimeType);
    const key = this.generateFileKey(dto.entityType, dto.entityId, fileExtension);

    const expiresIn = 3600; // ساعة واحدة

    // إذا كان R2 متاح
    if (this.s3Client) {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: dto.mimeType,
        Metadata: {
          'entity-type': dto.entityType,
          'entity-id': dto.entityId,
          'organization-id': organizationId,
          'uploaded-by': userId,
          'original-filename': dto.originalFileName || 'unknown',
        },
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

      return { uploadUrl, key, expiresIn };
    } else {
      // وضع التطوير - إرجاع URL وهمي
      return {
        uploadUrl: `/api/v1/uploads/local/${key}`,
        key,
        expiresIn,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // تأكيد الرفع وحفظ البيانات
  // ═══════════════════════════════════════════════════════════════

  async confirmUpload(
    dto: ConfirmUploadDto,
    organizationId: string,
    userId: string,
  ): Promise<UploadedImage> {
    // التحقق من وجود الملف في R2
    if (this.s3Client) {
      try {
        await this.s3Client.send(
          new HeadObjectCommand({
            Bucket: this.bucketName,
            Key: dto.key,
          })
        );
      } catch {
        throw new BadRequestException({
          code: 'FILE_NOT_FOUND',
          message: 'File not found in storage. Upload may have failed.',
          messageAr: 'الملف غير موجود. قد يكون الرفع قد فشل.',
        });
      }
    }

    // التحقق من الكيان
    await this.validateEntity(dto.entityType, dto.entityId, organizationId);

    // إنشاء URL للوصول العام
    const url = this.getFileUrl(dto.key);

    // حفظ في قاعدة البيانات حسب نوع الكيان
    if (dto.entityType === UploadEntityType.PROPERTY) {
      // التحقق من عدم وجود الصورة مسبقاً
      const existingImage = await this.prisma.propertyImage.findFirst({
        where: { key: dto.key },
      });

      if (existingImage) {
        return this.formatImageResponse(existingImage);
      }

      // تحديد الترتيب
      const maxOrder = await this.prisma.propertyImage.aggregate({
        where: { propertyId: dto.entityId },
        _max: { order: true },
      });
      const order = dto.order ?? (maxOrder._max.order ?? -1) + 1;

      // هل هي الصورة الأولى؟ (تصبح رئيسية تلقائياً)
      const imageCount = await this.prisma.propertyImage.count({
        where: { propertyId: dto.entityId },
      });
      const isPrimary = dto.isPrimary ?? imageCount === 0;

      // إذا كانت رئيسية، أزل العلم من الصور الأخرى
      if (isPrimary) {
        await this.prisma.propertyImage.updateMany({
          where: { propertyId: dto.entityId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const image = await this.prisma.propertyImage.create({
        data: {
          propertyId: dto.entityId,
          url,
          key: dto.key,
          order,
          isPrimary,
        },
      });

      return this.formatImageResponse(image);
    }

    // يمكن إضافة أنواع أخرى هنا
    throw new BadRequestException({
      code: 'UNSUPPORTED_ENTITY_TYPE',
      message: 'Entity type not supported for image upload',
      messageAr: 'نوع الكيان غير مدعوم لرفع الصور',
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // حذف صورة
  // ═══════════════════════════════════════════════════════════════

  async deleteImage(
    imageId: string,
    entityType: UploadEntityType,
    organizationId: string,
  ): Promise<void> {
    if (entityType === UploadEntityType.PROPERTY) {
      const image = await this.prisma.propertyImage.findUnique({
        where: { id: imageId },
        include: { property: true },
      });

      if (!image) {
        throw new NotFoundException({
          code: 'IMAGE_NOT_FOUND',
          message: 'Image not found',
          messageAr: 'الصورة غير موجودة',
        });
      }

      // التحقق من الملكية
      if (image.property.organizationId !== organizationId) {
        throw new NotFoundException({
          code: 'IMAGE_NOT_FOUND',
          message: 'Image not found',
          messageAr: 'الصورة غير موجودة',
        });
      }

      // حذف من R2
      if (this.s3Client) {
        try {
          await this.s3Client.send(
            new DeleteObjectCommand({
              Bucket: this.bucketName,
              Key: image.key,
            })
          );
        } catch (error) {
          this.logger.error(`Failed to delete image from R2: ${error.message}`);
          // نستمر حتى لو فشل الحذف من R2
        }
      }

      // حذف من قاعدة البيانات
      await this.prisma.propertyImage.delete({
        where: { id: imageId },
      });

      // إذا كانت الصورة المحذوفة رئيسية، اجعل الصورة الأولى رئيسية
      if (image.isPrimary) {
        const nextImage = await this.prisma.propertyImage.findFirst({
          where: { propertyId: image.propertyId },
          orderBy: { order: 'asc' },
        });
        if (nextImage) {
          await this.prisma.propertyImage.update({
            where: { id: nextImage.id },
            data: { isPrimary: true },
          });
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ترتيب الصور
  // ═══════════════════════════════════════════════════════════════

  async reorderImages(
    dto: ReorderImagesDto,
    organizationId: string,
  ): Promise<UploadedImage[]> {
    // التحقق من العقار
    const property = await this.prisma.property.findFirst({
      where: { id: dto.entityId, organizationId },
    });

    if (!property) {
      throw new NotFoundException({
        code: 'PROPERTY_NOT_FOUND',
        message: 'Property not found',
        messageAr: 'العقار غير موجود',
      });
    }

    // تحديث الترتيب في transaction
    await this.prisma.$transaction(
      dto.imageIds.map((imageId, index) =>
        this.prisma.propertyImage.update({
          where: { id: imageId },
          data: {
            order: index,
            isPrimary: imageId === dto.primaryImageId,
          },
        })
      )
    );

    // إذا لم يتم تحديد صورة رئيسية، اجعل الأولى رئيسية
    if (!dto.primaryImageId && dto.imageIds.length > 0) {
      await this.prisma.propertyImage.update({
        where: { id: dto.imageIds[0] },
        data: { isPrimary: true },
      });
    }

    // جلب الصور المحدثة
    const images = await this.prisma.propertyImage.findMany({
      where: { propertyId: dto.entityId },
      orderBy: { order: 'asc' },
    });

    return images.map(this.formatImageResponse);
  }

  // ═══════════════════════════════════════════════════════════════
  // جلب صور عقار
  // ═══════════════════════════════════════════════════════════════

  async getPropertyImages(propertyId: string, organizationId: string): Promise<UploadedImage[]> {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, organizationId },
    });

    if (!property) {
      throw new NotFoundException({
        code: 'PROPERTY_NOT_FOUND',
        message: 'Property not found',
        messageAr: 'العقار غير موجود',
      });
    }

    const images = await this.prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: { order: 'asc' },
    });

    return images.map(this.formatImageResponse);
  }

  // ═══════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════

  private async validateEntity(
    entityType: UploadEntityType,
    entityId: string,
    organizationId: string,
  ): Promise<void> {
    switch (entityType) {
      case UploadEntityType.PROPERTY: {
        const property = await this.prisma.property.findFirst({
          where: { id: entityId, organizationId },
        });
        if (!property) {
          throw new NotFoundException({
            code: 'PROPERTY_NOT_FOUND',
            message: 'Property not found',
            messageAr: 'العقار غير موجود',
          });
        }
        break;
      }
      // يمكن إضافة أنواع أخرى هنا
      default:
        throw new BadRequestException({
          code: 'UNSUPPORTED_ENTITY_TYPE',
          message: 'Entity type not supported',
          messageAr: 'نوع الكيان غير مدعوم',
        });
    }
  }

  private generateFileKey(entityType: UploadEntityType, entityId: string, extension: string): string {
    const uniqueId = uuidv4();
    return `${entityType}s/${entityId}/${uniqueId}.${extension}`;
  }

  private getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'application/pdf': 'pdf',
    };
    return extensions[mimeType] || 'bin';
  }

  private getFileUrl(key: string): string {
    if (this.publicUrlBase) {
      return `${this.publicUrlBase}/${key}`;
    }
    // URL افتراضي للتطوير
    return `/api/v1/uploads/file/${key}`;
  }

  private formatImageResponse(image: { id: string; url: string; key: string; order: number; isPrimary: boolean; createdAt: Date }): UploadedImage {
    return {
      id: image.id,
      url: image.url,
      key: image.key,
      order: image.order,
      isPrimary: image.isPrimary,
      createdAt: image.createdAt,
    };
  }
}
