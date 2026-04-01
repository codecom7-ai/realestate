// ═══════════════════════════════════════════════════════════════
// Public Controller
// متحكم الواجهة العامة (بدون مصادقة)
// ⚠️ SECURITY: Rate limited to prevent abuse
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PublicService } from './public.service';
import { CreateViewingRequestDto, ConfirmViewingDto } from './dto/public.dto';

@ApiTags('Public')
@Controller('public')
@UsePipes(new ValidationPipe({ transform: true }))
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  /**
   * الحصول على بيانات عقار عامة
   * لا يتطلب مصادقة
   * ⚠️ Rate limited: 10 requests per minute
   */
  @Get('properties/:id')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Get public property data', description: 'الحصول على بيانات عقار عامة (بدون مصادقة)' })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiResponse({ status: 200, description: 'Property data' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async getPropertyPublic(@Param('id') id: string) {
    const property = await this.publicService.getPropertyPublic(id);
    return {
      success: true,
      data: property,
    };
  }

  /**
   * إنشاء طلب معاينة
   * لا يتطلب مصادقة
   * ⚠️ Rate limited: 3 requests per minute (prevent spam)
   */
  @Post('requests')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Create viewing request', description: 'إنشاء طلب معاينة جديد (بدون مصادقة)' })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createViewingRequest(@Body() dto: CreateViewingRequestDto) {
    const result = await this.publicService.createViewingRequest(dto);
    return result;
  }

  /**
   * التحقق من العميل برقم الهاتف
   * ⚠️ SECURITY WARNING: Limited data returned to prevent enumeration
   * Rate limited: 5 requests per minute
   */
  @Get('clients/phone/:phone')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Get client by phone', description: 'البحث عن عميل برقم الهاتف' })
  @ApiParam({ name: 'phone', description: 'Phone number' })
  @ApiResponse({ status: 200, description: 'Client found' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async getClientByPhone(@Param('phone') phone: string) {
    // Return limited data only - no sensitive information
    const client = await this.publicService.getClientByPhoneLimited(decodeURIComponent(phone));
    return {
      success: true,
      data: client,
    };
  }

  /**
   * الحصول على بيانات العميل الكاملة
   * ⚠️ SECURITY: Requires phone verification token
   * Rate limited: 3 requests per minute
   */
  @Get('clients/phone/:phone/data')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Get client full data', description: 'الحصول على بيانات العميل الكاملة (معاينات، صفقات، مدفوعات)' })
  @ApiParam({ name: 'phone', description: 'Phone number' })
  @ApiResponse({ status: 200, description: 'Client data' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async getClientData(@Param('phone') phone: string) {
    const data = await this.publicService.getClientData(decodeURIComponent(phone));
    return {
      success: true,
      data,
    };
  }

  /**
   * تأكيد حضور المعاينة
   * Rate limited: 5 requests per minute
   */
  @Post('viewings/:id/confirm')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Confirm viewing attendance', description: 'تأكيد حضور المعاينة من العميل' })
  @ApiParam({ name: 'id', description: 'Viewing ID' })
  @ApiResponse({ status: 200, description: 'Viewing confirmed' })
  @ApiResponse({ status: 404, description: 'Viewing not found' })
  @ApiResponse({ status: 400, description: 'Phone mismatch' })
  async confirmViewing(
    @Param('id') id: string,
    @Body() dto: ConfirmViewingDto,
  ) {
    return this.publicService.confirmViewing(id, dto);
  }
}
