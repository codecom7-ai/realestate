// ═══════════════════════════════════════════════════════════════
// Churn Risk Detection Service - خدمة كشف خطر فقدان العميل
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
import { IntentDetectionService } from './intent-detection.service';
import {
  AIFeature,
  AITaskType,
  AITier,
  ChurnRiskRequestDto,
  ChurnRiskResponseDto,
  RiskLevel,
  RiskFactor,
  RecoverySuggestion,
} from '../dto/ai.dto';
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
import ZAI from 'z-ai-web-dev-sdk';

// ═══════════════════════════════════════════════════════════════
// RISK LEVELS
// ═══════════════════════════════════════════════════════════════

export const RISK_LEVEL_AR: Record<RiskLevel, string> = {
  LOW: 'منخفض - عميل نشط',
  MEDIUM: 'متوسط - يحتاج متابعة',
  HIGH: 'مرتفع - خطر فقدان',
  CRITICAL: 'حرج - فقدان وشيك',
};

// ═══════════════════════════════════════════════════════════════
// RISK FACTORS CONFIGURATION
// ═══════════════════════════════════════════════════════════════

interface RiskFactorConfig {
  id: string;
  name: string;
  nameAr: string;
  weight: number;
  threshold: number;
  description: string;
}

const RISK_FACTORS_CONFIG: RiskFactorConfig[] = [
  {
    id: 'days_since_contact',
    name: 'Days Since Last Contact',
    nameAr: 'أيام منذ آخر تواصل',
    weight: 25,
    threshold: 7,
    description: 'Risk increases significantly after 7 days of no contact',
  },
  {
    id: 'unresponded_messages',
    name: 'Unresponded Messages',
    nameAr: 'رسائل بدون رد',
    weight: 20,
    threshold: 3,
    description: 'More than 3 unresponded messages indicates disengagement',
  },
  {
    id: 'stage_stuck_duration',
    name: 'Stage Stuck Duration',
    nameAr: 'مدة التوقف في المرحلة',
    weight: 15,
    threshold: 14,
    description: 'Staying in same stage for more than 14 days',
  },
  {
    id: 'negative_sentiment',
    name: 'Negative Sentiment',
    nameAr: 'مشاعر سلبية',
    weight: 15,
    threshold: 1,
    description: 'Negative language in recent messages',
  },
  {
    id: 'competitor_mentions',
    name: 'Competitor Mentions',
    nameAr: 'ذكر منافسين',
    weight: 10,
    threshold: 1,
    description: 'Mentioning other real estate agencies',
  },
  {
    id: 'price_objections',
    name: 'Price Objections',
    nameAr: 'اعتراضات على السعر',
    weight: 10,
    threshold: 2,
    description: 'Multiple price-related concerns',
  },
  {
    id: 'viewing_no_shows',
    name: 'Viewing No-Shows',
    nameAr: 'عدم حضور المعاينات',
    weight: 5,
    threshold: 1,
    description: 'Missed scheduled viewings without notice',
  },
];

// ═══════════════════════════════════════════════════════════════
// CHURN RISK DETECTION SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class ChurnRiskService {
  private readonly logger = new Logger(ChurnRiskService.name);
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
      this.logger.log('Churn Risk Detection AI initialized');
    } catch (error) {
      this.logger.error('Failed to initialize AI for churn risk', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DETECT CHURN RISK
  // ═══════════════════════════════════════════════════════════════

  /**
   * Detect churn risk for a lead
   */
  async detectChurnRisk(
    leadId: string,
    organizationId: string,
    userId: string,
    dto?: ChurnRiskRequestDto,
  ): Promise<ChurnRiskResponseDto> {
    // Check rate limit
    this.checkRateLimit(organizationId, userId);

    const startTime = Date.now();

    // Check cache
    const cacheKey = `churn-risk:${leadId}:${organizationId}`;
    const cached = await this.cacheService.get<ChurnRiskResponseDto>(cacheKey);
    if (cached && !dto?.forceRefresh) {
      return cached;
    }

    // Get lead with full context
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
          orderBy: { scheduledAt: 'desc' },
          take: 10,
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
      take: 50,
    });

    // Calculate risk factors
    const riskFactors = await this.calculateRiskFactors(lead, activities);

    // Get intent for additional context
    let intentResult = null;
    try {
      intentResult = await this.intentDetection.detectIntent(leadId, organizationId, userId);
    } catch (error) {
      this.logger.warn(`Could not get intent for lead ${leadId}`);
    }

    // Build context for AI analysis
    const context = this.buildChurnContext(lead, activities, riskFactors, intentResult);

    // Route to model
    const routingContext: RoutingContext = {
      feature: AIFeature.CHURN_RISK,
      taskType: AITaskType.COMPLETION,
      inputLength: context.length,
      requiresVision: false,
      requiresStreaming: false,
      priorityOverride: AITier.TIER_3_COMPLEX,
      complexityHints: {
        multiStepReasoning: true,
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

      const prompt = this.buildChurnPrompt(context, lead);
      inputTokens = this.estimateTokens(prompt);

      const completion = await this.zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: this.getChurnSystemPrompt(),
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

      const result = this.parseChurnResponse(response, lead, riskFactors);

      // Cache for 1 hour
      await this.cacheService.set(cacheKey, result, 3600);

      // Log usage
      await this.logUsage({
        organizationId,
        userId,
        leadId,
        feature: AIFeature.CHURN_RISK,
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
      this.logger.error(`Churn risk detection error: ${errorMessage}`);

      // Fallback to rule-based calculation
      return this.calculateRuleBasedRisk(lead, riskFactors);
    }
  }

  /**
   * Get all leads with high churn risk
   */
  async getChurnAlerts(
    organizationId: string,
    minRiskScore: number = 60,
  ): Promise<ChurnRiskResponseDto[]> {
    // Get all active leads
    const leads = await this.prisma.lead.findMany({
      where: {
        organizationId,
        deletedAt: null,
        stage: {
          notIn: [LeadStage.CLOSED_WON, LeadStage.CLOSED_LOST],
        },
      },
      include: {
        client: true,
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      take: 100,
    });

    const alerts: ChurnRiskResponseDto[] = [];

    for (const lead of leads) {
      try {
        // Quick risk calculation without AI
        const riskFactors = await this.calculateRiskFactors(lead, []);
        const riskScore = this.calculateRiskScore(riskFactors);

        if (riskScore >= minRiskScore) {
          alerts.push({
            leadId: lead.id,
            leadName: lead.client
              ? `${lead.client.firstName} ${lead.client.lastName}`
              : 'Unknown',
            assignedTo: lead.assignedTo
              ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
              : 'Unassigned',
            riskLevel: this.scoreToRiskLevel(riskScore),
            riskLevelAr: RISK_LEVEL_AR[this.scoreToRiskLevel(riskScore)],
            riskScore,
            riskFactors,
            recoverySuggestions: this.getQuickRecoverySuggestions(riskScore),
            urgency: riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : 'medium',
            model: 'rule-based',
            processingTimeMs: 0,
          });
        }
      } catch (error) {
        this.logger.error(`Error calculating churn risk for lead ${lead.id}`, error);
      }
    }

    // Sort by risk score descending
    return alerts.sort((a, b) => b.riskScore - a.riskScore);
  }

  // ═══════════════════════════════════════════════════════════════
  // RISK FACTOR CALCULATIONS
  // ═══════════════════════════════════════════════════════════════

  private async calculateRiskFactors(lead: any, activities: any[]): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    // 1. Days since last contact
    const lastActivity = activities[0];
    const daysSinceContact = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity.occurredAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    factors.push({
      id: 'days_since_contact',
      name: 'Days Since Last Contact',
      nameAr: 'أيام منذ آخر تواصل',
      value: daysSinceContact,
      score: Math.min(100, (daysSinceContact / 14) * 100),
      weight: 25,
      description: daysSinceContact > 7
        ? `لم يتم التواصل منذ ${daysSinceContact} أيام`
        : 'التواصل مستمر',
    });

    // 2. Unresponded messages
    let unrespondedCount = 0;
    if (lead.conversations) {
      for (const conv of lead.conversations) {
        const inboundMessages = conv.messages?.filter((m: any) => m.direction === 'inbound') || [];
        const outboundMessages = conv.messages?.filter((m: any) => m.direction === 'outbound') || [];

        // Check if last message is inbound and no response
        if (inboundMessages.length > 0 && outboundMessages.length > 0) {
          const lastInbound = inboundMessages[0];
          const responsesAfter = outboundMessages.filter(
            (m: any) => new Date(m.sentAt) > new Date(lastInbound.sentAt),
          );
          if (responsesAfter.length === 0) {
            unrespondedCount++;
          }
        }
      }
    }

    factors.push({
      id: 'unresponded_messages',
      name: 'Unresponded Messages',
      nameAr: 'رسائل بدون رد',
      value: unrespondedCount,
      score: Math.min(100, (unrespondedCount / 5) * 100),
      weight: 20,
      description: unrespondedCount > 0
        ? `${unrespondedCount} رسالة بدون رد`
        : 'جميع الرسائل تم الرد عليها',
    });

    // 3. Stage stuck duration
    const stageHistory = activities.filter((a) => a.activityType === 'stage_change');
    const daysInCurrentStage = stageHistory.length > 0
      ? Math.floor((Date.now() - new Date(stageHistory[0].occurredAt).getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    factors.push({
      id: 'stage_stuck_duration',
      name: 'Stage Stuck Duration',
      nameAr: 'مدة التوقف في المرحلة',
      value: daysInCurrentStage,
      score: Math.min(100, (daysInCurrentStage / 30) * 100),
      weight: 15,
      description: daysInCurrentStage > 14
        ? `في نفس المرحلة منذ ${daysInCurrentStage} أيام`
        : 'يتحرك في الـ Pipeline',
    });

    // 4. Viewing no-shows
    const noShows = lead.viewings?.filter((v: any) => v.status === 'no_show') || [];

    factors.push({
      id: 'viewing_no_shows',
      name: 'Viewing No-Shows',
      nameAr: 'عدم حضور المعاينات',
      value: noShows.length,
      score: Math.min(100, noShows.length * 30),
      weight: 5,
      description: noShows.length > 0
        ? `${noShows.length} معاينة لم يحضرها`
        : 'جميع المعاينات تمت',
    });

    // 5. Activity frequency trend
    const recentActivities = activities.filter(
      (a) => new Date(a.occurredAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    );
    const olderActivities = activities.filter((a) => {
      const date = new Date(a.occurredAt);
      return date < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) &&
             date > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    });

    const activityTrend = olderActivities.length > 0
      ? (recentActivities.length / olderActivities.length) * 100
      : 100;

    factors.push({
      id: 'activity_trend',
      name: 'Activity Trend',
      nameAr: 'اتجاه النشاط',
      value: activityTrend,
      score: Math.max(0, 100 - activityTrend),
      weight: 10,
      description: activityTrend < 50
        ? 'النشاط في تراجع'
        : 'النشاط مستقر',
    });

    // 6. Overall engagement score
    const totalInteractions = activities.length + (lead.viewings?.length || 0);
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    const avgInteractionsPerWeek = daysSinceCreated > 0
      ? (totalInteractions / daysSinceCreated) * 7
      : 0;

    factors.push({
      id: 'engagement_rate',
      name: 'Engagement Rate',
      nameAr: 'معدل التفاعل',
      value: avgInteractionsPerWeek,
      score: Math.max(0, 100 - avgInteractionsPerWeek * 20),
      weight: 10,
      description: avgInteractionsPerWeek < 2
        ? 'معدل تفاعل منخفض'
        : 'معدل تفاعل جيد',
    });

    return factors;
  }

  private calculateRiskScore(factors: RiskFactor[]): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      totalScore += factor.score * factor.weight;
      totalWeight += factor.weight;
    }

    return Math.round(totalScore / totalWeight);
  }

  private scoreToRiskLevel(score: number): RiskLevel {
    if (score >= 81) return 'CRITICAL';
    if (score >= 61) return 'HIGH';
    if (score >= 31) return 'MEDIUM';
    return 'LOW';
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  private buildChurnContext(
    lead: any,
    activities: any[],
    riskFactors: RiskFactor[],
    intentResult: any,
  ): string {
    const parts: string[] = [];

    parts.push(`## Lead Information`);
    parts.push(`- Stage: ${lead.stage}`);
    parts.push(`- AI Score: ${lead.aiScore || 'Not scored'}`);
    parts.push(`- Created: ${lead.createdAt}`);

    parts.push(`\n## Risk Factors`);
    for (const factor of riskFactors) {
      parts.push(`- ${factor.name}: ${factor.value} (Score: ${factor.score})`);
    }

    if (intentResult) {
      parts.push(`\n## Detected Intent`);
      parts.push(`- Primary: ${intentResult.primaryIntent}`);
      parts.push(`- Confidence: ${intentResult.confidenceScore}%`);
    }

    parts.push(`\n## Recent Activity Count: ${activities.length}`);

    return parts.join('\n');
  }

  private getChurnSystemPrompt(): string {
    return `You are an expert customer retention analyst for real estate. Analyze leads to detect churn risk and provide recovery recommendations.

Risk Levels:
- LOW (0-30): Active customer, normal engagement
- MEDIUM (31-60): Needs attention, declining engagement
- HIGH (61-80): At risk of losing, urgent attention needed
- CRITICAL (81-100): Imminent loss, immediate intervention required

Return ONLY valid JSON:
{
  "riskLevel": "HIGH",
  "riskScore": 75,
  "analysisSummary": "Summary in Arabic",
  "recoverySuggestions": [
    {"action": "Immediate call", "reasoning": "Why this will help", "priority": "urgent"}
  ],
  "predictedOutcome": "Likely outcome if no action taken",
  "keyWarningSignals": ["signal1", "signal2"]
}`;
  }

  private buildChurnPrompt(context: string, lead: any): string {
    return `Analyze this lead for churn risk:

${context}

Current calculated risk factors are provided. Validate and enhance the analysis.
Provide recovery recommendations that are actionable and specific.`;
  }

  private parseChurnResponse(
    response: string,
    lead: any,
    riskFactors: RiskFactor[],
  ): ChurnRiskResponseDto {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const riskScore = this.calculateRiskScore(riskFactors);
      const riskLevel = this.scoreToRiskLevel(riskScore);

      return {
        leadId: lead.id,
        leadName: lead.client
          ? `${lead.client.firstName} ${lead.client.lastName}`
          : 'Unknown',
        assignedTo: lead.assignedTo
          ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
          : 'Unassigned',
        riskLevel,
        riskLevelAr: RISK_LEVEL_AR[riskLevel],
        riskScore,
        riskFactors,
        recoverySuggestions: this.parseRecoverySuggestions(parsed.recoverySuggestions || []),
        urgency: riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : 'medium',
        analysisSummary: parsed.analysisSummary || 'تحليل خطر الفقدان',
        predictedOutcome: parsed.predictedOutcome,
        keyWarningSignals: parsed.keyWarningSignals || [],
        model: 'ai-analyzed',
        processingTimeMs: 0,
      };
    } catch (error) {
      this.logger.error('Failed to parse churn response', error);
      return this.calculateRuleBasedRisk(lead, riskFactors);
    }
  }

  private parseRecoverySuggestions(suggestions: any[]): RecoverySuggestion[] {
    return suggestions.slice(0, 5).map((s) => ({
      action: s.action || 'Monitor',
      reasoning: s.reasoning || '',
      priority: s.priority || 'medium',
    }));
  }

  private calculateRuleBasedRisk(lead: any, riskFactors: RiskFactor[]): ChurnRiskResponseDto {
    const riskScore = this.calculateRiskScore(riskFactors);
    const riskLevel = this.scoreToRiskLevel(riskScore);

    return {
      leadId: lead.id,
      leadName: lead.client
        ? `${lead.client.firstName} ${lead.client.lastName}`
        : 'Unknown',
      assignedTo: lead.assignedTo
        ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
        : 'Unassigned',
      riskLevel,
      riskLevelAr: RISK_LEVEL_AR[riskLevel],
      riskScore,
      riskFactors,
      recoverySuggestions: this.getQuickRecoverySuggestions(riskScore),
      urgency: riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : 'medium',
      model: 'rule-based',
      processingTimeMs: 0,
    };
  }

  private getQuickRecoverySuggestions(riskScore: number): RecoverySuggestion[] {
    if (riskScore >= 80) {
      return [
        { action: 'اتصال فوري من المدير', reasoning: 'العميل في خطر فقدان وشيك', priority: 'critical' },
        { action: 'عرض خاص أو حافز', reasoning: 'قد يحتاج دفعة إضافية', priority: 'high' },
        { action: 'متابعة شخصية', reasoning: 'يحتاج اهتمام خاص', priority: 'high' },
      ];
    } else if (riskScore >= 60) {
      return [
        { action: 'اتصال هاتفي اليوم', reasoning: 'إعادة تنشيط التواصل', priority: 'high' },
        { action: 'إرسال عقارات جديدة', reasoning: 'تجديد الاهتمام', priority: 'medium' },
        { action: 'طلب ملاحظات', reasoning: 'فهم احتياجاته الحالية', priority: 'medium' },
      ];
    } else if (riskScore >= 30) {
      return [
        { action: 'متابعة عبر واتساب', reasoning: 'الحفاظ على التواصل', priority: 'medium' },
        { action: 'تحديث التفضيلات', reasoning: 'تأكيد الاهتمام', priority: 'low' },
      ];
    }
    return [
      { action: 'متابعة دورية', reasoning: 'العميل نشط', priority: 'low' },
    ];
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 3);
  }

  private checkRateLimit(organizationId: string, userId: string) {
    const key = `${organizationId}:${userId}:churn-risk`;
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
          message: 'Rate limit exceeded for churn risk detection',
          messageAr: 'تم تجاوز حد الطلبات لكشف خطر الفقدان',
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
          tier: 3,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          costUsd: 0.01,
          latencyMs: params.latencyMs,
          success: params.success,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log AI usage', error);
    }
  }
}
