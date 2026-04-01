// ═══════════════════════════════════════════════════════════════
// WhatsApp Controller - واجهة واتساب
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WhatsAppService } from './whatsapp.service';
import {
  SendTextMessageDto,
  SendTemplateMessageDto,
  SendImageMessageDto,
  SendMessageResponseDto,
} from './dto/whatsapp.dto';

@ApiTags('واتساب')
@ApiBearerAuth()
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  /**
   * GET /webhooks/whatsapp
   * التحقق من Webhook (من Meta)
   */
  @Get('webhook')
  @Public()
  @ApiOperation({
    summary: 'التحقق من Webhook',
    description: 'يستخدمه Meta للتحقق من الـ webhook',
  })
  @ApiQuery({
    name: 'hub.mode',
    description: 'وضع التحقق',
    example: 'subscribe',
  })
  @ApiQuery({
    name: 'hub.challenge',
    description: 'رمز التحقق',
  })
  @ApiQuery({
    name: 'hub.verify_token',
    description: 'رمز التحقق من التطبيق',
  })
  @ApiResponse({
    status: 200,
    description: 'التحقق ناجح',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 400,
    description: 'فشل التحقق',
  })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token: string,
  ): string {
    return this.whatsappService.verifyWebhook(mode, token, challenge);
  }

  /**
   * POST /webhooks/whatsapp
   * استقبال الرسائل من واتساب
   */
  @Post('webhook')
  @Public()
  @ApiOperation({
    summary: 'استقبال رسائل واتساب',
    description: 'Webhook لاستقبال الرسائل والتحديثات من واتساب',
  })
  @ApiResponse({
    status: 200,
    description: 'تم استقبال الرسالة',
  })
  async handleWebhook(
    @Body() webhookData: any,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<{ success: boolean }> {
    // في الـ webhook الفعلي، نحتاج لتحديد الـ organization من رقم الهاتف
    // هنا نستخدم organizationId من الـ token أو أول organization
    await this.whatsappService.handleWebhook(webhookData, organizationId);
    return { success: true };
  }

  /**
   * POST /whatsapp/send/text
   * إرسال رسالة نصية
   */
  @Post('send/text')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'إرسال رسالة نصية',
    description: 'إرسال رسالة نصية عبر واتساب',
  })
  @ApiResponse({
    status: 201,
    description: 'تم إرسال الرسالة',
    type: SendMessageResponseDto,
  })
  async sendTextMessage(
    @Body() dto: SendTextMessageDto,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<SendMessageResponseDto> {
    return this.whatsappService.sendTextMessage(organizationId, dto);
  }

  /**
   * POST /whatsapp/send/template
   * إرسال رسالة من قالب
   */
  @Post('send/template')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'إرسال رسالة من قالب',
    description: 'إرسال رسالة من قالب واتساب معتمد',
  })
  @ApiResponse({
    status: 201,
    description: 'تم إرسال الرسالة',
    type: SendMessageResponseDto,
  })
  async sendTemplateMessage(
    @Body() dto: SendTemplateMessageDto,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<SendMessageResponseDto> {
    return this.whatsappService.sendTemplateMessage(organizationId, dto);
  }

  /**
   * POST /whatsapp/send/image
   * إرسال صورة
   */
  @Post('send/image')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'إرسال صورة',
    description: 'إرسال صورة عبر واتساب',
  })
  @ApiResponse({
    status: 201,
    description: 'تم إرسال الصورة',
    type: SendMessageResponseDto,
  })
  async sendImageMessage(
    @Body() dto: SendImageMessageDto,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<SendMessageResponseDto> {
    return this.whatsappService.sendImageMessage(organizationId, dto);
  }
}
