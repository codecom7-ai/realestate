// ═══════════════════════════════════════════════════════════════
// Conversations Service - إدارة المحادثات والرسائل
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  GetConversationsDto,
  CreateConversationDto,
  UpdateConversationDto,
  ConversationWithMessagesDto,
  ConversationCountsDto,
  SendMessageInConversationDto,
  ConversationChannel,
  ConversationStatus,
  MessageDirection,
  MessageContentType,
  MessageStatus,
} from './dto/conversations.dto';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * الحصول على قائمة المحادثات
   */
  async findAll(
    organizationId: string,
    query: GetConversationsDto,
  ): Promise<{ data: any[]; meta: { total: number; page: number; limit: number; hasMore: boolean } }> {
    const { channel, status, clientId, leadId, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
    };

    if (channel) {
      where.channel = channel;
    }

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (leadId) {
      where.leadId = leadId;
    }

    // البحث في المحتوى
    if (search) {
      where.messages = {
        some: {
          content: {
            contains: search,
            mode: 'insensitive',
          },
        },
      };
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          lead: {
            select: {
              id: true,
              stage: true,
              client: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
          messages: {
            orderBy: { sentAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return {
      data: conversations.map((conv: any) => ({
        ...conv,
        lastMessage: conv.messages[0] || null,
        messages: undefined,
      })),
      meta: {
        total,
        page,
        limit,
        hasMore: skip + conversations.length < total,
      },
    };
  }

  /**
   * الحصول على محادثة واحدة مع الرسائل
   */
  async findOne(
    id: string,
    organizationId: string,
    messagesLimit: number = 50,
  ): Promise<ConversationWithMessagesDto> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        lead: {
          select: {
            id: true,
            stage: true,
            client: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        messages: {
          orderBy: { sentAt: 'asc' },
          take: messagesLimit,
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

    // تحديث عدد الرسائل غير المقروءة إلى 0
    await this.prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });

    return conversation as any;
  }

  /**
   * إنشاء محادثة جديدة
   */
  async create(
    organizationId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationWithMessagesDto> {
    const conversation = await this.prisma.conversation.create({
      data: {
        organizationId,
        clientId: dto.clientId,
        leadId: dto.leadId,
        channel: dto.channel,
        externalId: dto.externalId,
        status: ConversationStatus.ACTIVE,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        lead: {
          select: {
            id: true,
            stage: true,
            client: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    this.eventEmitter.emit('conversation.created', {
      organizationId,
      conversationId: conversation.id,
    });

    return conversation as any;
  }

  /**
   * تحديث محادثة
   */
  async update(
    id: string,
    organizationId: string,
    dto: UpdateConversationDto,
  ): Promise<ConversationWithMessagesDto> {
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

    return this.prisma.conversation.update({
      where: { id },
      data: {
        clientId: dto.clientId,
        leadId: dto.leadId,
        channel: dto.channel,
        externalId: dto.externalId,
        status: dto.status,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        lead: {
          select: {
            id: true,
            stage: true,
            client: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    }) as any;
  }

  /**
   * البحث عن محادثة بالمعرف الخارجي
   */
  async findByExternalId(
    externalId: string,
    organizationId: string,
  ): Promise<ConversationWithMessagesDto | null> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        externalId,
        organizationId,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        lead: {
          select: {
            id: true,
            stage: true,
            client: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    return conversation as any;
  }

  /**
   * إضافة رسالة للمحادثة
   */
  async addMessage(
    conversationId: string,
    organizationId: string,
    data: {
      direction: MessageDirection;
      content: string;
      contentType?: MessageContentType;
      mediaUrl?: string;
      externalId?: string;
      status?: MessageStatus;
      metadata?: any;
    },
  ): Promise<any> {
    const message = await this.prisma.message.create({
      data: {
        organizationId,
        conversationId,
        direction: data.direction,
        content: data.content,
        contentType: data.contentType || MessageContentType.TEXT,
        mediaUrl: data.mediaUrl,
        externalId: data.externalId,
        status: data.status || MessageStatus.SENT,
        metadata: data.metadata,
      },
    });

    // تحديث المحادثة
    const updateData: any = {
      lastMessageAt: new Date(),
    };

    if (data.direction === MessageDirection.INBOUND) {
      updateData.unreadCount = { increment: 1 };
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: updateData,
    });

    this.eventEmitter.emit('message.created', {
      organizationId,
      conversationId,
      messageId: message.id,
      direction: data.direction,
    });

    return message;
  }

  /**
   * تحديث حالة الرسالة
   */
  async updateMessageStatus(
    externalId: string,
    organizationId: string,
    status: MessageStatus,
  ): Promise<any> {
    const message = await this.prisma.message.findFirst({
      where: { externalId, organizationId },
    });

    if (!message) {
      this.logger.warn(`Message not found for externalId: ${externalId}`);
      return null;
    }

    return this.prisma.message.update({
      where: { id: message.id },
      data: { status },
    });
  }

  /**
   * إحصائيات المحادثات
   */
  async getCounts(organizationId: string): Promise<ConversationCountsDto> {
    const [active, closed, archived, unreadResult] = await Promise.all([
      this.prisma.conversation.count({
        where: { organizationId, status: ConversationStatus.ACTIVE },
      }),
      this.prisma.conversation.count({
        where: { organizationId, status: ConversationStatus.CLOSED },
      }),
      this.prisma.conversation.count({
        where: { organizationId, status: ConversationStatus.ARCHIVED },
      }),
      this.prisma.conversation.aggregate({
        where: { organizationId },
        _sum: { unreadCount: true },
      }),
    ]);

    return {
      active,
      closed,
      archived,
      totalUnread: unreadResult._sum.unreadCount || 0,
    };
  }

  /**
   * إغلاق محادثة
   */
  async close(id: string, organizationId: string): Promise<any> {
    return this.update(id, organizationId, { status: ConversationStatus.CLOSED });
  }

  /**
   * إعادة فتح محادثة
   */
  async reopen(id: string, organizationId: string): Promise<any> {
    return this.update(id, organizationId, { status: ConversationStatus.ACTIVE });
  }
}
