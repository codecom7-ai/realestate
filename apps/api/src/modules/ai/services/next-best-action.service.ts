// ═══════════════════════════════════════════════════════════════
// Next Best Action Service - خدمة اقتراح الخطوة التالية المثلى
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
import { IntentDetectionService, IntentType, INTENT_AR } from './intent-detection.service';
import {
  AIFeature,
  AITaskType,
  AITier,
  NextBestActionRequestDto,
  NextBestActionResponseDto,
  SuggestedAction,
  ActionPriority,
} from '../dto/ai.dto';
import ZAI from 'z-ai-web-dev-sdk';

// LeadStage enum - defined locally to avoid import issues
const LeadStage = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  PROPERTY_PRESENTED: 'PROPERTY_PRESENTED',
  VIEWING_SCHEDULED: 'VIEWING_SCHEDULED',
  VIEWED: 'VIEWED',
  NEGOTIATING: 'NEGOTIATING',
  RESERVED: 'RESERVED',
  CONTRACT_SENT: 'CONTRACT_SENT',
  CONTRACT_SIGNED: 'CONTRACT_SIGNED',
  CLOSED_WON: 'CLOSED_WON',
  CLOSED_LOST: 'CLOSED_LOST',
} as const;

type LeadStage = typeof LeadStage[keyof typeof LeadStage];

// ═══════════════════════════════════════════════════════════════
// ACTION TYPES
// ═══════════════════════════════════════════════════════════════

export enum ActionType {
  CALL_NOW = 'CALL_NOW',
  SEND_WHATSAPP = 'SEND_WHATSAPP',
  SCHEDULE_VIEWING = 'SCHEDULE_VIEWING',
  SEND_PROPERTY_LIST = 'SEND_PROPERTY_LIST',
  OFFER_DISCOUNT = 'OFFER_DISCOUNT',
  ESCALATE_TO_MANAGER = 'ESCALATE_TO_MANAGER',
  WAIT_AND_MONITOR = 'WAIT_AND_MONITOR',
  SEND_FOLLOWUP_EMAIL = 'SEND_FOLLOWUP_EMAIL',
  REQUEST_FEEDBACK = 'REQUEST_FEEDBACK',
  UPDATE_PREFERENCES = 'UPDATE_PREFERENCES',
  SEND_MARKET_UPDATE = 'SEND_MARKET_UPDATE',
  SCHEDULE_CALLBACK = 'SCHEDULE_CALLBACK',
}

export const ACTION_AR: Record<ActionType, string> = {
  [ActionType.CALL_NOW]: 'اتصل الآن',
  [ActionType.SEND_WHATSAPP]: 'أرسل واتساب',
  [ActionType.SCHEDULE_VIEWING]: 'جدولة معاينة',
  [ActionType.SEND_PROPERTY_LIST]: 'أرسل قائمة عقارات',
  [ActionType.OFFER_DISCOUNT]: 'عرض خصم',
  [ActionType.ESCALATE_TO_MANAGER]: 'رفع للمدير',
  [ActionType.WAIT_AND_MONITOR]: 'انتظر وراقب',
  [ActionType.SEND_FOLLOWUP_EMAIL]: 'أرسل إيميل متابعة',
  [ActionType.REQUEST_FEEDBACK]: 'اطلب ملاحظات',
  [ActionType.UPDATE_PREFERENCES]: 'تحديث التفضيلات',
  [ActionType.SEND_MARKET_UPDATE]: 'أرسل تحديث السوق',
  [ActionType.SCHEDULE_CALLBACK]: 'جدولة مكالمة لاحقة',
};

// ═══════════════════════════════════════════════════════════════
// STAGE-BASED ACTION MATRIX
// ═══════════════════════════════════════════════════════════════

const STAGE_ACTIONS: Record<LeadStage, ActionType[]> = {
  [LeadStage.NEW]: [ActionType.CALL_NOW, ActionType.SEND_WHATSAPP, ActionType.SEND_PROPERTY_LIST],
  [LeadStage.CONTACTED]: [ActionType.SEND_PROPERTY_LIST, ActionType.SCHEDULE_VIEWING, ActionType.SEND_WHATSAPP],
  [LeadStage.QUALIFIED]: [ActionType.SCHEDULE_VIEWING, ActionType.SEND_PROPERTY_LIST, ActionType.CALL_NOW],
  [LeadStage.PROPERTY_PRESENTED]: [ActionType.SCHEDULE_VIEWING, ActionType.REQUEST_FEEDBACK, ActionType.SEND_WHATSAPP],
  [LeadStage.VIEWING_SCHEDULED]: [ActionType.SEND_WHATSAPP, ActionType.REQUEST_FEEDBACK, ActionType.CALL_NOW],
  [LeadStage.VIEWED]: [ActionType.CALL_NOW, ActionType.SEND_WHATSAPP, ActionType.REQUEST_FEEDBACK],
  [LeadStage.NEGOTIATING]: [ActionType.CALL_NOW, ActionType.OFFER_DISCOUNT, ActionType.ESCALATE_TO_MANAGER],
  [LeadStage.RESERVED]: [ActionType.SEND_FOLLOWUP_EMAIL, ActionType.CALL_NOW, ActionType.REQUEST_FEEDBACK],
  [LeadStage.CONTRACT_SENT]: [ActionType.CALL_NOW, ActionType.SEND_FOLLOWUP_EMAIL, ActionType.SEND_WHATSAPP],
  [LeadStage.CONTRACT_SIGNED]: [ActionType.SEND_FOLLOWUP_EMAIL, ActionType.REQUEST_FEEDBACK, ActionType.SEND_MARKET_UPDATE],
  [LeadStage.CLOSED_WON]: [ActionType.SEND_FOLLOWUP_EMAIL, ActionType.SEND_MARKET_UPDATE, ActionType.REQUEST_FEEDBACK],
  [LeadStage.CLOSED_LOST]: [ActionType.SEND_FOLLOWUP_EMAIL, ActionType.WAIT_AND_MONITOR, ActionType.UPDATE_PREFERENCES],
};

// ═══════════════════════════════════════════════════════════════
// NEXT BEST ACTION SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class NextBestActionService {
  private readonly logger = new Logger(NextBestActionService.name);
  private zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

  // Rate limiting: 100 requests per hour per user
  private readonly rateLimitWindow = 3600000;
  private readonly rateLimitMax = 100;
  private rateLimitStore = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private aiRouter: AIRouterService,
    private intentDetection: IntentDetectionService,
  ) {
    this.initializeAI();
  }

  private async initializeAI() {
    try {
      this.zai = await ZAI.create();
      this.logger.log('Next Best Action AI initialized');
    } catch (error) {
      this.logger.error('Failed to initialize AI for next best action', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // GET NEXT BEST ACTION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get recommended next action for a lead
   */
  async getNextAction(
    leadId: string,
    organizationId: string,
    userId: string,
    dto?: NextBestActionRequestDto,
  ): Promise<NextBestActionResponseDto> {
    // Check rate limit
    this.checkRateLimit(organizationId, userId);

    const startTime = Date.now();

    // Check cache
    const cacheKey = `next-action:${leadId}:${organizationId}`;
    const cached = await this.cacheService.get<NextBestActionResponseDto>(cacheKey);
    if (cached && !dto?.forceRefresh) {
      return cached;
    }

    // Get lead with full context
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId },
      include: {
        client: true,
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        viewings: {
          orderBy: { scheduledAt: 'desc' },
          take: 10,
        },
        conversations: {
          include: {
            messages: {
              orderBy: { sentAt: 'desc' },
              take: 20,
            },
          },
          orderBy: { lastMessageAt: 'desc' },
          take: 3,
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

    // Get activities for context
    const activities = await this.prisma.activity.findMany({
      where: {
        entityType: 'lead',
        entityId: leadId,
        organizationId,
      },
      orderBy: { occurredAt: 'desc' },
      take: 20,
    });

    // Get last activity
    const lastActivity = activities[0];

    // Calculate urgency based on inactivity
    const daysSinceLastContact = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity.occurredAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Get intent if available
    let intentResult = null;
    try {
      intentResult = await this.intentDetection.detectIntent(leadId, organizationId, userId);
    } catch (error) {
      this.logger.warn(`Could not get intent for lead ${leadId}`);
    }

    // Build context for AI
    const context = this.buildActionContext(lead, activities, lastActivity, daysSinceLastContact, intentResult);

    // Route to model
    const routingContext: RoutingContext = {
      feature: AIFeature.NEXT_BEST_ACTION,
      taskType: AITaskType.COMPLETION,
      inputLength: context.length,
      requiresVision: false,
      requiresStreaming: false,
      priorityOverride: AITier.TIER_2_MODERATE,
      complexityHints: {
        dataAnalysis: true,
      },
    };

    const routing = this.aiRouter.route(routingContext);

    let inputTokens = 0;
    let outputTokens = 0;
    let success = false;
    let errorMessage: string | undefined;

    try {
      if (!this.zai) {
        throw new Error('AI SDK not initialized');
      }

      const prompt = this.buildActionPrompt(context, lead);
      inputTokens = this.estimateTokens(prompt);

      const completion = await this.zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: this.getActionSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2048,
        temperature: 0.4,
      });

      const response = completion.choices?.[0]?.message?.content || '';
      outputTokens = this.estimateTokens(response);
      success = true;

      const result = this.parseActionResponse(response, lead, daysSinceLastContact);

      // Cache for 30 minutes
      await this.cacheService.set(cacheKey, result, 1800);

      // Log usage
      await this.logUsage({
        organizationId,
        userId,
        leadId,
        feature: AIFeature.NEXT_BEST_ACTION,
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
      this.logger.error(`Next best action error: ${errorMessage}`);

      // Fallback to rule-based action
      const fallbackResult = this.getFallbackAction(lead, daysSinceLastContact, intentResult);
      return fallbackResult;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  private buildActionContext(
    lead: any,
    activities: any[],
    lastActivity: any,
    daysSinceLastContact: number,
    intentResult: any,
  ): string {
    const parts: string[] = [];

    // Lead info
    parts.push(`## Lead Status`);
    parts.push(`- Stage: ${lead.stage}`);
    parts.push(`- Days Since Creation: ${Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))}`);
    parts.push(`- Days Since Last Contact: ${daysSinceLastContact}`);
    parts.push(`- AI Score: ${lead.aiScore || 'Not scored'}`);
    parts.push(`- Budget: ${lead.budget} ${lead.budgetCurrency}`);

    // Last activity
    if (lastActivity) {
      parts.push(`\n## Last Activity`);
      parts.push(`- Type: ${lastActivity.activityType}`);
      parts.push(`- Title: ${lastActivity.title}`);
      parts.push(`- Date: ${lastActivity.occurredAt}`);
    }

    // Intent
    if (intentResult) {
      parts.push(`\n## Detected Intent`);
      parts.push(`- Primary Intent: ${intentResult.primaryIntent} (${intentResult.primaryIntentAr})`);
      parts.push(`- Confidence: ${intentResult.confidenceScore}%`);
    }

    // Recent activities summary
    if (activities.length > 0) {
      parts.push(`\n## Recent Activity Summary`);
      const activityTypes = activities.slice(0, 10).map((a) => a.activityType);
      const typeCounts = activityTypes.reduce((acc: any, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      Object.entries(typeCounts).forEach(([type, count]) => {
        parts.push(`- ${type}: ${count} times`);
      });
    }

    // Viewings
    if (lead.viewings?.length > 0) {
      parts.push(`\n## Viewings`);
      parts.push(`- Total: ${lead.viewings.length}`);
      const recent = lead.viewings[0];
      parts.push(`- Last Viewing: ${recent?.scheduledAt}, Status: ${recent?.status}`);
    }

    return parts.join('\n');
  }

  private getActionSystemPrompt(): string {
    return `You are an expert real estate sales strategist. Based on the lead's current state, history, and detected intent, recommend the optimal next action.

Consider:
1. Current pipeline stage
2. Time since last contact (urgency)
3. Detected customer intent
4. Historical patterns
5. Lead score

Available actions:
- CALL_NOW: Immediate phone call
- SEND_WHATSAPP: WhatsApp message
- SCHEDULE_VIEWING: Arrange property viewing
- SEND_PROPERTY_LIST: Send matching properties
- OFFER_DISCOUNT: Propose price reduction
- ESCALATE_TO_MANAGER: Escalate for support
- WAIT_AND_MONITOR: No immediate action needed
- SEND_FOLLOWUP_EMAIL: Email follow-up
- REQUEST_FEEDBACK: Ask for feedback
- UPDATE_PREFERENCES: Update client preferences
- SEND_MARKET_UPDATE: Share market news
- SCHEDULE_CALLBACK: Schedule future call

Priority levels: urgent, high, medium, low

Return ONLY valid JSON:
{
  "action": "CALL_NOW",
  "priority": "high",
  "reasoning": "Detailed reasoning in Arabic",
  "reasoningEn": "Detailed reasoning in English",
  "suggestedTemplate": "whatsapp_followup_1",
  "alternativeActions": [
    {"action": "SEND_WHATSAPP", "priority": "medium", "reasoning": "Reason"}
  ],
  "bestTimeToAct": "now",
  "expectedOutcome": "Expected outcome description"
}`;
  }

  private buildActionPrompt(context: string, lead: any): string {
    return `Analyze this lead and recommend the best next action:

${context}

Lead preferences:
- Areas: ${lead.preferredAreas?.join(', ') || 'Not specified'}
- Property Types: ${lead.propertyTypes?.join(', ') || 'Not specified'}
- Budget Range: ${lead.minSize || '?'} - ${lead.maxSize || '?'} m²

What is the optimal next action? Consider urgency, effectiveness, and customer preferences.`;
  }

  private parseActionResponse(
    response: string,
    lead: any,
    daysSinceLastContact: number,
  ): NextBestActionResponseDto {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        action: parsed.action || ActionType.WAIT_AND_MONITOR,
        actionAr: ACTION_AR[parsed.action as ActionType] || parsed.action,
        priority: this.validatePriority(parsed.priority),
        reasoning: parsed.reasoning || 'يحتاج العميل للمتابعة',
        reasoningEn: parsed.reasoningEn || 'Client needs follow-up',
        suggestedTemplate: parsed.suggestedTemplate,
        alternativeActions: this.parseAlternativeActions(parsed.alternativeActions || []),
        bestTimeToAct: parsed.bestTimeToAct || 'now',
        expectedOutcome: parsed.expectedOutcome,
        leadId: lead.id,
        leadStage: lead.stage,
        daysSinceLastContact,
        model: 'ai-analyzed',
        processingTimeMs: 0,
      };
    } catch (error) {
      this.logger.error('Failed to parse action response', error);
      return this.getFallbackAction(lead, daysSinceLastContact, null);
    }
  }

  private validatePriority(priority: string): ActionPriority {
    if (['urgent', 'high', 'medium', 'low'].includes(priority)) {
      return priority as ActionPriority;
    }
    return 'medium';
  }

  private parseAlternativeActions(actions: any[]): SuggestedAction[] {
    return actions.slice(0, 3).map((a) => ({
      action: a.action || ActionType.WAIT_AND_MONITOR,
      actionAr: ACTION_AR[a.action as ActionType] || a.action,
      priority: this.validatePriority(a.priority),
      reasoning: a.reasoning || '',
    }));
  }

  private getFallbackAction(
    lead: any,
    daysSinceLastContact: number,
    intentResult: any,
  ): NextBestActionResponseDto {
    // Rule-based fallback
    const stageActions = STAGE_ACTIONS[lead.stage as LeadStage] || [ActionType.WAIT_AND_MONITOR];

    let selectedAction = stageActions[0];
    let priority: ActionPriority = 'medium';

    // Adjust based on inactivity
    if (daysSinceLastContact > 7) {
      priority = 'high';
      selectedAction = ActionType.CALL_NOW;
    } else if (daysSinceLastContact > 3) {
      priority = 'medium';
      selectedAction = ActionType.SEND_WHATSAPP;
    }

    // Adjust based on intent
    if (intentResult?.primaryIntent === IntentType.BUY_NOW) {
      priority = 'urgent';
      selectedAction = ActionType.CALL_NOW;
    } else if (intentResult?.primaryIntent === IntentType.NOT_INTERESTED) {
      priority = 'low';
      selectedAction = ActionType.WAIT_AND_MONITOR;
    }

    return {
      action: selectedAction,
      actionAr: ACTION_AR[selectedAction],
      priority,
      reasoning: `بناءً على مرحلة ${lead.stage} وآخر نشاط منذ ${daysSinceLastContact} أيام`,
      reasoningEn: `Based on ${lead.stage} stage and ${daysSinceLastContact} days since last contact`,
      alternativeActions: stageActions.slice(1, 3).map((action) => ({
        action,
        actionAr: ACTION_AR[action],
        priority: 'medium' as ActionPriority,
        reasoning: 'بديل مقترح',
      })),
      leadId: lead.id,
      leadStage: lead.stage,
      daysSinceLastContact,
      model: 'rule-based',
      processingTimeMs: 0,
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 3);
  }

  private checkRateLimit(organizationId: string, userId: string) {
    const key = `${organizationId}:${userId}:next-action`;
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
          message: 'Rate limit exceeded for next best action',
          messageAr: 'تم تجاوز حد الطلبات للاقتراحات',
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
          costUsd: 0.005,
          latencyMs: params.latencyMs,
          success: params.success,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log AI usage', error);
    }
  }
}
