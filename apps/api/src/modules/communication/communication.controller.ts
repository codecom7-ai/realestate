// ═══════════════════════════════════════════════════════════════
// Communication Controller - واجهة التواصل والرسائل
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CommunicationService } from './communication.service';
import {
  SendMessageDto,
  GetConversationsDto,
  UpdateConversationDto,
  ConversationListItemDto,
  ConversationDetailDto,
  MessageDto,
  ConversationStatus,
  CommunicationChannel,
} from './dto/communication.dto';

@ApiTags('التواصل')
@ApiBearerAuth()
@Controller('communication')
@UseGuards(JwtAuthGuard)
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  // ═══════════════════════════════════════════════════════════════
  // WhatsApp Webhook (لا يتطلب مصادقة)
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /webhooks/whatsapp
   * التحقق من WhatsApp webhook
   */
  @Get('webhooks/whatsapp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'التحقق من WhatsApp webhook',
    description: 'يتحقق WhatsApp من صحة الـ webhook endpoint',
  })
  @ApiQuery({
    name: 'hub.mode',
    description: 'وضع التحقق',
    example: 'subscribe',
  })
  @ApiQuery({
    name: 'hub.challenge',
    description: 'قيمة التحقق',
    example: '1234567890',
  })
  @ApiQuery({
    name: 'hub.verify_token',
    description: 'رمز التحقق',
    example: 'my_verify_token',
  })
  @ApiResponse({
    status: 200,
    description: 'تم التحقق بنجاح',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 403,
    description: 'فشل التحقق',
  })
  verifyWhatsAppWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token: string,
  ): string {
    const result = this.communicationService.verifyWhatsAppToken(
      mode,
      token,
      challenge,
    );

    if (result) {
      return result;
    }

    throw new Error('Verification failed');
  }

  /**
   * POST /webhooks/whatsapp
   * استقبال رسائل WhatsApp
   */
  @Post('webhooks/whatsapp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'استقبال رسائل WhatsApp',
    description: 'يستقبل رسائل WhatsApp الواردة وينشئ محادثات ورسائل تلقائياً',
  })
  @ApiResponse({
    status: 200,
    description: 'تم استقبال الرسالة',
    schema: {
      example: {
        success: true,
        data: { received: true },
      },
    },
  })
  async handleWhatsAppWebhook(
    @Body() payload: any,
    @Req() req: FastifyRequest,
  ): Promise<{ success: boolean; data: { received: boolean; messageId?: string } }> {
    // في Single-Tenant، نستخدم الـ organizationId الوحيد
    // يمكن تحسين هذا لاحقاً باستخدام phone_number_id لتحديد الـ organization
    const organizationId = req.headers['x-organization-id'] as string;

    const result = await this.communicationService.handleWhatsAppWebhook(
      payload,
      organizationId || 'default-org-id',
    );

    return {
      success: true,
      data: result,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Conversations
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /communication/conversations
   * جلب قائمة المحادثات
   */
  @Get('conversations')
  @ApiOperation({
    summary: 'جلب قائمة المحادثات',
    description: 'يجلب قائمة المحادثات مع دعم الفلترة والبحث',
  })
  @ApiQuery({
    name: 'status',
    description: 'فلترة حسب الحالة',
    enum: ConversationStatus,
    required: false,
  })
  @ApiQuery({
    name: 'channel',
    description: 'فلترة حسب القناة',
    enum: CommunicationChannel,
    required: false,
  })
  @ApiQuery({
    name: 'assignedToId',
    description: 'فلترة حسب المسؤول',
    required: false,
  })
  @ApiQuery({
    name: 'search',
    description: 'بحث',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    description: 'الصفحة',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'عدد النتائج',
    required: false,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'قائمة المحادثات',
  })
  async getConversations(
    @Query() dto: GetConversationsDto,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<{ success: boolean; data: ConversationListItemDto[]; meta: { total: number } }> {
    const { data, total } = await this.communicationService.getConversations(
      dto,
      organizationId,
    );

    return {
      success: true,
      data,
      meta: { total },
    };
  }

  /**
   * GET /communication/conversations/:id
   * جلب تفاصيل محادثة
   */
  @Get('conversations/:id')
  @ApiOperation({
    summary: 'جلب تفاصيل محادثة',
    description: 'يجلب تفاصيل محادثة مع جميع الرسائل',
  })
  @ApiResponse({
    status: 200,
    description: 'تفاصيل المحادثة',
  })
  @ApiResponse({
    status: 404,
    description: 'المحادثة غير موجودة',
    schema: {
      example: {
        success: false,
        error: {
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found',
          messageAr: 'المحادثة غير موجودة',
        },
      },
    },
  })
  async getConversation(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<{ success: boolean; data: ConversationDetailDto }> {
    const data = await this.communicationService.getConversation(id, organizationId);
    return { success: true, data };
  }

  /**
   * PATCH /communication/conversations/:id
   * تحديث محادثة
   */
  @Patch('conversations/:id')
  @ApiOperation({
    summary: 'تحديث محادثة',
    description: 'يحدث حالة المحادثة أو المسؤول عنها',
  })
  @ApiResponse({
    status: 200,
    description: 'تم تحديث المحادثة',
  })
  async updateConversation(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<{ success: boolean; data: ConversationListItemDto }> {
    const data = await this.communicationService.updateConversation(
      id,
      dto,
      organizationId,
    );
    return { success: true, data };
  }

  /**
   * POST /communication/conversations/:id/read
   * تحديد الرسائل كمقروءة
   */
  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'تحديد الرسائل كمقروءة',
    description: 'يحدد جميع رسائل المحادثة كمقروءة',
  })
  @ApiResponse({
    status: 200,
    description: 'تم تحديد الرسائل كمقروءة',
    schema: {
      example: {
        success: true,
        message: 'Messages marked as read',
      },
    },
  })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.communicationService.markAsRead(id, organizationId);
    return {
      success: true,
      message: 'Messages marked as read - تم تحديد الرسائل كمقروءة',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Messages
  // ═══════════════════════════════════════════════════════════════

  /**
   * POST /communication/messages
   * إرسال رسالة
   */
  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'إرسال رسالة',
    description: 'يرسل رسالة عبر WhatsApp أو قناة أخرى',
  })
  @ApiResponse({
    status: 201,
    description: 'تم إرسال الرسالة',
  })
  @ApiResponse({
    status: 404,
    description: 'المحادثة غير موجودة',
  })
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<{ success: boolean; data: MessageDto }> {
    const data = await this.communicationService.sendWhatsAppMessage(
      dto,
      organizationId,
      userId,
    );
    return { success: true, data };
  }
}
