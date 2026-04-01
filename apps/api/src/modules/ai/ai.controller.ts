// ═══════════════════════════════════════════════════════════════
// AI Controller - نظام تشغيل المكتب العقاري المصري
// AI endpoints with SSE streaming support
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
  HttpStatus,
  HttpCode,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FastifyRequest, FastifyReply } from 'fastify';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AIService } from './ai.service';
import { IntentDetectionService } from './services/intent-detection.service';
import { NextBestActionService } from './services/next-best-action.service';
import { ChurnRiskService } from './services/churn-risk.service';
import {
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
  AIFeature,
  IntentDetectionRequestDto,
  IntentDetectionResponseDto,
  NextBestActionRequestDto,
  NextBestActionResponseDto,
  ChurnRiskRequestDto,
  ChurnRiskResponseDto,
} from './dto/ai.dto';

// ═══════════════════════════════════════════════════════════════
// AI CONTROLLER
// ═══════════════════════════════════════════════════════════════

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly intentDetection: IntentDetectionService,
    private readonly nextBestAction: NextBestActionService,
    private readonly churnRisk: ChurnRiskService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // COPILOT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * POST /ai/copilot - Streaming SSE for AI Copilot
   */
  @Post('copilot')
  @ApiOperation({ summary: 'AI Copilot with SSE streaming' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SSE stream with AI responses',
    content: { 'text/event-stream': {} },
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async copilotStream(
    @Body() dto: CopilotRequestDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    // Check if client wants streaming
    const wantsStreaming = dto.stream !== false;

    if (wantsStreaming) {
      // Set SSE headers
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.setHeader('X-Accel-Buffering', 'no');

      // Send headers
      reply.raw.write('');

      try {
        // Stream the response
        for await (const chunk of this.aiService.copilotStream(dto, organizationId, userId)) {
          reply.raw.write(chunk);
        }
      } catch (error: any) {
        reply.raw.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      } finally {
        reply.raw.end();
      }
    } else {
      // Non-streaming response
      const result = await this.aiService.copilot(dto, organizationId, userId);
      return {
        success: true,
        data: result,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // LEAD SCORING ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * POST /ai/lead-score/:leadId - Calculate AI score for a lead
   */
  @Post('lead-score/:leadId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate AI score for a lead' })
  @ApiParam({ name: 'leadId', description: 'Lead ID', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lead scoring result',
    type: LeadScoringResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async scoreLead(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: LeadScoringRequestDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<{ success: boolean; data: LeadScoringResponseDto }> {
    const result = await this.aiService.scoreLead(leadId, dto, organizationId, userId);
    return {
      success: true,
      data: result,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // INTENT DETECTION ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * POST /ai/intent-detection/:leadId - Detect customer intent
   */
  @Post('intent-detection/:leadId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detect customer purchase intent from conversations' })
  @ApiParam({ name: 'leadId', description: 'Lead ID', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Intent detection result',
    type: IntentDetectionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded (100 req/hour)' })
  async detectIntent(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: IntentDetectionRequestDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<{ success: boolean; data: IntentDetectionResponseDto }> {
    const result = await this.intentDetection.detectIntent(leadId, organizationId, userId, dto);
    return {
      success: true,
      data: result,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // NEXT BEST ACTION ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /ai/next-action/:leadId - Get recommended next action
   */
  @Get('next-action/:leadId')
  @ApiOperation({ summary: 'Get recommended next action for a lead' })
  @ApiParam({ name: 'leadId', description: 'Lead ID', format: 'uuid' })
  @ApiQuery({ name: 'forceRefresh', required: false, description: 'Force refresh the suggestion' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Next best action recommendation',
    type: NextBestActionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded (100 req/hour)' })
  async getNextAction(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Query('forceRefresh') forceRefresh?: string,
    @CurrentUser('id') userId?: string,
    @CurrentUser('organizationId') organizationId?: string,
  ): Promise<{ success: boolean; data: NextBestActionResponseDto }> {
    const dto: NextBestActionRequestDto = {
      forceRefresh: forceRefresh === 'true',
    };
    const result = await this.nextBestAction.getNextAction(leadId, organizationId!, userId!, dto);
    return {
      success: true,
      data: result,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CHURN RISK ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /ai/churn-risk/:leadId - Detect churn risk for a lead
   */
  @Get('churn-risk/:leadId')
  @ApiOperation({ summary: 'Detect churn risk for a lead' })
  @ApiParam({ name: 'leadId', description: 'Lead ID', format: 'uuid' })
  @ApiQuery({ name: 'forceRefresh', required: false, description: 'Force refresh the analysis' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Churn risk analysis result',
    type: ChurnRiskResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded (100 req/hour)' })
  async getChurnRisk(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Query('forceRefresh') forceRefresh?: string,
    @CurrentUser('id') userId?: string,
    @CurrentUser('organizationId') organizationId?: string,
  ): Promise<{ success: boolean; data: ChurnRiskResponseDto }> {
    const dto: ChurnRiskRequestDto = {
      forceRefresh: forceRefresh === 'true',
    };
    const result = await this.churnRisk.detectChurnRisk(leadId, organizationId!, userId!, dto);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /ai/churn-alerts - Get all leads with high churn risk
   */
  @Get('churn-alerts')
  @ApiOperation({ summary: 'Get all leads with high churn risk' })
  @ApiQuery({ name: 'minRiskScore', required: false, description: 'Minimum risk score (default: 60)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of leads with high churn risk',
    type: [ChurnRiskResponseDto],
  })
  async getChurnAlerts(
    @CurrentUser('organizationId') organizationId: string,
    @Query('minRiskScore') minRiskScore?: string,
  ): Promise<{ success: boolean; data: ChurnRiskResponseDto[] }> {
    const minScore = minRiskScore ? parseInt(minRiskScore, 10) : 60;
    const result = await this.churnRisk.getChurnAlerts(organizationId, minScore);
    return {
      success: true,
      data: result,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // SUMMARIZATION ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * POST /ai/summarize - Summarize content
   */
  @Post('summarize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Summarize content using AI' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Summarization result',
    type: SummarizeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async summarize(
    @Body() dto: SummarizeRequestDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<{ success: boolean; data: SummarizeResponseDto }> {
    const result = await this.aiService.summarize(dto, organizationId, userId);
    return {
      success: true,
      data: result,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // DATA EXTRACTION ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * POST /ai/extract - Extract structured data from text
   */
  @Post('extract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extract structured data from text using AI' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Extraction result',
    type: ExtractResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async extract(
    @Body() dto: ExtractRequestDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<{ success: boolean; data: ExtractResponseDto }> {
    const result = await this.aiService.extract(dto, organizationId, userId);
    return {
      success: true,
      data: result,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // USAGE TRACKING ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /ai/usage - Get AI usage statistics
   */
  @Get('usage')
  @ApiOperation({ summary: 'Get AI usage statistics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO string)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI usage statistics',
    type: AIUsageStatsDto,
  })
  async getUsageStats(
    @CurrentUser('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{ success: boolean; data: AIUsageStatsDto }> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const result = await this.aiService.getUsageStats(organizationId, start, end);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /ai/rate-limit/:feature - Get rate limit status for a feature
   */
  @Get('rate-limit/:feature')
  @ApiOperation({ summary: 'Get rate limit status for an AI feature' })
  @ApiParam({ name: 'feature', enum: AIFeature })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rate limit status',
    type: RateLimitStatusDto,
  })
  async getRateLimitStatus(
    @Param('feature') feature: AIFeature,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<{ success: boolean; data: RateLimitStatusDto }> {
    const result = this.aiService.getRateLimitStatus(feature, organizationId, userId);
    return {
      success: true,
      data: result,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /ai/health - Check AI service health
   */
  @Get('health')
  @ApiOperation({ summary: 'Check AI service health' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI service health status',
  })
  async healthCheck(): Promise<{
    success: boolean;
    data: {
      status: string;
      features: string[];
      models: string;
    };
  }> {
    return {
      success: true,
      data: {
        status: 'healthy',
        features: Object.values(AIFeature),
        models: 'z-ai-web-dev-sdk connected',
      },
    };
  }
}
