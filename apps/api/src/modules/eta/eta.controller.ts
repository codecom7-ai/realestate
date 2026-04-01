// ═══════════════════════════════════════════════════════════════
// ETA Controller - واجهة برمجة التطبيقات للإيصالات الإلكترونية
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@realestate/shared-types';
import { ETAAuthService } from './eta-auth.service';
import { ETAReceiptService } from './eta-receipt.service';
import {
  CreateETAReceiptDto,
  GetETAReceiptsDto,
  ETAReceiptResponseDto,
  ETAReceiptStatsDto,
  ETATokenStatusDto,
  RetryReceiptDto,
} from './dto/eta.dto';

@ApiTags('ETA - الإيصالات الإلكترونية')
@ApiBearerAuth()
@Controller('eta')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ETAController {
  constructor(
    private readonly authService: ETAAuthService,
    private readonly receiptService: ETAReceiptService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // TOKEN ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * التحقق من حالة التوكن
   */
  @Get('token/status')
  @RequirePermissions(PERMISSIONS.ETA_VIEW)
  @ApiOperation({ summary: 'التحقق من حالة توكن ETA' })
  @ApiResponse({ status: 200, description: 'حالة التوكن', type: ETATokenStatusDto })
  async getTokenStatus(): Promise<ETATokenStatusDto> {
    return this.authService.getTokenStatus();
  }

  /**
   * تجديد التوكن
   */
  @Post('token/refresh')
  @RequirePermissions(PERMISSIONS.ETA_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تجديد توكن ETA' })
  @ApiResponse({ status: 200, description: 'تم تجديد التوكن بنجاح' })
  async refreshToken(): Promise<{ success: boolean; message: string }> {
    await this.authService.invalidateToken();
    await this.authService.getToken();
    return {
      success: true,
      message: 'تم تجديد التوكن بنجاح',
    };
  }

  /**
   * التحقق من تكوين ETA
   */
  @Get('config/check')
  @RequirePermissions(PERMISSIONS.ETA_MANAGE)
  @ApiOperation({ summary: 'التحقق من تكوين ETA' })
  @ApiResponse({
    status: 200,
    description: 'نتيجة التحقق من التكوين',
    schema: {
      type: 'object',
      properties: {
        isConfigured: { type: 'boolean' },
        issues: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async checkConfiguration(): Promise<{ isConfigured: boolean; issues: string[] }> {
    return this.authService.checkConfiguration();
  }

  // ═══════════════════════════════════════════════════════════════
  // RECEIPT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * إنشاء إيصال جديد وإرساله
   */
  @Post('receipts')
  @RequirePermissions(PERMISSIONS.ETA_CREATE)
  @ApiOperation({ summary: 'إنشاء إيصال ETA جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الإيصال', type: ETAReceiptResponseDto })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  @ApiResponse({ status: 404, description: 'الدفعة أو جهاز POS غير موجود' })
  async createReceipt(
    @Request() req: any,
    @Body() dto: CreateETAReceiptDto,
  ): Promise<ETAReceiptResponseDto> {
    return this.receiptService.createReceipt(
      req.user.organizationId,
      req.user.id,
      dto,
    );
  }

  /**
   * قائمة الإيصالات
   */
  @Get('receipts')
  @RequirePermissions(PERMISSIONS.ETA_VIEW)
  @ApiOperation({ summary: 'قائمة إيصالات ETA' })
  @ApiResponse({
    status: 200,
    description: 'قائمة الإيصالات',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/ETAReceiptResponseDto' } },
        total: { type: 'number' },
      },
    },
  })
  async getReceipts(
    @Request() req: any,
    @Query() dto: GetETAReceiptsDto,
  ): Promise<{ data: ETAReceiptResponseDto[]; total: number }> {
    return this.receiptService.getReceipts(req.user.organizationId, dto);
  }

  /**
   * إحصائيات الإيصالات
   */
  @Get('receipts/stats')
  @RequirePermissions(PERMISSIONS.ETA_VIEW)
  @ApiOperation({ summary: 'إحصائيات إيصالات ETA' })
  @ApiResponse({ status: 200, description: 'الإحصائيات', type: ETAReceiptStatsDto })
  async getStats(@Request() req: any): Promise<ETAReceiptStatsDto> {
    return this.receiptService.getStats(req.user.organizationId);
  }

  /**
   * تفاصيل إيصال
   */
  @Get('receipts/:id')
  @RequirePermissions(PERMISSIONS.ETA_VIEW)
  @ApiOperation({ summary: 'تفاصيل إيصال ETA' })
  @ApiParam({ name: 'id', description: 'معرف الإيصال' })
  @ApiResponse({ status: 200, description: 'تفاصيل الإيصال', type: ETAReceiptResponseDto })
  @ApiResponse({ status: 404, description: 'الإيصال غير موجود' })
  async getReceipt(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<ETAReceiptResponseDto> {
    return this.receiptService.getReceipt(req.user.organizationId, id);
  }

  /**
   * إعادة محاولة إرسال إيصال فاشل
   */
  @Post('receipts/:id/retry')
  @RequirePermissions(PERMISSIONS.ETA_CREATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'إعادة محاولة إرسال إيصال' })
  @ApiParam({ name: 'id', description: 'معرف الإيصال' })
  @ApiResponse({ status: 200, description: 'نتيجة إعادة المحاولة', type: ETAReceiptResponseDto })
  @ApiResponse({ status: 404, description: 'الإيصال غير موجود' })
  async retryReceipt(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RetryReceiptDto,
  ): Promise<ETAReceiptResponseDto> {
    return this.receiptService.retryReceipt(req.user.organizationId, id, dto);
  }

  /**
   * الحصول على بيانات QR Code للإيصال
   * Format: {URL}#Total:{Total},IssuerRIN:{RIN}
   */
  @Get('receipts/:id/qr')
  @RequirePermissions(PERMISSIONS.ETA_VIEW)
  @ApiOperation({ summary: 'الحصول على بيانات QR Code للإيصال' })
  @ApiParam({ name: 'id', description: 'معرف الإيصال' })
  @ApiResponse({
    status: 200,
    description: 'بيانات QR Code',
    schema: {
      type: 'object',
      properties: {
        qrCodeData: { type: 'string', description: 'بيانات QR Code للطباعة' },
        url: { type: 'string', description: 'رابط الإيصال على بوابة ETA' },
        total: { type: 'number', description: 'إجمالي المبلغ' },
        issuerRIN: { type: 'string', description: 'الرقم الضريبي للمُصدِر' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'الإيصال غير موجود' })
  async getReceiptQR(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<{
    qrCodeData: string;
    url: string;
    total: number;
    issuerRIN: string;
  }> {
    return this.receiptService.getReceiptQRData(req.user.organizationId, id);
  }
}
