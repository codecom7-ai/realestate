// ═══════════════════════════════════════════════════════════════
// AI DTOs - نظام تشغيل المكتب العقاري المصري
// AI Module Data Transfer Objects
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsObject,
  IsEnum,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

export enum AITier {
  TIER_1_SIMPLE = 1, // Simple tasks - fast, cheap models
  TIER_2_MODERATE = 2, // Moderate complexity
  TIER_3_COMPLEX = 3, // Complex reasoning
  TIER_4_VERY_COMPLEX = 4, // Very complex tasks
  TIER_5_CRITICAL = 5, // Critical tasks requiring best models
}

export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  META = 'meta',
  DEEPSEEK = 'deepseek',
  MINIMAX = 'minimax',
  ZHIPU = 'zhipu',
  OPENROUTER = 'openrouter',
  ZAI = 'zai',
}

export enum AIFeature {
  COPILOT = 'copilot',
  LEAD_SCORING = 'lead_scoring',
  SUMMARIZE = 'summarize',
  EXTRACT = 'extract',
  OCR = 'ocr',
  TRANSLATION = 'translation',
  SENTIMENT = 'sentiment',
  CLASSIFICATION = 'classification',
  INTENT_DETECTION = 'intent_detection',
  NEXT_BEST_ACTION = 'next_best_action',
  CHURN_RISK = 'churn_risk',
}

export enum AITaskType {
  CHAT = 'chat',
  COMPLETION = 'completion',
  STREAMING = 'streaming',
  EMBEDDING = 'embedding',
  VISION = 'vision',
}

// ═══════════════════════════════════════════════════════════════
// COPILOT DTOs
// ═══════════════════════════════════════════════════════════════

export class CopilotMessageDto {
  @ApiProperty({ description: 'Role of the message sender' })
  @IsEnum(['user', 'assistant', 'system'])
  role: 'user' | 'assistant' | 'system';

  @ApiProperty({ description: 'Content of the message' })
  @IsString()
  @MaxLength(32000)
  content: string;
}

export class CopilotRequestDto {
  @ApiProperty({ description: 'Messages for the conversation', type: [CopilotMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CopilotMessageDto)
  messages: CopilotMessageDto[];

  @ApiPropertyOptional({ description: 'Context for the AI (lead, property, client data)' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: 'System prompt override' })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  systemPrompt?: string;

  @ApiPropertyOptional({ description: 'Maximum tokens to generate', default: 2048 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(8192)
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Temperature for response randomness', default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ description: 'Enable streaming response', default: true })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}

export class CopilotResponseDto {
  @ApiProperty({ description: 'Generated response content' })
  content: string;

  @ApiProperty({ description: 'AI model used' })
  model: string;

  @ApiProperty({ description: 'Provider used' })
  provider: string;

  @ApiProperty({ description: 'Tier used' })
  tier: number;

  @ApiProperty({ description: 'Input tokens used' })
  inputTokens: number;

  @ApiProperty({ description: 'Output tokens used' })
  outputTokens: number;

  @ApiProperty({ description: 'Response latency in milliseconds' })
  latencyMs: number;
}

// ═══════════════════════════════════════════════════════════════
// LEAD SCORING DTOs
// ═══════════════════════════════════════════════════════════════

export class LeadScoringFactorsDto {
  @ApiPropertyOptional({ description: 'Budget alignment score (0-100)' })
  budgetAlignment?: number;

  @ApiPropertyOptional({ description: 'Timeline urgency score (0-100)' })
  timelineUrgency?: number;

  @ApiPropertyOptional({ description: 'Engagement level score (0-100)' })
  engagementLevel?: number;

  @ApiPropertyOptional({ description: 'Property match score (0-100)' })
  propertyMatch?: number;

  @ApiPropertyOptional({ description: 'Communication responsiveness (0-100)' })
  communicationScore?: number;

  @ApiPropertyOptional({ description: 'Decision authority likelihood (0-100)' })
  decisionAuthority?: number;
}

export class LeadScoringRequestDto {
  @ApiPropertyOptional({ description: 'Additional context for scoring' })
  @IsOptional()
  @IsObject()
  additionalContext?: Record<string, any>;
}

export class LeadScoringResponseDto {
  @ApiProperty({ description: 'Overall AI score (0-100)' })
  score: number;

  @ApiProperty({ description: 'Confidence level (0-1)' })
  confidence: number;

  @ApiProperty({ description: 'Scoring factors breakdown', type: LeadScoringFactorsDto })
  factors: LeadScoringFactorsDto;

  @ApiProperty({ description: 'Recommendations for the lead' })
  recommendations: string[];

  @ApiProperty({ description: 'Risk factors identified' })
  riskFactors: string[];

  @ApiProperty({ description: 'Next best actions' })
  nextBestActions: string[];

  @ApiProperty({ description: 'AI model used' })
  model: string;

  @ApiProperty({ description: 'Processing time in milliseconds' })
  processingTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════
// SUMMARIZATION DTOs
// ═══════════════════════════════════════════════════════════════

export enum SummaryStyle {
  BRIEF = 'brief',
  DETAILED = 'detailed',
  BULLETS = 'bullets',
  EXECUTIVE = 'executive',
}

export class SummarizeRequestDto {
  @ApiProperty({ description: 'Content to summarize' })
  @IsString()
  @MaxLength(64000)
  content: string;

  @ApiPropertyOptional({ description: 'Summary style', enum: SummaryStyle, default: SummaryStyle.BRIEF })
  @IsOptional()
  @IsEnum(SummaryStyle)
  style?: SummaryStyle;

  @ApiPropertyOptional({ description: 'Maximum length of summary in words', default: 200 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(1000)
  maxLength?: number;

  @ApiPropertyOptional({ description: 'Language of the content (auto-detected if not provided)' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Focus areas for the summary' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @ApiPropertyOptional({ description: 'Content type hint (email, document, conversation, etc.)' })
  @IsOptional()
  @IsString()
  contentType?: string;
}

export class SummarizeResponseDto {
  @ApiProperty({ description: 'Generated summary' })
  summary: string;

  @ApiProperty({ description: 'Key points extracted' })
  keyPoints: string[];

  @ApiProperty({ description: 'Main topics identified' })
  topics: string[];

  @ApiProperty({ description: 'Sentiment of the content' })
  sentiment: string;

  @ApiProperty({ description: 'Language detected' })
  detectedLanguage: string;

  @ApiProperty({ description: 'Original word count' })
  originalWordCount: number;

  @ApiProperty({ description: 'Summary word count' })
  summaryWordCount: number;

  @ApiProperty({ description: 'AI model used' })
  model: string;
}

// ═══════════════════════════════════════════════════════════════
// EXTRACTION DTOs
// ═══════════════════════════════════════════════════════════════

export class ExtractionFieldDto {
  @ApiProperty({ description: 'Field name to extract' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Field description for AI guidance' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Expected field type' })
  @IsOptional()
  @IsEnum(['string', 'number', 'boolean', 'date', 'array', 'object'])
  type?: string;

  @ApiPropertyOptional({ description: 'Whether the field is required' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class ExtractRequestDto {
  @ApiProperty({ description: 'Text content to extract data from' })
  @IsString()
  @MaxLength(64000)
  content: string;

  @ApiProperty({ description: 'Fields to extract', type: [ExtractionFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractionFieldDto)
  fields: ExtractionFieldDto[];

  @ApiPropertyOptional({ description: 'Extraction context or hint' })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ description: 'Content language' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Content type hint' })
  @IsOptional()
  @IsString()
  contentType?: string;
}

export class ExtractionResultDto {
  @ApiProperty({ description: 'Extracted field name' })
  field: string;

  @ApiProperty({ description: 'Extracted value' })
  value: any;

  @ApiPropertyOptional({ description: 'Confidence score (0-1)' })
  confidence?: number;

  @ApiPropertyOptional({ description: 'Original text snippet where value was found' })
  sourceSnippet?: string;
}

export class ExtractResponseDto {
  @ApiProperty({ description: 'Extracted fields', type: [ExtractionResultDto] })
  results: ExtractionResultDto[];

  @ApiProperty({ description: 'Overall confidence of extraction' })
  overallConfidence: number;

  @ApiProperty({ description: 'Fields that could not be extracted' })
  missingFields: string[];

  @ApiProperty({ description: 'AI model used' })
  model: string;

  @ApiProperty({ description: 'Processing time in milliseconds' })
  processingTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════
// AI USAGE LOG DTOs
// ═══════════════════════════════════════════════════════════════

export class AIUsageLogDto {
  @ApiProperty({ description: 'Log ID' })
  id: string;

  @ApiProperty({ description: 'Feature used' })
  feature: string;

  @ApiProperty({ description: 'AI provider' })
  provider: string;

  @ApiProperty({ description: 'Model used' })
  model: string;

  @ApiProperty({ description: 'Tier used' })
  tier: number;

  @ApiProperty({ description: 'Input tokens consumed' })
  inputTokens: number;

  @ApiProperty({ description: 'Output tokens generated' })
  outputTokens: number;

  @ApiProperty({ description: 'Cost in USD' })
  costUsd: number;

  @ApiProperty({ description: 'Latency in milliseconds' })
  latencyMs: number;

  @ApiProperty({ description: 'Whether the request succeeded' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  errorMessage?: string;

  @ApiProperty({ description: 'Timestamp' })
  createdAt: Date;
}

export class AIUsageStatsDto {
  @ApiProperty({ description: 'Total requests' })
  totalRequests: number;

  @ApiProperty({ description: 'Successful requests' })
  successfulRequests: number;

  @ApiProperty({ description: 'Failed requests' })
  failedRequests: number;

  @ApiProperty({ description: 'Total input tokens' })
  totalInputTokens: number;

  @ApiProperty({ description: 'Total output tokens' })
  totalOutputTokens: number;

  @ApiProperty({ description: 'Total cost in USD' })
  totalCostUsd: number;

  @ApiProperty({ description: 'Average latency in milliseconds' })
  avgLatencyMs: number;

  @ApiProperty({ description: 'Usage by feature' })
  byFeature: Record<string, { count: number; cost: number }>;

  @ApiProperty({ description: 'Usage by model' })
  byModel: Record<string, { count: number; cost: number }>;
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMIT DTOs
// ═══════════════════════════════════════════════════════════════

export class RateLimitStatusDto {
  @ApiProperty({ description: 'Whether rate limit is exceeded' })
  isExceeded: boolean;

  @ApiProperty({ description: 'Remaining requests' })
  remaining: number;

  @ApiProperty({ description: 'Limit per window' })
  limit: number;

  @ApiProperty({ description: 'Reset time' })
  resetAt: Date;

  @ApiProperty({ description: 'Window size in seconds' })
  windowSeconds: number;
}

// ═══════════════════════════════════════════════════════════════
// INTENT DETECTION DTOs
// ═══════════════════════════════════════════════════════════════

export type CustomerIntent =
  | 'BUY_NOW'
  | 'EXPLORING'
  | 'PRICE_SENSITIVE'
  | 'LOCATION_FOCUSED'
  | 'FINANCING_NEEDED'
  | 'NOT_INTERESTED'
  | 'COMPETITOR_COMPARISON'
  | 'INVESTMENT'
  | 'RENTAL';

export class SecondaryIntent {
  @ApiProperty({ description: 'Secondary intent type' })
  intent: CustomerIntent;

  @ApiProperty({ description: 'Intent name in Arabic' })
  intentAr: string;

  @ApiProperty({ description: 'Confidence in this intent' })
  confidence: number;
}

export class RecommendedAction {
  @ApiProperty({ description: 'Recommended action code' })
  action: string;

  @ApiProperty({ description: 'Reason for this recommendation' })
  reason: string;

  @ApiPropertyOptional({ description: 'Priority of this action' })
  priority?: string;
}

export class IntentDetectionRequestDto {
  @ApiPropertyOptional({ description: 'Force refresh the analysis' })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;

  @ApiPropertyOptional({ description: 'Additional context for analysis' })
  @IsOptional()
  @IsObject()
  additionalContext?: Record<string, any>;
}

export class IntentDetectionResponseDto {
  @ApiProperty({ description: 'Primary detected intent' })
  primaryIntent: CustomerIntent;

  @ApiProperty({ description: 'Primary intent name in Arabic' })
  primaryIntentAr: string;

  @ApiProperty({ description: 'Confidence score (0-100)' })
  confidenceScore: number;

  @ApiProperty({ description: 'Secondary intents detected', type: [SecondaryIntent] })
  secondaryIntents: SecondaryIntent[];

  @ApiProperty({ description: 'Recommended actions', type: [RecommendedAction] })
  recommendedActions: RecommendedAction[];

  @ApiProperty({ description: 'Key signals from analysis' })
  keySignals: string[];

  @ApiProperty({ description: 'Analysis summary in Arabic' })
  analysisSummary: string;

  @ApiProperty({ description: 'Lead ID' })
  leadId: string;

  @ApiProperty({ description: 'AI model used' })
  model: string;

  @ApiProperty({ description: 'Processing time in milliseconds' })
  processingTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════
// NEXT BEST ACTION DTOs
// ═══════════════════════════════════════════════════════════════

export type ActionPriority = 'urgent' | 'high' | 'medium' | 'low';

export class SuggestedAction {
  @ApiProperty({ description: 'Action code' })
  action: string;

  @ApiProperty({ description: 'Action name in Arabic' })
  actionAr: string;

  @ApiProperty({ description: 'Priority level' })
  priority: ActionPriority;

  @ApiPropertyOptional({ description: 'Reasoning for this action' })
  reasoning?: string;
}

export class NextBestActionRequestDto {
  @ApiPropertyOptional({ description: 'Force refresh the suggestion' })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsOptional()
  @IsObject()
  additionalContext?: Record<string, any>;
}

export class NextBestActionResponseDto {
  @ApiProperty({ description: 'Recommended action code' })
  action: string;

  @ApiProperty({ description: 'Action name in Arabic' })
  actionAr: string;

  @ApiProperty({ description: 'Priority level' })
  priority: ActionPriority;

  @ApiProperty({ description: 'Reasoning in Arabic' })
  reasoning: string;

  @ApiProperty({ description: 'Reasoning in English' })
  reasoningEn: string;

  @ApiPropertyOptional({ description: 'Suggested template to use' })
  suggestedTemplate?: string;

  @ApiProperty({ description: 'Alternative actions', type: [SuggestedAction] })
  alternativeActions: SuggestedAction[];

  @ApiPropertyOptional({ description: 'Best time to act' })
  bestTimeToAct?: string;

  @ApiPropertyOptional({ description: 'Expected outcome' })
  expectedOutcome?: string;

  @ApiProperty({ description: 'Lead ID' })
  leadId: string;

  @ApiProperty({ description: 'Current lead stage' })
  leadStage: string;

  @ApiProperty({ description: 'Days since last contact' })
  daysSinceLastContact: number;

  @ApiProperty({ description: 'AI model used' })
  model: string;

  @ApiProperty({ description: 'Processing time in milliseconds' })
  processingTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════
// CHURN RISK DTOs
// ═══════════════════════════════════════════════════════════════

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export class RiskFactor {
  @ApiProperty({ description: 'Factor ID' })
  id: string;

  @ApiProperty({ description: 'Factor name' })
  name: string;

  @ApiProperty({ description: 'Factor name in Arabic' })
  nameAr: string;

  @ApiProperty({ description: 'Factor value' })
  value: number;

  @ApiProperty({ description: 'Risk score for this factor (0-100)' })
  score: number;

  @ApiProperty({ description: 'Factor weight in total score' })
  weight: number;

  @ApiProperty({ description: 'Factor description' })
  description: string;
}

export class RecoverySuggestion {
  @ApiProperty({ description: 'Recovery action' })
  action: string;

  @ApiProperty({ description: 'Reasoning for this suggestion' })
  reasoning: string;

  @ApiProperty({ description: 'Priority of this action' })
  priority: string;
}

export class ChurnRiskRequestDto {
  @ApiPropertyOptional({ description: 'Force refresh the analysis' })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsOptional()
  @IsObject()
  additionalContext?: Record<string, any>;
}

export class ChurnRiskResponseDto {
  @ApiProperty({ description: 'Lead ID' })
  leadId: string;

  @ApiProperty({ description: 'Lead name' })
  leadName: string;

  @ApiProperty({ description: 'Assigned agent name' })
  assignedTo: string;

  @ApiProperty({ description: 'Risk level' })
  riskLevel: RiskLevel;

  @ApiProperty({ description: 'Risk level in Arabic' })
  riskLevelAr: string;

  @ApiProperty({ description: 'Overall risk score (0-100)' })
  riskScore: number;

  @ApiProperty({ description: 'Risk factors', type: [RiskFactor] })
  riskFactors: RiskFactor[];

  @ApiProperty({ description: 'Recovery suggestions', type: [RecoverySuggestion] })
  recoverySuggestions: RecoverySuggestion[];

  @ApiProperty({ description: 'Urgency level' })
  urgency: 'critical' | 'high' | 'medium' | 'low';

  @ApiPropertyOptional({ description: 'Analysis summary' })
  analysisSummary?: string;

  @ApiPropertyOptional({ description: 'Predicted outcome if no action' })
  predictedOutcome?: string;

  @ApiPropertyOptional({ description: 'Key warning signals' })
  keyWarningSignals?: string[];

  @ApiProperty({ description: 'AI model used' })
  model: string;

  @ApiProperty({ description: 'Processing time in milliseconds' })
  processingTimeMs: number;
}
