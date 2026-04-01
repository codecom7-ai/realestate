// ═══════════════════════════════════════════════════════════════
// Communication Service - خدمة التواصل والرسائل
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  MessageDirection,
  MessageStatus,
  ConversationStatus,
  CommunicationChannel,
  CHANNEL_AR,
  CONVERSATION_STATUS_AR,
  MESSAGE_STATUS_AR,
  SendMessageDto,
  GetConversationsDto,
  UpdateConversationDto,
  ConversationListItemDto,
  ConversationDetailDto,
  MessageDto,
} from './dto/communication.dto';

// قنوات WhatsApp API
interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  businessAccountId: string;
}

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);
  private readonly whatsappConfig: WhatsAppConfig | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // تحميل إعدادات WhatsApp
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');
    const businessAccountId = this.configService.get<string>('WHATSAPP_BUSINESS_ACCOUNT_ID');

    if (accessToken && phoneNumberId && verifyToken) {
      this.whatsappConfig = {
        accessToken,
        phoneNumberId,
        verifyToken,
        businessAccountId: businessAccountId || '',
      };
      this.logger.log('WhatsApp configuration loaded successfully');
    } else {
      this.logger.warn('WhatsApp configuration not found - running in dev mode');
    }
  }

  /**
   * التحقق من WhatsApp verify token
   */
  verifyWhatsAppToken(mode: string, token: string, challenge: string): string | null {
    if (!this.whatsappConfig) {
      this.logger.warn('WhatsApp not configured - returning challenge for dev');
      return challenge;
    }

    if (mode === 'subscribe' && token === this.whatsappConfig.verifyToken) {
      this.logger.log('WhatsApp webhook verified successfully');
      return challenge;
    }

    this.logger.error('WhatsApp webhook verification failed');
    return null;
  }

  /**
   * معالجة رسالة WhatsApp واردة
   */
  async handleWhatsAppWebhook(
    payload: any,
    organizationId: string,
  ): Promise<{ received: boolean; messageId?: string }> {
    try {
      const entry = payload.entry?.[0];
      if (!entry) {
        return { received: false };
      }

      const changes = entry.changes?.[0];
      if (!changes) {
        return { received: false };
      }

      const value = changes.value;
      const messages = value.messages;

      if (!messages || messages.length === 0) {
        // قد يكون تحديث حالة رسالة
        const statuses = value.statuses;
        if (statuses && statuses.length > 0) {
          await this.handleMessageStatusUpdate(statuses, organizationId);
        }
        return { received: true };
      }

      // معالجة الرسائل الجديدة
      for (const message of messages) {
        await this.processIncomingMessage(message, value, organizationId);
      }

      return { received: true, messageId: messages[0]?.id };
    } catch (error) {
      this.logger.error('Error handling WhatsApp webhook:', error);
      return { received: false };
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
    const from = message.from; // رقم هاتف المرسل
    const messageId = message.id;
    const timestamp = message.timestamp;
    const type = message.type;

    // استخراج محتوى الرسالة
    let content = '';
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    if (type === 'text' && message.text) {
      content = message.text.body;
    } else if (type === 'image' && message.image) {
      mediaType = 'image';
      // سنجلب الـ URL لاحقاً عبر API
    } else if (type === 'video' && message.video) {
      mediaType = 'video';
    } else if (type === 'audio' && message.audio) {
      mediaType = 'audio';
    } else if (type === 'document' && message.document) {
      mediaType = 'document';
    } else if (type === 'location' && message.location) {
      content = `📍 الموقع: ${message.location.name || ''} ${message.location.address || ''}`;
    }

    // البحث عن أو إنشاء محادثة
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        organizationId,
        channel: CommunicationChannel.WHATSAPP,
        OR: [
          { client: { phone: from } },
          { externalId: from },
        ],
      },
    });

    // إذا لم توجد محادثة، نبحث عن عميل أو ننشئ Lead جديد
    if (!conversation) {
      // البحث عن عميل بهذا الرقم
      const client = await this.prisma.client.findFirst({
        where: {
          organizationId,
          OR: [
            { phone: from },
            { phone2: from },
          ],
        },
      });

      // إنشاء محادثة جديدة
      conversation = await this.prisma.conversation.create({
        data: {
          organizationId,
          clientId: client?.id,
          channel: CommunicationChannel.WHATSAPP,
          externalId: from,
          status: ConversationStatus.OPEN,
          lastMessageAt: new Date(parseInt(timestamp) * 1000),
          unreadCount: 1,
        },
      });

      // إذا لم يوجد عميل، ننشئ Lead جديد تلقائياً
      if (!client) {
        const contactInfo = value.contacts?.[0];
        const contactName = contactInfo?.profile?.name || from;

        // إنشاء عميل جديد
        const newClient = await this.prisma.client.create({
          data: {
            organizationId,
            firstName: contactName.split(' ')[0] || 'زبون',
            lastName: contactName.split(' ').slice(1).join(' ') || '',
            phone: from,
            source: 'whatsapp',
          },
        });

        // تحديث المحادثة بالـ clientId
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { clientId: newClient.id },
        });

        this.logger.log(`Created new client from WhatsApp: ${newClient.id}`);
      }
    } else {
      // تحديث المحادثة
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(parseInt(timestamp) * 1000),
          unreadCount: { increment: 1 },
          status: ConversationStatus.OPEN,
        },
      });
    }

    // إنشاء الرسالة
    await this.prisma.message.create({
      data: {
        organizationId,
        conversationId: conversation.id,
        direction: MessageDirection.INCOMING,
        status: MessageStatus.DELIVERED,
        content,
        mediaUrl,
        mediaType,
        externalId: messageId,
        sentAt: new Date(parseInt(timestamp) * 1000),
        deliveredAt: new Date(parseInt(timestamp) * 1000),
      },
    });

    this.logger.log(`Processed incoming WhatsApp message: ${messageId}`);
  }

  /**
   * معالجة تحديث حالة الرسالة
   */
  private async handleMessageStatusUpdate(
    statuses: any[],
    organizationId: string,
  ): Promise<void> {
    for (const status of statuses) {
      const messageId = status.id;
      const newStatus = status.status;
      const timestamp = status.timestamp;

      // تحديث حالة الرسالة
      const updateData: any = {};

      switch (newStatus) {
        case 'sent':
          updateData.status = MessageStatus.SENT;
          updateData.sentAt = new Date(parseInt(timestamp) * 1000);
          break;
        case 'delivered':
          updateData.status = MessageStatus.DELIVERED;
          updateData.deliveredAt = new Date(parseInt(timestamp) * 1000);
          break;
        case 'read':
          updateData.status = MessageStatus.READ;
          updateData.readAt = new Date(parseInt(timestamp) * 1000);
          break;
        case 'failed':
          updateData.status = MessageStatus.FAILED;
          updateData.failedAt = new Date(parseInt(timestamp) * 1000);
          updateData.failureReason = status.errors?.[0]?.title || 'Unknown error';
          break;
      }

      await this.prisma.message.updateMany({
        where: {
          organizationId,
          externalId: messageId,
        },
        data: updateData,
      });
    }
  }

  /**
   * إرسال رسالة WhatsApp
   */
  async sendWhatsAppMessage(
    dto: SendMessageDto,
    organizationId: string,
    userId: string,
  ): Promise<MessageDto> {
    // جلب المحادثة
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: dto.conversationId,
        organizationId,
      },
      include: {
        client: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException({
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found',
        messageAr: 'المحادثة غير موجودة',
      });
    }

    // إنشاء الرسالة في قاعدة البيانات
    const message = await this.prisma.message.create({
      data: {
        organizationId,
        conversationId: conversation.id,
        direction: MessageDirection.OUTGOING,
        status: MessageStatus.PENDING,
        content: dto.content,
        templateName: dto.templateName,
        templateParams: dto.templateParams ? JSON.stringify(dto.templateParams) : undefined,
        createdBy: userId,
      },
    });

    // إرسال الرسالة عبر WhatsApp API
    if (this.whatsappConfig && conversation.client?.phone) {
      try {
        const response = await this.sendToWhatsApp(
          conversation.client.phone,
          dto.content,
          dto.templateName,
          dto.templateParams,
        );

        // تحديث الرسالة بمعرف WhatsApp
        await this.prisma.message.update({
          where: { id: message.id },
          data: {
            externalId: response.messageId,
            status: MessageStatus.SENT,
            sentAt: new Date(),
          },
        });

        // تحديث المحادثة
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
          },
        });
      } catch (error) {
        this.logger.error('Failed to send WhatsApp message:', error);
        
        // تحديث حالة الرسالة إلى فاشل
        await this.prisma.message.update({
          where: { id: message.id },
          data: {
            status: MessageStatus.FAILED,
            failedAt: new Date(),
            failureReason: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    } else {
      // وضع التطوير - نحفظ الرسالة بدون إرسال
      await this.prisma.message.update({
        where: { id: message.id },
        data: {
          status: MessageStatus.SENT,
          sentAt: new Date(),
        },
      });
    }

    return this.mapMessageToDto(message);
  }

  /**
   * إرسال رسالة عبر WhatsApp API
   */
  private async sendToWhatsApp(
    to: string,
    content: string,
    templateName?: string,
    templateParams?: string[],
  ): Promise<{ messageId: string }> {
    if (!this.whatsappConfig) {
      throw new Error('WhatsApp not configured');
    }

    const url = `https://graph.facebook.com/v18.0/${this.whatsappConfig.phoneNumberId}/messages`;

    let body: any;

    if (templateName) {
      // رسالة قالبية
      body = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'ar' },
          components: templateParams
            ? [
                {
                  type: 'body',
                  parameters: templateParams.map((p) => ({ type: 'text', text: p })),
                },
              ]
            : [],
        },
      };
    } else {
      // رسالة نصية عادية
      body = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: content },
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.whatsappConfig.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to send message');
    }

    const data = await response.json();
    return { messageId: data.messages?.[0]?.id };
  }

  /**
   * جلب قائمة المحادثات
   */
  async getConversations(
    dto: GetConversationsDto,
    organizationId: string,
  ): Promise<{ data: ConversationListItemDto[]; total: number }> {
    const { status, channel, assignedToId, search, page = 1, limit = 20 } = dto;

    const where: any = {
      organizationId,
    };

    if (status) {
      where.status = status;
    }

    if (channel) {
      where.channel = channel;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    if (search) {
      where.OR = [
        { client: { firstName: { contains: search, mode: 'insensitive' } } },
        { client: { lastName: { contains: search, mode: 'insensitive' } } },
        { client: { phone: { contains: search } } },
      ];
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          client: true,
          lead: true,
          assignedTo: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    const data = conversations.map((c: any) => this.mapConversationToListItem(c));

    return { data, total };
  }

  /**
   * جلب تفاصيل محادثة
   */
  async getConversation(
    id: string,
    organizationId: string,
  ): Promise<ConversationDetailDto> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        client: true,
        lead: true,
        assignedTo: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException({
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found',
        messageAr: 'المحادثة غير موجودة',
      });
    }

    return this.mapConversationToDetail(conversation);
  }

  /**
   * تحديث محادثة
   */
  async updateConversation(
    id: string,
    dto: UpdateConversationDto,
    organizationId: string,
  ): Promise<ConversationListItemDto> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId },
    });

    if (!conversation) {
      throw new NotFoundException({
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found',
        messageAr: 'المحادثة غير موجودة',
      });
    }

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: {
        status: dto.status,
        assignedToId: dto.assignedToId,
      },
      include: {
        client: true,
        lead: true,
        assignedTo: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return this.mapConversationToListItem(updated);
  }

  /**
   * تحديد الرسائل كمقروءة
   */
  async markAsRead(conversationId: string, organizationId: string): Promise<void> {
    await this.prisma.conversation.update({
      where: {
        id: conversationId,
        organizationId,
      },
      data: {
        unreadCount: 0,
      },
    });

    // تحديث الرسائل الواردة كمقروءة
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        organizationId,
        direction: MessageDirection.INCOMING,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  /**
   * تحويل المحادثة إلى DTO
   */
  private mapConversationToListItem(c: any): ConversationListItemDto {
    return {
      id: c.id,
      channel: c.channel,
      channelAr: CHANNEL_AR[c.channel] || c.channel,
      status: c.status,
      statusAr: CONVERSATION_STATUS_AR[c.status] || c.status,
      clientName: c.client
        ? `${c.client.firstName} ${c.client.lastName}`
        : undefined,
      clientPhone: c.client?.phone,
      lastMessage: c.messages[0]?.content,
      lastMessageAt: c.lastMessageAt,
      unreadCount: c.unreadCount,
      assignedToName: c.assignedTo
        ? `${c.assignedTo.firstName} ${c.assignedTo.lastName}`
        : undefined,
      createdAt: c.createdAt,
    };
  }

  /**
   * تحويل المحادثة مع الرسائل إلى DTO
   */
  private mapConversationToDetail(c: any): ConversationDetailDto {
    return {
      id: c.id,
      channel: c.channel,
      status: c.status,
      clientId: c.clientId,
      clientName: c.client
        ? `${c.client.firstName} ${c.client.lastName}`
        : undefined,
      clientPhone: c.client?.phone,
      leadId: c.leadId,
      assignedToId: c.assignedToId,
      assignedToName: c.assignedTo
        ? `${c.assignedTo.firstName} ${c.assignedTo.lastName}`
        : undefined,
      unreadCount: c.unreadCount,
      messages: c.messages.map((m: any) => this.mapMessageToDto(m)),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  /**
   * تحويل الرسالة إلى DTO
   */
  private mapMessageToDto(m: any): MessageDto {
    return {
      id: m.id,
      direction: m.direction,
      status: m.status,
      statusAr: MESSAGE_STATUS_AR[m.status] || m.status,
      content: m.content,
      mediaUrl: m.mediaUrl,
      mediaType: m.mediaType,
      sentAt: m.sentAt,
      deliveredAt: m.deliveredAt,
      readAt: m.readAt,
      createdAt: m.createdAt,
    };
  }
}
