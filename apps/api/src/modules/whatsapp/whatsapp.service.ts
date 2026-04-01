// ═══════════════════════════════════════════════════════════════
// WhatsApp Service - التكامل مع واتساب بيزنس API
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationsService } from '../conversations/conversations.service';
import {
  WhatsAppWebhookDto,
  SendTextMessageDto,
  SendTemplateMessageDto,
  SendImageMessageDto,
  SendMessageResponseDto,
} from './dto/whatsapp.dto';
import { MessageDirection, MessageContentType, MessageStatus } from '../conversations/dto/conversations.dto';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';
  private phoneNumberId: string;
  private accessToken: string;
  private verifyToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly conversationsService: ConversationsService,
  ) {
    this.phoneNumberId = this.configService.get('WHATSAPP_PHONE_NUMBER_ID', '');
    this.accessToken = this.configService.get('WHATSAPP_ACCESS_TOKEN', '');
    this.verifyToken = this.configService.get('WHATSAPP_VERIFY_TOKEN', '');
  }

  /**
   * التحقق من Webhook
   */
  verifyWebhook(mode: string, token: string, challenge: string): string {
    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }
    throw new BadRequestException({
      code: 'WEBHOOK_VERIFICATION_FAILED',
      message: 'Webhook verification failed',
      messageAr: 'فشل التحقق من Webhook',
    });
  }

  /**
   * معالجة Webhook من واتساب
   */
  async handleWebhook(
    webhookData: WhatsAppWebhookDto,
    organizationId: string,
  ): Promise<void> {
    for (const entry of webhookData.entry) {
      for (const change of entry.changes) {
        // معالجة الرسائل الواردة
        if (change.value.messages && change.value.messages.length > 0) {
          for (const message of change.value.messages) {
            await this.processIncomingMessage(message, change.value, organizationId);
          }
        }

        // معالجة تحديثات حالة الرسالة
        if (change.value.statuses && change.value.statuses.length > 0) {
          for (const status of change.value.statuses) {
            await this.processMessageStatus(status, organizationId);
          }
        }
      }
    }
  }

  /**
   * معالجة رسالة واردة
   */
  private async processIncomingMessage(
    message: any,
    value: any,
    organizationId: string,
  ): Promise<void> {
    const phoneNumber = message.from;
    const messageId = message.id;
    const messageType = message.type;

    // استخراج معلومات جهة الاتصال
    let contactName = '';
    if (value.contacts && value.contacts.length > 0) {
      contactName = value.contacts[0].profile?.name || '';
    }

    // استخراج محتوى الرسالة
    let content = '';
    let contentType = MessageContentType.TEXT;
    let mediaUrl: string | undefined;

    switch (messageType) {
      case 'text':
        content = message.text?.body || '';
        break;
      case 'image':
        content = message.image?.caption || '';
        contentType = MessageContentType.IMAGE;
        break;
      case 'document':
        content = message.document?.filename || message.document?.caption || '';
        contentType = MessageContentType.DOCUMENT;
        break;
      case 'location':
        content = `الموقع: ${message.location?.name || ''}`;
        contentType = MessageContentType.LOCATION;
        break;
      default:
        content = `[رسالة من نوع: ${messageType}]`;
    }

    this.logger.log(`Processing message from ${phoneNumber}`);

    // البحث عن أو إنشاء محادثة
    let conversation = await this.conversationsService.findByExternalId(phoneNumber, organizationId);

    if (!conversation) {
      // البحث عن عميل برقم الهاتف
      const client = await this.prisma.client.findFirst({
        where: {
          organizationId,
          OR: [
            { phone: phoneNumber },
            { phone2: phoneNumber },
          ],
        },
      });

      // إنشاء محادثة جديدة
      conversation = await this.conversationsService.create(organizationId, {
        channel: 'whatsapp' as any,
        externalId: phoneNumber,
        clientId: client?.id,
      });

      // إذا لم يوجد عميل، إنشاء Lead جديد
      if (!client) {
        await this.createLeadFromWhatsApp(phoneNumber, contactName, organizationId, conversation.id);
      }
    }

    // إضافة الرسالة للمحادثة
    await this.conversationsService.addMessage(
      conversation.id,
      organizationId,
      {
        direction: MessageDirection.INBOUND,
        content,
        contentType,
        mediaUrl,
        externalId: messageId,
        status: MessageStatus.DELIVERED,
        metadata: {
          whatsappMessageType: messageType,
          contactName,
          timestamp: message.timestamp,
        },
      },
    );

    // إرسال حدث
    this.eventEmitter.emit('whatsapp.message.received', {
      organizationId,
      conversationId: conversation.id,
      phoneNumber,
    });
  }

  /**
   * إنشاء Lead من رسالة واتساب
   */
  private async createLeadFromWhatsApp(
    phoneNumber: string,
    name: string,
    organizationId: string,
    conversationId: string,
  ): Promise<void> {
    const nameParts = (name || 'عميل واتساب').split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || 'واتساب';

    // إنشاء عميل جديد
    const client = await this.prisma.client.create({
      data: {
        organizationId,
        firstName,
        lastName,
        phone: phoneNumber,
        source: 'whatsapp',
      },
    });

    // إنشاء Lead
    const lead = await this.prisma.lead.create({
      data: {
        organizationId,
        clientId: client.id,
        source: 'whatsapp',
        stage: 'NEW',
      },
    });

    // تحديث المحادثة بـ Lead ID
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { leadId: lead.id },
    });

    // إرسال حدث
    this.eventEmitter.emit('lead.created', {
      organizationId,
      leadId: lead.id,
      source: 'whatsapp',
    });
  }

  /**
   * معالجة تحديث حالة الرسالة
   */
  private async processMessageStatus(
    status: any,
    organizationId: string,
  ): Promise<void> {
    const messageId = status.id;
    const messageStatus = status.status;

    let systemStatus: MessageStatus;
    switch (messageStatus) {
      case 'sent':
        systemStatus = MessageStatus.SENT;
        break;
      case 'delivered':
        systemStatus = MessageStatus.DELIVERED;
        break;
      case 'read':
        systemStatus = MessageStatus.READ;
        break;
      case 'failed':
        systemStatus = MessageStatus.FAILED;
        break;
      default:
        return;
    }

    await this.conversationsService.updateMessageStatus(
      messageId,
      organizationId,
      systemStatus,
    );
  }

  /**
   * إرسال رسالة نصية
   */
  async sendTextMessage(
    organizationId: string,
    dto: SendTextMessageDto,
  ): Promise<SendMessageResponseDto> {
    const response = await this.callWhatsAppApi({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: dto.to,
      type: 'text',
      text: { body: dto.text, preview_url: false },
    });

    const messageId = response.messages[0].id;

    let conversationId = dto.conversationId;
    if (!conversationId) {
      const conversation = await this.conversationsService.findByExternalId(dto.to, organizationId);
      conversationId = conversation?.id;
    }

    if (conversationId) {
      await this.conversationsService.addMessage(
        conversationId,
        organizationId,
        {
          direction: MessageDirection.OUTBOUND,
          content: dto.text,
          contentType: MessageContentType.TEXT,
          externalId: messageId,
          status: MessageStatus.SENT,
        },
      );
    }

    return {
      messageId,
      id: '',
      status: 'sent',
      conversationId: conversationId || '',
    };
  }

  /**
   * إرسال رسالة من قالب
   */
  async sendTemplateMessage(
    organizationId: string,
    dto: SendTemplateMessageDto,
  ): Promise<SendMessageResponseDto> {
    const templateData: any = {
      name: dto.templateName,
      language: { code: dto.languageCode },
    };

    if (dto.components) {
      templateData.components = dto.components;
    }

    const response = await this.callWhatsAppApi({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: dto.to,
      type: 'template',
      template: templateData,
    });

    const messageId = response.messages[0].id;

    let conversationId = dto.conversationId;
    if (!conversationId) {
      const conversation = await this.conversationsService.findByExternalId(dto.to, organizationId);
      conversationId = conversation?.id;
    }

    if (conversationId) {
      await this.conversationsService.addMessage(
        conversationId,
        organizationId,
        {
          direction: MessageDirection.OUTBOUND,
          content: `[قالب: ${dto.templateName}]`,
          contentType: MessageContentType.TEMPLATE,
          externalId: messageId,
          status: MessageStatus.SENT,
        },
      );
    }

    return {
      messageId,
      id: '',
      status: 'sent',
      conversationId: conversationId || '',
    };
  }

  /**
   * إرسال صورة
   */
  async sendImageMessage(
    organizationId: string,
    dto: SendImageMessageDto,
  ): Promise<SendMessageResponseDto> {
    const imageData: any = dto.isUrl
      ? { link: dto.image }
      : { id: dto.image };

    if (dto.caption) {
      imageData.caption = dto.caption;
    }

    const response = await this.callWhatsAppApi({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: dto.to,
      type: 'image',
      image: imageData,
    });

    const messageId = response.messages[0].id;

    let conversationId = dto.conversationId;
    if (!conversationId) {
      const conversation = await this.conversationsService.findByExternalId(dto.to, organizationId);
      conversationId = conversation?.id;
    }

    if (conversationId) {
      await this.conversationsService.addMessage(
        conversationId,
        organizationId,
        {
          direction: MessageDirection.OUTBOUND,
          content: dto.caption || '[صورة]',
          contentType: MessageContentType.IMAGE,
          mediaUrl: dto.isUrl ? dto.image : undefined,
          externalId: messageId,
          status: MessageStatus.SENT,
        },
      );
    }

    return {
      messageId,
      id: '',
      status: 'sent',
      conversationId: conversationId || '',
    };
  }

  /**
   * استدعاء WhatsApp API
   */
  private async callWhatsAppApi(data: any): Promise<any> {
    if (!this.accessToken || !this.phoneNumberId) {
      this.logger.warn('WhatsApp API credentials not configured, returning mock response');
      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: data.to, wa_id: data.to }],
        messages: [{ id: `wamid.mock.${Date.now()}` }],
      };
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error(`WhatsApp API error: ${JSON.stringify(errorData)}`);
        throw new Error(`WhatsApp API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      this.logger.error(`Failed to call WhatsApp API: ${error}`);
      throw error;
    }
  }
}
