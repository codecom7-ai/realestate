// ═══════════════════════════════════════════════════════════════
// Conversations Controller - واجهة المحادثات
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import {
  GetConversationsDto,
  UpdateConversationDto,
  ConversationCountsDto,
  SendMessageInConversationDto,
} from './dto/conversations.dto';

@ApiTags('المحادثات')
@ApiBearerAuth()
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  /**
   * GET /conversations
   * قائمة المحادثات
   */
  @Get()
  @ApiOperation({
    summary: 'قائمة المحادثات',
    description: 'الحصول على قائمة المحادثات مع الفلترة والبحث',
  })
  @ApiResponse({
    status: 200,
    description: 'قائمة المحادثات',
  })
  async findAll(
    @Query() query: GetConversationsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.conversationsService.findAll(organizationId, query);
  }

  /**
   * GET /conversations/counts
   * إحصائيات المحادثات
   */
  @Get('counts')
  @ApiOperation({
    summary: 'إحصائيات المحادثات',
    description: 'الحصول على عدد المحادثات حسب الحالة',
  })
  @ApiResponse({
    status: 200,
    description: 'إحصائيات المحادثات',
    type: ConversationCountsDto,
  })
  async getCounts(
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<ConversationCountsDto> {
    return this.conversationsService.getCounts(organizationId);
  }

  /**
   * GET /conversations/:id
   * تفاصيل محادثة
   */
  @Get(':id')
  @ApiOperation({
    summary: 'تفاصيل محادثة',
    description: 'الحصول على محادثة مع الرسائل',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف المحادثة',
  })
  @ApiResponse({
    status: 200,
    description: 'تفاصيل المحادثة',
  })
  @ApiResponse({
    status: 404,
    description: 'المحادثة غير موجودة',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query('messagesLimit') messagesLimit?: number,
  ) {
    return this.conversationsService.findOne(
      id,
      organizationId,
      messagesLimit || 50,
    );
  }

  /**
   * PATCH /conversations/:id
   * تحديث محادثة
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'تحديث محادثة',
    description: 'تحديث بيانات المحادثة',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف المحادثة',
  })
  @ApiResponse({
    status: 200,
    description: 'تم تحديث المحادثة',
  })
  @ApiResponse({
    status: 404,
    description: 'المحادثة غير موجودة',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.conversationsService.update(id, organizationId, dto);
  }

  /**
   * POST /conversations/:id/messages
   * إرسال رسالة في محادثة
   */
  @Post(':id/messages')
  @ApiOperation({
    summary: 'إرسال رسالة',
    description: 'إرسال رسالة جديدة في المحادثة',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف المحادثة',
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
    @Param('id') id: string,
    @Body() dto: SendMessageInConversationDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    // التحقق من وجود المحادثة
    const conversation = await this.conversationsService.findOne(
      id,
      organizationId,
    );

    // إضافة الرسالة
    const message = await this.conversationsService.addMessage(
      id,
      organizationId,
      {
        direction: 'outbound' as any,
        content: dto.content,
        contentType: dto.contentType,
        mediaUrl: dto.mediaUrl,
      },
    );

    // TODO: إرسال الرسالة عبر WhatsApp API

    return message;
  }

  /**
   * POST /conversations/:id/close
   * إغلاق محادثة
   */
  @Post(':id/close')
  @ApiOperation({
    summary: 'إغلاق محادثة',
    description: 'إغلاق المحادثة',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف المحادثة',
  })
  @ApiResponse({
    status: 200,
    description: 'تم إغلاق المحادثة',
  })
  async close(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.conversationsService.close(id, organizationId);
  }

  /**
   * POST /conversations/:id/reopen
   * إعادة فتح محادثة
   */
  @Post(':id/reopen')
  @ApiOperation({
    summary: 'إعادة فتح محادثة',
    description: 'إعادة فتح المحادثة',
  })
  @ApiParam({
    name: 'id',
    description: 'معرف المحادثة',
  })
  @ApiResponse({
    status: 200,
    description: 'تم إعادة فتح المحادثة',
  })
  async reopen(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.conversationsService.reopen(id, organizationId);
  }
}
