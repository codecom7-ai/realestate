// ═══════════════════════════════════════════════════════════════
// Intent Detection Service - خدمة كشف نية الشراء
// نظام تشغيل المكتب العقاري المصري
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService } from '../../../cache/cache.service';
import { AIRouterService, RoutingContext } from '../ai-router.service';
import {
  AIFeature,
  AITaskType,
  AITier,
  CustomerIntent,
  IntentDetectionRequestDto,
  IntentDetectionResponseDto,
  SecondaryIntent,
  RecommendedAction,
} from '../dto/ai.dto';
import ZAI from 'z-ai-web-dev-sdk';

// ═══════════════════════════════════════════════════════════════
// INTENT TYPES
// ═══════════════════════════════════════════════════════════════

export enum IntentType {
  BUY_NOW = 'BUY_NOW',                    // جاهز للشراء فوراً
  EXPLORING = 'EXPLORING',                // يستكشف الخيارات
  PRICE_SENSITIVE = 'PRICE_SENSITIVE',    // حساس للسعر
  LOCATION_FOCUSED = 'LOCATION_FOCUSED',  // يهتم بالموقع
  FINANCING_NEEDED = 'FINANCING_NEEDED',  // يحتاج تمويل
  NOT_INTERESTED = 'NOT_INTERESTED',      // غير مهتم
  COMPETITOR_COMPARISON = 'COMPETITOR_COMPARISON', // يقارن مع منافسين
  INVESTMENT = 'INVESTMENT',              // يستثمر
  RENTAL = 'RENTAL',                      // يبحث للإيجار
}

export const INTENT_AR: Record<IntentType, string> = {
  [IntentType.BUY_NOW]: 'جاهز للشراء فوراً',
  [IntentType.EXPLORING]: 'يستكشف الخيارات',
  [IntentType.PRICE_SENSITIVE]: 'حساس للسعر',
  [IntentType.LOCATION_FOCUSED]: 'يهتم بالموقع',
  [IntentType.FINANCING_NEEDED]: 'يحتاج تمويل',
  [IntentType.NOT_INTERESTED]: 'غير مهتم',
  [IntentType.COMPETITOR_COMPARISON]: 'يقارن مع منافسين',
  [IntentType.INVESTMENT]: 'يستثمر',
  [IntentType.RENTAL]: 'يبحث للإيجار',
};

// ═══════════════════════════════════════════════════════════════
// INTENT DETECTION SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class IntentDetectionService {
  private readonly logger = new Logger(IntentDetectionService.name);
  private zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

  // Rate limiting: 100 requests per hour per user
  private readonly rateLimitWindow = 3600000; // 1 hour in ms
  private readonly rateLimitMax = 100;
  private rateLimitStore = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private aiRouter: AIRouterService,
  ) {
    this.initializeAI();
  }

  private async initializeAI() {
    try {
      this.zai = await ZAI.create();
      this.logger.log('Intent Detection AI initialized');
    } catch (error) {
      this.logger.error('Failed to initialize AI for intent detection', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DETECT INTENT FROM CONVERSATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Detect customer intent from lead conversations
   */
  async detectIntent(
    leadId: string,
    organizationId: string,
    userId: string,
    dto?: IntentDetectionRequestDto,
  ): Promise<IntentDetectionResponseDto> {
    // Check rate limit
    this.checkRateLimit(organizationId, userId);

    const startTime = Date.now();

    // Check cache first
    const cacheKey = `intent:${leadId}:${organizationId}`;
    const cached = await this.cacheService.get<IntentDetectionResponseDto>(cacheKey);
    if (cached && !dto?.forceRefresh) {
      this.logger.log(`Returning cached intent for lead ${leadId}`);
      return cached;
    }

    // Get lead data with conversations and activities
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId },
      include: {
        client: true,
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        conversations: {
          include: {
            messages: {
              orderBy: { sentAt: 'desc' },
              take: 50,
            },
          },
          orderBy: { lastMessageAt: 'desc' },
          take: 5,
        },
        viewings: {
          take: 10,
          orderBy: { scheduledAt: 'desc' },
        },
      },
    });

    if (!lead) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found',
          messageAr: 'العميل المحتمل غير موجود',
        },
      });
    }

    // Get activities
    const activities = await this.prisma.activity.findMany({
      where: {
        entityType: 'lead',
        entityId: leadId,
        organizationId,
      },
      orderBy: { occurredAt: 'desc' },
      take: 30,
    });

    // Build conversation context
    const conversationContext = this.buildConversationContext(lead, activities);

    // Route to appropriate model
    const routingContext: RoutingContext = {
      feature: AIFeature.INTENT_DETECTION,
      taskType: AITaskType.COMPLETION,
      inputLength: conversationContext.length,
      requiresVision: false,
      requiresStreaming: false,
      priorityOverride: AITier.TIER_2_MODERATE,
      complexityHints: {
        dataAnalysis: true,
      },
    };

    const routing = this.aiRouter.route(routingContext);
    this.logger.log(`Intent detection routed to ${routing.model}`);

    let inputTokens = 0;
    let outputTokens = 0;
    let success = false;
    let errorMessage: string | undefined;

    try {
      if (!this.zai) {
        throw new Error('AI SDK not initialized');
      }

      const prompt = this.buildIntentDetectionPrompt(conversationContext, lead);
      inputTokens = this.estimateTokens(prompt);

      const completion = await this.zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: this.getIntentDetectionSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2048,
        temperature: 0.3,
      });

      const response = completion.choices?.[0]?.message?.content || '';
      outputTokens = this.estimateTokens(response);
      success = true;

      // Parse the response
      const result = this.parseIntentResponse(response, lead);

      // Cache for 1 hour
      await this.cacheService.set(cacheKey, result, 3600);

      // Log usage
      await this.logUsage({
        organizationId,
        userId,
        leadId,
        feature: AIFeature.INTENT_DETECTION,
        provider: routing.provider,
        model: routing.model,
        inputTokens,
        outputTokens,
        latencyMs: Date.now() - startTime,
        success,
      });

      return result;
    } catch (error: any) {
      errorMessage = error.message;
      this.logger.error(`Intent detection error: ${errorMessage}`);
      throw new InternalServerErrorException({
        success: false,
        error: {
          code: 'INTENT_DETECTION_ERROR',
          message: 'Failed to detect intent',
          messageAr: 'فشل في تحليل نية العميل',
          details: errorMessage,
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  private buildConversationContext(lead: any, activities: any[]): string {
    const parts: string[] = [];

    // Lead info
    parts.push(`## Lead Information`);
    parts.push(`- Stage: ${lead.stage}`);
    parts.push(`- Budget: ${lead.budget} ${lead.budgetCurrency}`);
    parts.push(`- Preferred Areas: ${lead.preferredAreas?.join(', ') || 'Not specified'}`);
    parts.push(`- Property Types: ${lead.propertyTypes?.join(', ') || 'Not specified'}`);
    parts.push(`- Expected Close Date: ${lead.expectedCloseDate || 'Not specified'}`);

    // Client info
    if (lead.client) {
      parts.push(`\n## Client Information`);
      parts.push(`- Name: ${lead.client.firstName} ${lead.client.lastName}`);
      parts.push(`- Phone: ${lead.client.phone}`);
      parts.push(`- VIP: ${lead.client.isVip ? 'Yes' : 'No'}`);
      parts.push(`- Source: ${lead.client.source || 'Unknown'}`);
    }

    // Conversations
    if (lead.conversations?.length > 0) {
      parts.push(`\n## Recent Conversations`);
      for (const conv of lead.conversations) {
        parts.push(`\nChannel: ${conv.channel}`);
        for (const msg of conv.messages?.slice(0, 20) || []) {
          const direction = msg.direction === 'inbound' ? 'Client' : 'Agent';
          parts.push(`[${direction}] ${msg.content}`);
        }
      }
    }

    // Activities
    if (activities.length > 0) {
      parts.push(`\n## Recent Activities`);
      for (const act of activities.slice(0, 15)) {
        parts.push(`- ${act.activityType}: ${act.title}`);
      }
    }

    // Viewings
    if (lead.viewings?.length > 0) {
      parts.push(`\n## Property Viewings`);
      for (const v of lead.viewings) {
        parts.push(`- Scheduled: ${v.scheduledAt}, Status: ${v.status}, Feedback: ${v.feedback || 'None'}`);
      }
    }

    return parts.join('\n');
  }

  private getIntentDetectionSystemPrompt(): string {
    return `You are an expert real estate customer intent analyzer. Analyze customer conversations and behaviors to detect their purchase intent.

Based on the provided context, identify:

1. **primary_intent**: The main customer intent (one of):
   - BUY_NOW: Ready to purchase immediately (urgent timeline, specific requirements, asking about next steps)
   - EXPLORING: Just browsing options (general questions, no urgency)
   - PRICE_SENSITIVE: Very focused on price/discounts (asking about price repeatedly, comparing prices)
   - LOCATION_FOCUSED: Location is the priority (asking about neighborhoods, amenities, accessibility)
   - FINANCING_NEEDED: Needs mortgage/financing (asking about payment plans, loans)
   - NOT_INTERESTED: Lost interest (stopped responding, negative feedback)
   - COMPETITOR_COMPARISON: Comparing with other agencies (mentioning competitors)
   - INVESTMENT: Looking for investment properties (asking about ROI, rental yield)
   - RENTAL: Looking to rent not buy

2. **confidence_score**: 0-100 confidence in your analysis

3. **secondary_intents**: Other intents detected (array)

4. **recommended_actions**: Specific actions to take

5. **key_signals**: Important signals from the conversations

Return ONLY valid JSON with this structure:
{
  "primary_intent": "BUY_NOW",
  "confidence_score": 85,
  "secondary_intents": ["PRICE_SENSITIVE"],
  "recommended_actions": [
    {"action": "CALL_NOW", "reason": "Client is ready to proceed"},
    {"action": "SEND_PROPERTY_LIST", "reason": "Client needs more options"}
  ],
  "key_signals": ["Asked about contract timeline", "Confirmed budget"],
  "analysis_summary": "Brief Arabic summary"
}`;
  }

  private buildIntentDetectionPrompt(context: string, lead: any): string {
    return `Analyze this real estate lead's conversations and behavior to detect their purchase intent:

${context}

Additional Context:
- Days since created: ${Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
- Current AI Score: ${lead.aiScore || 'Not scored'}

Provide a comprehensive intent analysis as JSON.`;
  }

  private parseIntentResponse(response: string, lead: any): IntentDetectionResponseDto {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Map string to enum
      let primaryIntent = IntentType.EXPLORING;
      if (Object.values(IntentType).includes(parsed.primary_intent as IntentType)) {
        primaryIntent = parsed.primary_intent;
      }

      return {
        primaryIntent: primaryIntent as CustomerIntent,
        primaryIntentAr: INTENT_AR[primaryIntent] || parsed.primary_intent,
        confidenceScore: Math.min(100, Math.max(0, parsed.confidence_score || 50)),
        secondaryIntents: this.parseSecondaryIntents(parsed.secondary_intents || []),
        recommendedActions: this.parseRecommendedActions(parsed.recommended_actions || []),
        keySignals: Array.isArray(parsed.key_signals) ? parsed.key_signals : [],
        analysisSummary: parsed.analysis_summary || 'تحليل نية العميل',
        leadId: lead.id,
        model: 'ai-analyzed',
        processingTimeMs: 0,
      };
    } catch (error) {
      this.logger.error('Failed to parse intent response', error);
      return {
        primaryIntent: IntentType.EXPLORING as CustomerIntent,
        primaryIntentAr: INTENT_AR[IntentType.EXPLORING],
        confidenceScore: 30,
        secondaryIntents: [],
        recommendedActions: [],
        keySignals: ['Unable to analyze - manual review recommended'],
        analysisSummary: 'فشل في التحليل التلقائي',
        leadId: lead.id,
        model: 'fallback',
        processingTimeMs: 0,
      };
    }
  }

  private parseSecondaryIntents(intents: string[]): SecondaryIntent[] {
    return intents
      .filter((i) => Object.values(IntentType).includes(i as IntentType))
      .map((intent) => ({
        intent: intent as CustomerIntent,
        intentAr: INTENT_AR[intent as IntentType] || intent,
        confidence: 60,
      }));
  }

  private parseRecommendedActions(actions: any[]): RecommendedAction[] {
    return actions.slice(0, 5).map((a) => ({
      action: a.action || 'MONITOR',
      reason: a.reason || '',
      priority: a.priority || 'medium',
    }));
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 3);
  }

  private checkRateLimit(organizationId: string, userId: string) {
    const key = `${organizationId}:${userId}:intent`;
    const now = Date.now();

    let record = this.rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + this.rateLimitWindow };
    }

    if (record.count >= this.rateLimitMax) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for intent detection',
          messageAr: 'تم تجاوز حد الطلبات لتحليل النوايا',
        },
      });
    }

    record.count++;
    this.rateLimitStore.set(key, record);
  }

  private async logUsage(params: {
    organizationId: string;
    userId: string;
    leadId: string;
    feature: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    success: boolean;
  }) {
    try {
      await this.prisma.aiUsageLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          feature: params.feature,
          provider: params.provider,
          model: params.model,
          tier: 2,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          costUsd: 0.005, // Estimated
          latencyMs: params.latencyMs,
          success: params.success,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log AI usage', error);
    }
  }
}
