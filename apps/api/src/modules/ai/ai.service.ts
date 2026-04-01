// ═══════════════════════════════════════════════════════════════
// AI Service - نظام تشغيل المكتب العقاري المصري
// Core AI functionality with usage logging and rate limiting
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AIRouterService, RoutingContext } from './ai-router.service';
import {
  AIFeature,
  AITaskType,
  AITier,
  CopilotRequestDto,
  CopilotResponseDto,
  LeadScoringRequestDto,
  LeadScoringResponseDto,
  SummarizeRequestDto,
  SummarizeResponseDto,
  ExtractRequestDto,
  ExtractResponseDto,
  AIUsageStatsDto,
  RateLimitStatusDto,
  SummaryStyle,
} from './dto/ai.dto';
import ZAI from 'z-ai-web-dev-sdk';

// ═══════════════════════════════════════════════════════════════
// RATE LIMITING CONFIGURATION
// ═══════════════════════════════════════════════════════════════

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  [AIFeature.COPILOT]: { windowMs: 60000, maxRequests: 60 }, // 60/min
  [AIFeature.LEAD_SCORING]: { windowMs: 60000, maxRequests: 30 }, // 30/min
  [AIFeature.SUMMARIZE]: { windowMs: 60000, maxRequests: 60 }, // 60/min
  [AIFeature.EXTRACT]: { windowMs: 60000, maxRequests: 60 }, // 60/min
  [AIFeature.INTENT_DETECTION]: { windowMs: 3600000, maxRequests: 100 }, // 100/hour
  [AIFeature.NEXT_BEST_ACTION]: { windowMs: 3600000, maxRequests: 100 }, // 100/hour
  [AIFeature.CHURN_RISK]: { windowMs: 3600000, maxRequests: 100 }, // 100/hour
};

// Track requests in memory (could use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// ═══════════════════════════════════════════════════════════════
// AI SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private aiRouter: AIRouterService,
  ) {
    this.initializeAI();
  }

  /**
   * Initialize AI SDK
   */
  private async initializeAI() {
    try {
      this.zai = await ZAI.create();
      this.logger.log('AI SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AI SDK', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // COPILOT (Streaming Chat)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Process copilot request with streaming
   */
  async *copilotStream(
    dto: CopilotRequestDto,
    organizationId: string,
    userId: string,
  ): AsyncGenerator<string> {
    // Check rate limit
    this.checkRateLimit(AIFeature.COPILOT, organizationId, userId);

    const startTime = Date.now();

    // Route to appropriate model
    const routingContext: RoutingContext = {
      feature: AIFeature.COPILOT,
      taskType: AITaskType.STREAMING,
      inputLength: this.calculateInputLength(dto.messages),
      requiresVision: false,
      requiresStreaming: true,
    };

    const routing = this.aiRouter.route(routingContext);
    this.logger.log(`Copilot routed to ${routing.model} (tier ${routing.tier})`);

    let inputTokens = 0;
    let outputTokens = 0;
    let fullResponse = '';
    let success = false;
    let errorMessage: string | undefined;

    try {
      if (!this.zai) {
        throw new Error('AI SDK not initialized');
      }

      // Build messages for the API
      const messages = dto.messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      // Add context if provided
      if (dto.context) {
        messages.unshift({
          role: 'system',
          content: this.buildContextPrompt(dto.context),
        });
      }

      // Add custom system prompt
      if (dto.systemPrompt) {
        messages.unshift({
          role: 'system',
          content: dto.systemPrompt,
        });
      }

      // Estimate input tokens
      inputTokens = this.estimateTokens(messages.map((m) => m.content).join(''));

      // Create streaming completion
      const stream = await this.zai.chat.completions.create({
        messages,
        max_tokens: dto.maxTokens || 2048,
        temperature: dto.temperature || 0.7,
        stream: true,
      });

      // Stream the response
      for await (const chunk of stream as any) {
        const content = chunk.choices?.[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          // Yield SSE formatted data
          yield `data: ${JSON.stringify({ content })}\n\n`;
        }
      }

      outputTokens = this.estimateTokens(fullResponse);
      success = true;

      // Send done event
      yield `data: ${JSON.stringify({ done: true })}\n\n`;
    } catch (error: any) {
      errorMessage = error.message;
      this.logger.error(`Copilot error: ${errorMessage}`);
      yield `data: ${JSON.stringify({ error: errorMessage })}\n\n`;
    } finally {
      // Log usage
      await this.logUsage({
        organizationId,
        userId,
        feature: AIFeature.COPILOT,
        provider: routing.provider,
        model: routing.model,
        tier: routing.tier,
        inputTokens,
        outputTokens,
        latencyMs: Date.now() - startTime,
        success,
        errorMessage,
      });
    }
  }

  /**
   * Process copilot request without streaming
   */
  async copilot(
    dto: CopilotRequestDto,
    organizationId: string,
    userId: string,
  ): Promise<CopilotResponseDto> {
    // Check rate limit
    this.checkRateLimit(AIFeature.COPILOT, organizationId, userId);

    const startTime = Date.now();

    // Route to appropriate model
    const routingContext: RoutingContext = {
      feature: AIFeature.COPILOT,
      taskType: AITaskType.CHAT,
      inputLength: this.calculateInputLength(dto.messages),
      requiresVision: false,
      requiresStreaming: false,
    };

    const routing = this.aiRouter.route(routingContext);

    let inputTokens = 0;
    let outputTokens = 0;
    let success = false;
    let errorMessage: string | undefined;
    let content = '';

    try {
      if (!this.zai) {
        throw new Error('AI SDK not initialized');
      }

      // Build messages
      const messages: any[] = dto.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      if (dto.context) {
        messages.unshift({
          role: 'system',
          content: this.buildContextPrompt(dto.context),
        });
      }

      if (dto.systemPrompt) {
        messages.unshift({
          role: 'system',
          content: dto.systemPrompt,
        });
      }

      inputTokens = this.estimateTokens(messages.map((m: any) => m.content).join(''));

      const completion = await this.zai.chat.completions.create({
        messages,
        max_tokens: dto.maxTokens || 2048,
        temperature: dto.temperature || 0.7,
      });

      content = completion.choices?.[0]?.message?.content || '';
      outputTokens = this.estimateTokens(content);
      success = true;
    } catch (error: any) {
      errorMessage = error.message;
      this.logger.error(`Copilot error: ${errorMessage}`);
      throw new InternalServerErrorException({
        success: false,
        error: {
          code: 'AI_ERROR',
          message: 'Failed to process copilot request',
          messageAr: 'فشل في معالجة طلب المساعد',
          details: errorMessage,
        },
      });
    } finally {
      await this.logUsage({
        organizationId,
        userId,
        feature: AIFeature.COPILOT,
        provider: routing.provider,
        model: routing.model,
        tier: routing.tier,
        inputTokens,
        outputTokens,
        latencyMs: Date.now() - startTime,
        success,
        errorMessage,
      });
    }

    return {
      content,
      model: routing.model,
      provider: routing.provider,
      tier: routing.tier,
      inputTokens,
      outputTokens,
      latencyMs: Date.now() - startTime,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // LEAD SCORING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calculate AI score for a lead
   */
  async scoreLead(
    leadId: string,
    dto: LeadScoringRequestDto,
    organizationId: string,
    userId: string,
  ): Promise<LeadScoringResponseDto> {
    // Check rate limit
    this.checkRateLimit(AIFeature.LEAD_SCORING, organizationId, userId);

    const startTime = Date.now();

    // Get lead data
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId },
      include: {
        client: true,
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        viewings: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found',
          messageAr: 'الـ Lead غير موجود',
        },
      });
    }

    // Route to appropriate model (use tier 3+ for lead scoring)
    const routingContext: RoutingContext = {
      feature: AIFeature.LEAD_SCORING,
      taskType: AITaskType.COMPLETION,
      inputLength: JSON.stringify(lead).length,
      requiresVision: false,
      requiresStreaming: false,
      priorityOverride: AITier.TIER_3_COMPLEX,
      complexityHints: {
        multiStepReasoning: true,
        dataAnalysis: true,
      },
    };

    const routing = this.aiRouter.route(routingContext);
    this.logger.log(`Lead scoring routed to ${routing.model}`);

    let inputTokens = 0;
    let outputTokens = 0;
    let success = false;
    let errorMessage: string | undefined;

    try {
      if (!this.zai) {
        throw new Error('AI SDK not initialized');
      }

      const prompt = this.buildLeadScoringPrompt(lead, dto.additionalContext);
      inputTokens = this.estimateTokens(prompt);

      const completion = await this.zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: this.getLeadScoringSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2048,
        temperature: 0.3, // Lower temperature for more consistent scoring
      });

      const response = completion.choices?.[0]?.message?.content || '';
      outputTokens = this.estimateTokens(response);
      success = true;

      // Parse the response
      const result = this.parseLeadScoringResponse(response);

      // Update lead with AI score
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          aiScore: result.score,
          aiScoreDetails: result as any,
        },
      });

      return {
        ...result,
        model: routing.model,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      errorMessage = error.message;
      this.logger.error(`Lead scoring error: ${errorMessage}`);
      throw new InternalServerErrorException({
        success: false,
        error: {
          code: 'AI_SCORING_ERROR',
          message: 'Failed to score lead',
          messageAr: 'فشل في تقييم الـ Lead',
          details: errorMessage,
        },
      });
    } finally {
      await this.logUsage({
        organizationId,
        userId,
        feature: AIFeature.LEAD_SCORING,
        provider: routing.provider,
        model: routing.model,
        tier: routing.tier,
        inputTokens,
        outputTokens,
        latencyMs: Date.now() - startTime,
        success,
        errorMessage,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SUMMARIZATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Summarize content
   */
  async summarize(
    dto: SummarizeRequestDto,
    organizationId: string,
    userId: string,
  ): Promise<SummarizeResponseDto> {
    // Check rate limit
    this.checkRateLimit(AIFeature.SUMMARIZE, organizationId, userId);

    const startTime = Date.now();

    // Route to appropriate model
    const routingContext: RoutingContext = {
      feature: AIFeature.SUMMARIZE,
      taskType: AITaskType.COMPLETION,
      inputLength: dto.content.length,
      requiresVision: false,
      requiresStreaming: false,
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

      const prompt = this.buildSummarizePrompt(dto);
      inputTokens = this.estimateTokens(dto.content + prompt);

      const completion = await this.zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: this.getSummarizeSystemPrompt(dto.style),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: dto.maxLength ? dto.maxLength * 2 : 1000,
        temperature: 0.5,
      });

      const response = completion.choices?.[0]?.message?.content || '';
      outputTokens = this.estimateTokens(response);
      success = true;

      return this.parseSummarizeResponse(response, dto);
    } catch (error: any) {
      errorMessage = error.message;
      this.logger.error(`Summarize error: ${errorMessage}`);
      throw new InternalServerErrorException({
        success: false,
        error: {
          code: 'AI_SUMMARIZE_ERROR',
          message: 'Failed to summarize content',
          messageAr: 'فشل في تلخيص المحتوى',
          details: errorMessage,
        },
      });
    } finally {
      await this.logUsage({
        organizationId,
        userId,
        feature: AIFeature.SUMMARIZE,
        provider: routing.provider,
        model: routing.model,
        tier: routing.tier,
        inputTokens,
        outputTokens,
        latencyMs: Date.now() - startTime,
        success,
        errorMessage,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DATA EXTRACTION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Extract structured data from text
   */
  async extract(
    dto: ExtractRequestDto,
    organizationId: string,
    userId: string,
  ): Promise<ExtractResponseDto> {
    // Check rate limit
    this.checkRateLimit(AIFeature.EXTRACT, organizationId, userId);

    const startTime = Date.now();

    // Route to appropriate model
    const routingContext: RoutingContext = {
      feature: AIFeature.EXTRACT,
      taskType: AITaskType.COMPLETION,
      inputLength: dto.content.length,
      requiresVision: false,
      requiresStreaming: false,
      complexityHints: {
        documentProcessing: true,
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

      const prompt = this.buildExtractPrompt(dto);
      inputTokens = this.estimateTokens(dto.content + prompt);

      const completion = await this.zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: this.getExtractSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2048,
        temperature: 0.2, // Lower temperature for more accurate extraction
      });

      const response = completion.choices?.[0]?.message?.content || '';
      outputTokens = this.estimateTokens(response);
      success = true;

      return {
        ...this.parseExtractResponse(response, dto.fields),
        model: routing.model,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      errorMessage = error.message;
      this.logger.error(`Extract error: ${errorMessage}`);
      throw new InternalServerErrorException({
        success: false,
        error: {
          code: 'AI_EXTRACT_ERROR',
          message: 'Failed to extract data',
          messageAr: 'فشل في استخراج البيانات',
          details: errorMessage,
        },
      });
    } finally {
      await this.logUsage({
        organizationId,
        userId,
        feature: AIFeature.EXTRACT,
        provider: routing.provider,
        model: routing.model,
        tier: routing.tier,
        inputTokens,
        outputTokens,
        latencyMs: Date.now() - startTime,
        success,
        errorMessage,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // USAGE TRACKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Log AI usage to database
   */
  private async logUsage(params: {
    organizationId: string;
    userId: string;
    feature: AIFeature;
    provider: string;
    model: string;
    tier: number;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
  }) {
    try {
      const costUsd = this.aiRouter.calculateActualCost(
        params.model,
        params.inputTokens,
        params.outputTokens,
      );

      await this.prisma.aiUsageLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          feature: params.feature,
          provider: params.provider,
          model: params.model,
          tier: params.tier,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          costUsd,
          latencyMs: params.latencyMs,
          success: params.success,
          errorMessage: params.errorMessage,
        },
      });

      // Emit usage event
      this.eventEmitter.emit('ai.usage', {
        organizationId: params.organizationId,
        feature: params.feature,
        model: params.model,
        cost: costUsd,
        success: params.success,
      });
    } catch (error) {
      this.logger.error('Failed to log AI usage', error);
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AIUsageStatsDto> {
    const where: any = { organizationId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const logs = await this.prisma.aiUsageLog.findMany({ where });

    const byFeature: Record<string, { count: number; cost: number }> = {};
    const byModel: Record<string, { count: number; cost: number }> = {};

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostUsd = 0;
    let totalLatency = 0;
    let successfulRequests = 0;
    let failedRequests = 0;

    for (const log of logs) {
      // By feature
      if (!byFeature[log.feature]) {
        byFeature[log.feature] = { count: 0, cost: 0 };
      }
      byFeature[log.feature].count++;
      byFeature[log.feature].cost += log.costUsd;

      // By model
      if (!byModel[log.model]) {
        byModel[log.model] = { count: 0, cost: 0 };
      }
      byModel[log.model].count++;
      byModel[log.model].cost += log.costUsd;

      // Totals
      totalInputTokens += log.inputTokens;
      totalOutputTokens += log.outputTokens;
      totalCostUsd += log.costUsd;
      totalLatency += log.latencyMs;

      if (log.success) {
        successfulRequests++;
      } else {
        failedRequests++;
      }
    }

    return {
      totalRequests: logs.length,
      successfulRequests,
      failedRequests,
      totalInputTokens,
      totalOutputTokens,
      totalCostUsd,
      avgLatencyMs: logs.length > 0 ? totalLatency / logs.length : 0,
      byFeature,
      byModel,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // RATE LIMITING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check rate limit for a feature
   */
  private checkRateLimit(feature: AIFeature, organizationId: string, userId: string) {
    const config = RATE_LIMITS[feature];
    if (!config) return;

    const key = `${organizationId}:${userId}:${feature}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + config.windowMs };
    }

    if (record.count >= config.maxRequests) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded for ${feature}`,
          messageAr: `تم تجاوز حد الطلبات لـ ${feature}`,
          details: {
            limit: config.maxRequests,
            windowSeconds: config.windowMs / 1000,
            resetAt: new Date(record.resetAt).toISOString(),
          },
        },
      });
    }

    record.count++;
    rateLimitStore.set(key, record);
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(
    feature: AIFeature,
    organizationId: string,
    userId: string,
  ): RateLimitStatusDto {
    const config = RATE_LIMITS[feature];
    if (!config) {
      return {
        isExceeded: false,
        remaining: -1,
        limit: -1,
        resetAt: new Date(),
        windowSeconds: 0,
      };
    }

    const key = `${organizationId}:${userId}:${feature}`;
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      return {
        isExceeded: false,
        remaining: config.maxRequests,
        limit: config.maxRequests,
        resetAt: new Date(now + config.windowMs),
        windowSeconds: config.windowMs / 1000,
      };
    }

    return {
      isExceeded: record.count >= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - record.count),
      limit: config.maxRequests,
      resetAt: new Date(record.resetAt),
      windowSeconds: config.windowMs / 1000,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calculate input length from messages
   */
  private calculateInputLength(messages: { content: string }[]): number {
    return messages.reduce((sum, m) => sum + m.content.length, 0);
  }

  /**
   * Estimate tokens from text
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 chars per token for mixed content
    return Math.ceil(text.length / 3);
  }

  /**
   * Build context prompt for copilot
   */
  private buildContextPrompt(context: Record<string, any>): string {
    const parts: string[] = ['You have access to the following context:'];

    if (context.lead) {
      parts.push(`\nCurrent Lead:
- Stage: ${context.lead.stage}
- Budget: ${context.lead.budget} ${context.lead.budgetCurrency}
- Preferred Areas: ${context.lead.preferredAreas?.join(', ') || 'Not specified'}
- Property Types: ${context.lead.propertyTypes?.join(', ') || 'Not specified'}`);
    }

    if (context.property) {
      parts.push(`\nProperty of Interest:
- Title: ${context.property.title}
- Type: ${context.property.propertyType}
- Price: ${context.property.askingPrice} ${context.property.currency}
- Area: ${context.property.areaM2} m²
- Bedrooms: ${context.property.bedrooms || 'N/A'}`);
    }

    if (context.client) {
      parts.push(`\nClient Information:
- Name: ${context.client.firstName} ${context.client.lastName}
- Phone: ${context.client.phone}
- VIP: ${context.client.isVip ? 'Yes' : 'No'}`);
    }

    return parts.join('\n');
  }

  /**
   * Get system prompt for lead scoring
   */
  private getLeadScoringSystemPrompt(): string {
    return `You are an AI assistant specialized in scoring real estate leads. Analyze the provided lead data and return a JSON response with:

1. "score" (0-100): Overall lead quality score
2. "confidence" (0-1): How confident you are in this score
3. "factors": Object with scoring breakdown:
   - budgetAlignment (0-100)
   - timelineUrgency (0-100)
   - engagementLevel (0-100)
   - propertyMatch (0-100)
   - communicationScore (0-100)
   - decisionAuthority (0-100)
4. "recommendations": Array of actionable recommendations
5. "riskFactors": Array of identified risks
6. "nextBestActions": Array of suggested next steps

Base your analysis on:
- Lead engagement (viewings, communications)
- Budget vs market alignment
- Timeline signals
- Property preferences match
- Communication patterns

Return ONLY valid JSON, no additional text.`;
  }

  /**
   * Build lead scoring prompt
   */
  private buildLeadScoringPrompt(lead: any, additionalContext?: Record<string, any>): string {
    return `Analyze this real estate lead and provide a comprehensive score:

Lead Data:
${JSON.stringify(lead, null, 2)}

${additionalContext ? `Additional Context:\n${JSON.stringify(additionalContext, null, 2)}` : ''}

Provide your analysis as a JSON object with score, confidence, factors, recommendations, riskFactors, and nextBestActions.`;
  }

  /**
   * Parse lead scoring response
   */
  private parseLeadScoringResponse(response: string): LeadScoringResponseDto {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        score: Math.min(100, Math.max(0, parsed.score || 50)),
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        factors: parsed.factors || {},
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
        nextBestActions: Array.isArray(parsed.nextBestActions) ? parsed.nextBestActions : [],
        model: '',
        processingTimeMs: 0,
      };
    } catch (error) {
      this.logger.error('Failed to parse lead scoring response', error);
      return {
        score: 50,
        confidence: 0.3,
        factors: {},
        recommendations: ['Unable to generate detailed analysis'],
        riskFactors: ['AI analysis failed'],
        nextBestActions: ['Review lead manually'],
        model: '',
        processingTimeMs: 0,
      };
    }
  }

  /**
   * Get system prompt for summarization
   */
  private getSummarizeSystemPrompt(style: SummaryStyle = SummaryStyle.BRIEF): string {
    const styleInstructions: Record<SummaryStyle, string> = {
      [SummaryStyle.BRIEF]: 'Provide a concise summary in 2-3 paragraphs.',
      [SummaryStyle.DETAILED]: 'Provide a comprehensive summary covering all key points.',
      [SummaryStyle.BULLETS]: 'Provide the summary as bullet points. Start with a brief intro, then list key points.',
      [SummaryStyle.EXECUTIVE]: 'Provide an executive summary with: Overview, Key Findings, Recommendations, and Action Items.',
    };

    return `You are an expert summarizer. ${styleInstructions[style]}

Return a JSON response with:
1. "summary": The main summary text
2. "keyPoints": Array of the most important points
3. "topics": Array of main topics covered
4. "sentiment": Overall sentiment (positive/negative/neutral/mixed)

Return ONLY valid JSON, no additional text.`;
  }

  /**
   * Build summarization prompt
   */
  private buildSummarizePrompt(dto: SummarizeRequestDto): string {
    let prompt = `Summarize the following content:\n\n${dto.content}`;

    if (dto.focusAreas && dto.focusAreas.length > 0) {
      prompt += `\n\nFocus particularly on: ${dto.focusAreas.join(', ')}`;
    }

    if (dto.contentType) {
      prompt += `\n\nContent type: ${dto.contentType}`;
    }

    return prompt;
  }

  /**
   * Parse summarization response
   */
  private parseSummarizeResponse(response: string, dto: SummarizeRequestDto): SummarizeResponseDto {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || response,
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        sentiment: parsed.sentiment || 'neutral',
        detectedLanguage: dto.language || 'auto-detected',
        originalWordCount: dto.content.split(/\s+/).length,
        summaryWordCount: (parsed.summary || response).split(/\s+/).length,
        model: '',
      };
    } catch {
      return {
        summary: response,
        keyPoints: [],
        topics: [],
        sentiment: 'neutral',
        detectedLanguage: dto.language || 'auto-detected',
        originalWordCount: dto.content.split(/\s+/).length,
        summaryWordCount: response.split(/\s+/).length,
        model: '',
      };
    }
  }

  /**
   * Get system prompt for extraction
   */
  private getExtractSystemPrompt(): string {
    return `You are a data extraction specialist. Extract the requested fields from the provided text.

Return a JSON response with:
1. "results": Array of extracted fields, each with:
   - "field": Field name
   - "value": Extracted value (null if not found)
   - "confidence": 0-1 confidence score
   - "sourceSnippet": Original text where found (if applicable)
2. "overallConfidence": Overall confidence 0-1
3. "missingFields": Array of fields that could not be extracted

Be precise and accurate. If a field cannot be found, set value to null.
Return ONLY valid JSON, no additional text.`;
  }

  /**
   * Build extraction prompt
   */
  private buildExtractPrompt(dto: ExtractRequestDto): string {
    const fieldDescriptions = dto.fields
      .map((f) => `- ${f.name}${f.description ? ` (${f.description})` : ''}${f.type ? ` [type: ${f.type}]` : ''}${f.required ? ' [required]' : ''}`)
      .join('\n');

    return `Extract the following fields from this text:

Fields to extract:
${fieldDescriptions}

${dto.context ? `Context: ${dto.context}\n\n` : ''}
Text content:
${dto.content}

Return the extracted data as a JSON object.`;
  }

  /**
   * Parse extraction response
   */
  private parseExtractResponse(response: string, fields: { name: string }[]): ExtractResponseDto {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        results: Array.isArray(parsed.results) ? parsed.results : [],
        overallConfidence: parsed.overallConfidence || 0.5,
        missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
        model: '',
        processingTimeMs: 0,
      };
    } catch {
      return {
        results: fields.map((f) => ({
          field: f.name,
          value: null,
          confidence: 0,
        })),
        overallConfidence: 0,
        missingFields: fields.map((f) => f.name),
        model: '',
        processingTimeMs: 0,
      };
    }
  }
}
