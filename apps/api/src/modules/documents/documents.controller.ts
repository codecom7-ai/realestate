// ═══════════════════════════════════════════════════════════════
// Documents Controller - نظام تشغيل المكتب العقاري المصري
// Phase 5.01 — Document Vault + OCR
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';

import { DocumentsService } from './documents.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  GetDocumentsDto,
  ClassifyDocumentDto,
  ExpiringDocumentsDto,
  EntityType,
} from './dto/documents.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@realestate/shared-types';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * GET /documents
   * قائمة المستندات مع الفلترة
   */
  @Get()
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  @ApiOperation({ summary: 'قائمة المستندات مع الفلترة والبحث' })
  @ApiResponse({ status: 200, description: 'قائمة المستندات' })
  async findAll(
    @Req() req: FastifyRequest,
    @Query() query: GetDocumentsDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.documentsService.findAll(user.organizationId, query);
    return {
      success: true,
      ...result,
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * GET /documents/stats
   * إحصائيات المستندات
   */
  @Get('stats')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  @ApiOperation({ summary: 'إحصائيات المستندات' })
  @ApiResponse({ status: 200, description: 'إحصائيات المستندات' })
  async getStats(@CurrentUser() user: any) {
    const stats = await this.documentsService.getStats(user.organizationId);
    return {
      success: true,
      data: stats,
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * GET /documents/expiring
   * المستندات المنتهية أو القريبة من الانتهاء
   */
  @Get('expiring')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  @ApiOperation({ summary: 'المستندات المنتهية أو القريبة من الانتهاء' })
  @ApiResponse({ status: 200, description: 'قائمة المستندات المنتهية' })
  async getExpiring(
    @CurrentUser() user: any,
    @Query() query: ExpiringDocumentsDto,
  ) {
    const result = await this.documentsService.checkExpiring(
      user.organizationId,
      query.days || 30,
    );
    return {
      success: true,
      data: result,
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * GET /documents/entity/:entityType/:entityId
   * مستندات كيان معين
   */
  @Get('entity/:entityType/:entityId')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  @ApiOperation({ summary: 'مستندات كيان معين (عميل، مستخدم، عقار...)' })
  @ApiParam({ name: 'entityType', enum: EntityType, description: 'نوع الكيان' })
  @ApiParam({ name: 'entityId', description: 'معرف الكيان' })
  @ApiResponse({ status: 200, description: 'قائمة مستندات الكيان' })
  async getDocumentsByEntity(
    @CurrentUser() user: any,
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
  ) {
    const documents = await this.documentsService.getDocumentsByEntity(
      entityType,
      entityId,
      user.organizationId,
    );
    return {
      success: true,
      data: documents,
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * GET /documents/:id
   * تفاصيل مستند
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_READ)
  @ApiOperation({ summary: 'تفاصيل مستند' })
  @ApiParam({ name: 'id', description: 'معرف المستند' })
  @ApiResponse({ status: 200, description: 'تفاصيل المستند' })
  @ApiResponse({ status: 404, description: 'المستند غير موجود' })
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const document = await this.documentsService.findOne(id, user.organizationId);
    return {
      success: true,
      data: document,
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * POST /documents
   * رفع مستند جديد
   */
  @Post()
  @RequirePermissions(PERMISSIONS.DOCUMENTS_WRITE)
  @ApiOperation({ summary: 'رفع مستند جديد' })
  @ApiResponse({ status: 201, description: 'تم رفع المستند بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateDocumentDto,
    @Req() req: FastifyRequest,
  ) {
    const document = await this.documentsService.create(
      user.organizationId,
      user.id,
      dto,
      req.ip,
    );
    return {
      success: true,
      data: document,
      message: 'تم رفع المستند بنجاح',
      messageAr: 'تم رفع المستند بنجاح',
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * PATCH /documents/:id
   * تحديث مستند
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_WRITE)
  @ApiOperation({ summary: 'تحديث مستند' })
  @ApiParam({ name: 'id', description: 'معرف المستند' })
  @ApiResponse({ status: 200, description: 'تم تحديث المستند بنجاح' })
  @ApiResponse({ status: 404, description: 'المستند غير موجود' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @Req() req: FastifyRequest,
  ) {
    const document = await this.documentsService.update(
      id,
      user.organizationId,
      user.id,
      dto,
      req.ip,
    );
    return {
      success: true,
      data: document,
      message: 'تم تحديث المستند بنجاح',
      messageAr: 'تم تحديث المستند بنجاح',
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * POST /documents/:id/ocr
   * بدء عملية OCR للمستند
   */
  @Post(':id/ocr')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_WRITE)
  @ApiOperation({ summary: 'بدء عملية OCR للمستند' })
  @ApiParam({ name: 'id', description: 'معرف المستند' })
  @ApiResponse({ status: 200, description: 'بدأت معالجة OCR' })
  @ApiResponse({ status: 400, description: 'معالجة OCR جارية بالفعل' })
  async startOCR(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const result = await this.documentsService.startOCR(
      id,
      user.organizationId,
      user.id,
    );
    return {
      ...result,
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * POST /documents/:id/classify
   * تصنيف مستند يدوياً
   */
  @Post(':id/classify')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_WRITE)
  @ApiOperation({ summary: 'تصنيف مستند يدوياً' })
  @ApiParam({ name: 'id', description: 'معرف المستند' })
  @ApiResponse({ status: 200, description: 'تم تصنيف المستند بنجاح' })
  async classify(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ClassifyDocumentDto,
    @Req() req: FastifyRequest,
  ) {
    const document = await this.documentsService.classify(
      id,
      user.organizationId,
      user.id,
      dto,
      req.ip,
    );
    return {
      success: true,
      data: document,
      message: 'تم تصنيف المستند بنجاح',
      messageAr: 'تم تصنيف المستند بنجاح',
      traceId: crypto.randomUUID(),
    };
  }

  /**
   * DELETE /documents/:id
   * حذف مستند
   */
  @Delete(':id')
  @RequirePermissions(PERMISSIONS.DOCUMENTS_WRITE)
  @ApiOperation({ summary: 'حذف مستند' })
  @ApiParam({ name: 'id', description: 'معرف المستند' })
  @ApiResponse({ status: 200, description: 'تم حذف المستند بنجاح' })
  @ApiResponse({ status: 404, description: 'المستند غير موجود' })
  async remove(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ) {
    await this.documentsService.remove(id, user.organizationId, user.id, req.ip);
    return {
      success: true,
      message: 'تم حذف المستند بنجاح',
      messageAr: 'تم حذف المستند بنجاح',
      traceId: crypto.randomUUID(),
    };
  }
}
