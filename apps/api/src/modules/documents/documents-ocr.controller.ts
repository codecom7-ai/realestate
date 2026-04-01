// @ts-nocheck
import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';

@ApiTags('Documents OCR - التعرف الضوئي على المستندات')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsOCRController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('ocr')
  @RequirePermissions('documents:write')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'OCR للمستندات - استخراج البيانات من الصور' })
  async processOCR(
    @CurrentUser('organizationId') orgId: string,
    @Body() body: { image: string; documentType: string },
  ) {
    // Parse base64 image from form data
    const imageBuffer = Buffer.from(body.image, 'base64');
    return this.documentsService.processOCRFromBuffer(orgId, imageBuffer, body.documentType || 'national_id');
  }
}
