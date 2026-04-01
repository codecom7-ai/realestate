// ═══════════════════════════════════════════════════════════════
// Uploads Controller - واجهة API رفع الملفات
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { UploadsService } from './uploads.service';
import {
  GetPresignedUrlDto,
  ConfirmUploadDto,
  DeleteImageDto,
  ReorderImagesDto,
  UploadEntityType,
} from './dto/upload.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@realestate/shared-types';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
    private readonly configService: ConfigService,
  ) {}

  private getOrganizationId(): string {
    return this.configService.get<string>('app.orgId') || '';
  }

  // ═══════════════════════════════════════════════════════════════
  // إنشاء Presigned URL للرفع
  // ═══════════════════════════════════════════════════════════════

  @Post('presigned-url')
  @RequirePermissions(PERMISSIONS.PROPERTIES_WRITE)
  @ApiOperation({
    summary: 'إنشاء رابط رفع موقّع',
    description: 'Generates a presigned URL for direct file upload to R2',
  })
  @ApiResponse({
    status: 201,
    description: 'تم إنشاء رابط الرفع',
    schema: {
      example: {
        uploadUrl: 'https://...',
        key: 'properties/abc-123/def-456.jpg',
        expiresIn: 3600,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'نوع الملف غير مسموح أو حدث خطأ',
  })
  async getPresignedUrl(
    @Body() dto: GetPresignedUrlDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.uploadsService.getPresignedUrl(
      dto,
      this.getOrganizationId(),
      userId,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // تأكيد الرفع
  // ═══════════════════════════════════════════════════════════════

  @Post('confirm')
  @RequirePermissions(PERMISSIONS.PROPERTIES_WRITE)
  @ApiOperation({
    summary: 'تأكيد رفع الملف',
    description: 'Confirms file upload and saves to database',
  })
  @ApiResponse({
    status: 201,
    description: 'تم تأكيد الرفع وحفظ الصورة',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        url: 'https://...',
        key: 'properties/abc-123/def-456.jpg',
        order: 0,
        isPrimary: true,
        createdAt: '2026-03-22T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'الملف غير موجود أو حدث خطأ',
  })
  async confirmUpload(
    @Body() dto: ConfirmUploadDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.uploadsService.confirmUpload(
      dto,
      this.getOrganizationId(),
      userId,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // حذف صورة
  // ═══════════════════════════════════════════════════════════════

  @Delete(':imageId')
  @RequirePermissions(PERMISSIONS.PROPERTIES_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'حذف صورة',
    description: 'Deletes an image from storage and database',
  })
  @ApiParam({ name: 'imageId', description: 'معرف الصورة' })
  @ApiQuery({ name: 'entityType', enum: UploadEntityType, description: 'نوع الكيان' })
  @ApiResponse({
    status: 204,
    description: 'تم حذف الصورة',
  })
  @ApiResponse({
    status: 404,
    description: 'الصورة غير موجودة',
  })
  async deleteImage(
    @Param('imageId') imageId: string,
    @Query('entityType') entityType: UploadEntityType,
  ) {
    return this.uploadsService.deleteImage(
      imageId,
      entityType,
      this.getOrganizationId(),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ترتيب الصور
  // ═══════════════════════════════════════════════════════════════

  @Post('reorder')
  @RequirePermissions(PERMISSIONS.PROPERTIES_WRITE)
  @ApiOperation({
    summary: 'ترتيب الصور',
    description: 'Reorders images and sets primary image',
  })
  @ApiResponse({
    status: 200,
    description: 'تم تحديث ترتيب الصور',
    schema: {
      type: 'array',
      items: {
        example: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          url: 'https://...',
          key: 'properties/abc-123/def-456.jpg',
          order: 0,
          isPrimary: true,
          createdAt: '2026-03-22T10:00:00Z',
        },
      },
    },
  })
  async reorderImages(
    @Body() dto: ReorderImagesDto,
  ) {
    return this.uploadsService.reorderImages(
      dto,
      this.getOrganizationId(),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // جلب صور عقار
  // ═══════════════════════════════════════════════════════════════

  @Get('property/:propertyId')
  @RequirePermissions(PERMISSIONS.PROPERTIES_READ)
  @ApiOperation({
    summary: 'جلب صور عقار',
    description: 'Returns all images for a property',
  })
  @ApiParam({ name: 'propertyId', description: 'معرف العقار' })
  @ApiResponse({
    status: 200,
    description: 'قائمة صور العقار',
    schema: {
      type: 'array',
      items: {
        example: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          url: 'https://...',
          key: 'properties/abc-123/def-456.jpg',
          order: 0,
          isPrimary: true,
          createdAt: '2026-03-22T10:00:00Z',
        },
      },
    },
  })
  async getPropertyImages(
    @Param('propertyId') propertyId: string,
  ) {
    return this.uploadsService.getPropertyImages(
      propertyId,
      this.getOrganizationId(),
    );
  }
}
