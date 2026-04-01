// ═══════════════════════════════════════════════════════════════
// AI Router Service - نظام تشغيل المكتب العقاري المصري
// Intelligent routing of AI requests to optimal models
// Updated: 2026-03-26
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import {
  AITier,
  AIProvider,
  AIFeature,
  AITaskType,
} from './dto/ai.dto';

// ═══════════════════════════════════════════════════════════════
// MODEL CONFIGURATIONS - Updated 2026-03-26
// Best value models for each tier
// ═══════════════════════════════════════════════════════════════

interface ModelConfig {
  id: string;
  provider: AIProvider;
  maxTokens: number;
  costPer1kInput: number; // USD per 1K input tokens
  costPer1kOutput: number; // USD per 1K output tokens
  supportsVision: boolean;
  supportsStreaming: boolean;
  avgLatencyMs: number;
  tier: AITier;
  thinking?: 'disabled' | 'enabled' | 'adaptive';
}

// ═══════════════════════════════════════════════════════════════
// LATEST MODELS 2026 - Best Value Selection
// ═══════════════════════════════════════════════════════════════

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // ═══════════════════════════════════════════════════════════════
  // TIER 1 - Simple Tasks (Ultra-fast & Cost-effective)
  // ═══════════════════════════════════════════════════════════════
  
  // Gemini 3.1 Flash Lite - Best value for simple tasks
  'gemini-3.1-flash-lite': {
    id: 'gemini-3.1-flash-lite-preview',
    provider: AIProvider.GOOGLE,
    maxTokens: 8192,
    costPer1kInput: 0.00005,  // $0.05 per 1M tokens
    costPer1kOutput: 0.0002, // $0.20 per 1M tokens
    supportsVision: true,
    supportsStreaming: true,
    avgLatencyMs: 200,
    tier: AITier.TIER_1_SIMPLE,
  },
  
  // Gemini 1.5 Flash - Still great value
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash-8b',
    provider: AIProvider.GOOGLE,
    maxTokens: 8192,
    costPer1kInput: 0.0000375,  // $0.0375 per 1M tokens
    costPer1kOutput: 0.00015,   // $0.15 per 1M tokens
    supportsVision: true,
    supportsStreaming: true,
    avgLatencyMs: 250,
    tier: AITier.TIER_1_SIMPLE,
  },
  
  // GPT-4o-mini - Reliable and fast
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: AIProvider.OPENAI,
    maxTokens: 16384,
    costPer1kInput: 0.00015,  // $0.15 per 1M tokens
    costPer1kOutput: 0.0006, // $0.60 per 1M tokens
    supportsVision: true,
    supportsStreaming: true,
    avgLatencyMs: 300,
    tier: AITier.TIER_1_SIMPLE,
  },
  
  // DeepSeek V3 - Best value Chinese model
  'deepseek-v3': {
    id: 'deepseek-chat',
    provider: AIProvider.DEEPSEEK,
    maxTokens: 8192,
    costPer1kInput: 0.00005,  // $0.05 per 1M tokens
    costPer1kOutput: 0.0001, // $0.10 per 1M tokens
    supportsVision: false,
    supportsStreaming: true,
    avgLatencyMs: 350,
    tier: AITier.TIER_1_SIMPLE,
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 2 - Moderate Complexity
  // ═══════════════════════════════════════════════════════════════
  
  // Gemini 2.0 Flash - Excellent balance
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    provider: AIProvider.GOOGLE,
    maxTokens: 16384,
    costPer1kInput: 0.0001,  // $0.10 per 1M tokens
    costPer1kOutput: 0.0004, // $0.40 per 1M tokens
    supportsVision: true,
    supportsStreaming: true,
    avgLatencyMs: 400,
    tier: AITier.TIER_2_MODERATE,
  },
  
  // GPT-4.1-mini - New 2026 model
  'gpt-4.1-mini': {
    id: 'gpt-4.1-mini',
    provider: AIProvider.OPENAI,
    maxTokens: 16384,
    costPer1kInput: 0.0004,  // $0.40 per 1M tokens
    costPer1kOutput: 0.0016, // $1.60 per 1M tokens
    supportsVision: true,
    supportsStreaming: true,
    avgLatencyMs: 450,
    tier: AITier.TIER_2_MODERATE,
  },
  
  // Claude 3.5 Haiku - Fast and capable
  'claude-3.5-haiku': {
    id: 'claude-3-5-haiku-20241022',
    provider: AIProvider.ANTHROPIC,
    maxTokens: 8192,
    costPer1kInput: 0.001,  // $1.00 per 1M tokens
    costPer1kOutput: 0.005, // $5.00 per 1M tokens
    supportsVision: true,
    supportsStreaming: true,
    avgLatencyMs: 350,
    tier: AITier.TIER_2_MODERATE,
  },
  
  // MiniMax M27 - Strong Chinese model
  'minimax-m27': {
    id: 'minimax-m27',
    provider: AIProvider.MINIMAX,
    maxTokens: 16384,
    costPer1kInput: 0.0002,
    costPer1kOutput: 0.0006,
    supportsVision: true,
    supportsStreaming: true,
    avgLatencyMs: 500,
    tier: AITier.TIER_2_MODERATE,
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 3 - Complex Reasoning
  // ═══════════════════════════════════════════════════════════════
  
  // Gemini 2.0 Pro - Best value for complex tasks
  'gemini-2.0-pro': {
    id: 'gemini-2.0-pro-exp',
    provider: AIProvider.GOOGLE,
    maxTokens: 32768,
    costPer1kInput: 0.00125,  // $1.25 per 1M tokens
    costPer1kOutput: 0.005,   // $5.00 per 1M tokens
    supportsVision: true,
    supportsStreaming: true,
    avgLatencyMs: 700,
    tier: AITier.TIER_3_COMPLEX,
  },
  
  // Claude Sonnet 4 - Excellent for Arabic
  'claude-sonnet-4': {
    id: 'claude-sonnet-4-20250514',
    provider: AIProvider.ANTHROPIC,
    maxTokens: 65536,
    costPer1kInput: 0.003,  // $3.00 per 1M tokens
    costPer1kOutput: 0.015, // $15.00 per 1M tokens
    supportsVision: true,
    supportsStreaming: true,
    avgLatencyMs: 800,
    tier: AITier.TIER_3_COMPLEX,
  },
  
  // GPT-4o - Reliable workhorse
  'gpt-4o': {
    id: 'gpt-4o',
    provider: AIProvider.OPENAI,
    maxTokens: 16384,
    costPer1kInput: 0.0025,  // $2.50 per 1M tokens
    costPer1kOutput: 0.01,   // $10.00 per 1M tokens
    supportsVision: true,
    supportsStreaming: true,
    avgLatencyMs: 600,
    tier: AITier.TIER_3_COMPLEX,
  },
  
  // GPT-4.1 - New 2026 model
  'gpt-4.1': {
    id: 'gpt-4.1',
    provider: AIProvider.OPENAI,
    maxTokens: 32768,
    costPer1kInput: 0.002,  // $2.00 per 1M tokens
    costPer1kOutput: 0.008, // $8.00 per 1M tokens
    supportsVision: true,
    supportsStreaming: true,
    avgLatencyMs: 650,
    tier: AITier.TIER_3_COMPLEX,
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 4 - Very Complex Tasks (with Thinking)
  // ═══════════════════════════════════════════════════════════════
  
  // Claude Opus 4 - Best for complex reasoning
  'claude-opus-4': {
    id: 'claude-opus-4-20250514',
    provider: AIProvider.ANTHROPIC,
    maxTokens: 32768,
    costPer1kInput: 0.015,  // $15.00 per 1M tokens
    costPer1kOutput: 0.075, // $75.00 per 1M tokens
    supportsVision: true,
    supportsStreaming: true,
    avgLatencyMs: 2000,
    tier: AITier.TIER_4_VERY_COMPLEX,
    thinking: 'adaptive',
  },
  
  // o3-mini - Cost-effective reasoning
  'o3-mini': {
    id: 'o3-mini',
    provider: AIProvider.OPENAI,
    maxTokens: 16384,
    costPer1kInput: 0.0011,  // $1.10 per 1M tokens
    costPer1kOutput: 0.0044, // $4.40 per 1M tokens
    supportsVision: false,
    supportsStreaming: true,
    avgLatencyMs: 3000,
    tier: AITier.TIER_4_VERY_COMPLEX,
    thinking: 'enabled',
  },
  
  // o4-mini - Advanced reasoning
  'o4-mini': {
    id: 'o4-mini',
    provider: AIProvider.OPENAI,
    maxTokens: 32768,
    costPer1kInput: 0.0015,  // $1.50 per 1M tokens
    costPer1kOutput: 0.006,  // $6.00 per 1M tokens
    supportsVision: false,
    supportsStreaming: true,
    avgLatencyMs: 4000,
    tier: AITier.TIER_4_VERY_COMPLEX,
    thinking: 'enabled',
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 5 - Critical Tasks (Best Available)
  // ═══════════════════════════════════════════════════════════════
  
  // Claude Opus 4 - Maximum capability
  'claude-opus-4-critical': {
    id: 'claude-opus-4-20250514',
    provider: AIProvider.ANTHROPIC,
    maxTokens: 32768,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    supportsVision: true,
    supportsStreaming: true,
    avgLatencyMs: 3000,
    tier: AITier.TIER_5_CRITICAL,
    thinking: 'adaptive',
  },
  
  // DeepSeek R1 - Cost-effective reasoning model
  'deepseek-r1': {
    id: 'deepseek-reasoner',
    provider: AIProvider.DEEPSEEK,
    maxTokens: 32768,
    costPer1kInput: 0.00055,  // $0.55 per 1M tokens - Amazing value!
    costPer1kOutput: 0.00219, // $2.19 per 1M tokens
    supportsVision: false,
    supportsStreaming: true,
    avgLatencyMs: 5000,
    tier: AITier.TIER_5_CRITICAL,
    thinking: 'enabled',
  },

  // ═══════════════════════════════════════════════════════════════
  // SPECIALIZED MODELS
  // ═══════════════════════════════════════════════════════════════
  
  // GLM-4V - Best for OCR (Arabic support)
  'glm-4v': {
    id: 'glm-4v-flash',
    provider: AIProvider.ZHIPU,
    maxTokens: 8192,
    costPer1kInput: 0.00001,  // Nearly free for OCR
    costPer1kOutput: 0.00001,
    supportsVision: true,
    supportsStreaming: true,
    avgLatencyMs: 500,
    tier: AITier.TIER_1_SIMPLE,
  },
  
  // MiniMax Speech-26 - Best for TTS
  'minimax-speech': {
    id: 'speech-26-turbo',
    provider: AIProvider.MINIMAX,
    maxTokens: 4096,
    costPer1kInput: 0.0,
    costPer1kOutput: 0.002,  // $2.00 per 1M characters
    supportsVision: false,
    supportsStreaming: true,
    avgLatencyMs: 300,
    tier: AITier.TIER_1_SIMPLE,
  },
};

// ═══════════════════════════════════════════════════════════════
// FEATURE TO TIER MAPPING
// ═══════════════════════════════════════════════════════════════

const FEATURE_TIER_DEFAULTS: Record<AIFeature, AITier> = {
  [AIFeature.COPILOT]: AITier.TIER_2_MODERATE,
  [AIFeature.LEAD_SCORING]: AITier.TIER_3_COMPLEX,
  [AIFeature.SUMMARIZE]: AITier.TIER_1_SIMPLE,
  [AIFeature.EXTRACT]: AITier.TIER_2_MODERATE,
  [AIFeature.OCR]: AITier.TIER_1_SIMPLE,
  [AIFeature.TRANSLATION]: AITier.TIER_1_SIMPLE,
  [AIFeature.SENTIMENT]: AITier.TIER_1_SIMPLE,
  [AIFeature.CLASSIFICATION]: AITier.TIER_1_SIMPLE,
  [AIFeature.INTENT_DETECTION]: AITier.TIER_2_MODERATE,
  [AIFeature.NEXT_BEST_ACTION]: AITier.TIER_2_MODERATE,
  [AIFeature.CHURN_RISK]: AITier.TIER_3_COMPLEX,
};

// ═══════════════════════════════════════════════════════════════
// ROUTING CONTEXT
// ═══════════════════════════════════════════════════════════════

export interface RoutingContext {
  feature: AIFeature;
  taskType: AITaskType;
  inputLength: number;
  requiresVision: boolean;
  requiresStreaming: boolean;
  priorityOverride?: AITier;
  complexityHints?: {
    multiStepReasoning?: boolean;
    codeGeneration?: boolean;
    creativeWriting?: boolean;
    dataAnalysis?: boolean;
    documentProcessing?: boolean;
    requiresThinking?: boolean;
  };
}

export interface RoutingDecision {
  model: string;
  provider: AIProvider;
  tier: AITier;
  estimatedCost: number;
  estimatedLatencyMs: number;
  routingReason: string;
  thinking?: 'disabled' | 'enabled' | 'adaptive';
}

// ═══════════════════════════════════════════════════════════════
// AI ROUTER SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class AIRouterService {
  private readonly logger = new Logger(AIRouterService.name);

  /**
   * Determine optimal model for the given context
   */
  route(context: RoutingContext): RoutingDecision {
    // 1. Start with feature-based tier
    let selectedTier = FEATURE_TIER_DEFAULTS[context.feature];

    // 2. Apply priority override if specified
    if (context.priorityOverride) {
      selectedTier = context.priorityOverride;
    }

    // 3. Adjust tier based on complexity hints
    selectedTier = this.adjustTierForComplexity(selectedTier, context);

    // 4. Filter available models
    const candidates = this.filterModels(context, selectedTier);

    // 5. Score and select best model
    const selectedModel = this.selectBestModel(candidates, context);

    // 6. Calculate estimates
    const estimatedTokens = this.estimateTokens(context);
    const estimatedCost = this.calculateCost(selectedModel, estimatedTokens);

    return {
      model: selectedModel.id,
      provider: selectedModel.provider,
      tier: selectedModel.tier,
      estimatedCost,
      estimatedLatencyMs: selectedModel.avgLatencyMs,
      routingReason: this.getRoutingReason(selectedModel, context, selectedTier),
      thinking: selectedModel.thinking,
    };
  }

  /**
   * Adjust tier based on complexity hints
   */
  private adjustTierForComplexity(baseTier: AITier, context: RoutingContext): AITier {
    const hints = context.complexityHints || {};
    let adjustedTier = baseTier;

    // Multi-step reasoning requires higher tier
    if (hints.multiStepReasoning) {
      adjustedTier = Math.max(adjustedTier, AITier.TIER_3_COMPLEX) as AITier;
    }

    // Code generation or data analysis
    if (hints.codeGeneration || hints.dataAnalysis) {
      adjustedTier = Math.max(adjustedTier, AITier.TIER_3_COMPLEX) as AITier;
    }

    // Document processing with large inputs
    if (hints.documentProcessing && context.inputLength > 5000) {
      adjustedTier = Math.max(adjustedTier, AITier.TIER_2_MODERATE) as AITier;
    }

    // Long inputs need more capable models
    if (context.inputLength > 10000) {
      adjustedTier = Math.max(adjustedTier, AITier.TIER_2_MODERATE) as AITier;
    }
    
    // Thinking required - use tier 4+
    if (hints.requiresThinking) {
      adjustedTier = Math.max(adjustedTier, AITier.TIER_4_VERY_COMPLEX) as AITier;
    }

    return adjustedTier;
  }

  /**
   * Filter models based on requirements
   */
  private filterModels(context: RoutingContext, minTier: AITier): ModelConfig[] {
    return Object.values(MODEL_CONFIGS).filter((model) => {
      // Must support streaming if required
      if (context.requiresStreaming && !model.supportsStreaming) {
        return false;
      }

      // Must support vision if required
      if (context.requiresVision && !model.supportsVision) {
        return false;
      }

      // Must meet minimum tier
      if (model.tier < minTier) {
        return false;
      }

      // OCR should prefer vision models
      if (context.feature === AIFeature.OCR) {
        return model.supportsVision;
      }

      return true;
    });
  }

  /**
   * Select the best model from candidates
   */
  private selectBestModel(candidates: ModelConfig[], context: RoutingContext): ModelConfig {
    if (candidates.length === 0) {
      // Fallback to a reliable model
      this.logger.warn('No suitable model found, falling back to gemini-2.0-flash');
      return MODEL_CONFIGS['gemini-2.0-flash'];
    }

    // Score each model
    const scored = candidates.map((model) => ({
      model,
      score: this.scoreModel(model, context),
    }));

    // Sort by score (descending)
    scored.sort((a, b) => b.score - a.score);

    return scored[0].model;
  }

  /**
   * Score a model for the given context
   */
  private scoreModel(model: ModelConfig, context: RoutingContext): number {
    let score = 100;

    // Prefer lower tier for simpler tasks (cost optimization)
    const tierPenalty = (model.tier - 1) * 8;
    score -= tierPenalty;

    // Prefer faster models for streaming
    if (context.requiresStreaming) {
      score -= model.avgLatencyMs / 100;
    }

    // OCR bonuses
    if (context.feature === AIFeature.OCR) {
      // GLM-4V is best for OCR
      if (model.id.includes('glm-4v')) {
        score += 40;
      }
      // Gemini also great for OCR
      if (model.provider === AIProvider.GOOGLE) {
        score += 25;
      }
    }

    // Prefer Claude for complex reasoning with Arabic
    if (context.complexityHints?.multiStepReasoning) {
      if (model.provider === AIProvider.ANTHROPIC) {
        score += 25;
      }
      // Thinking models get bonus
      if (model.thinking === 'enabled' || model.thinking === 'adaptive') {
        score += 15;
      }
    }

    // Lead scoring prefers Claude Sonnet/Opus
    if (context.feature === AIFeature.LEAD_SCORING) {
      if (model.id.includes('claude-sonnet') || model.id.includes('claude-opus')) {
        score += 20;
      }
    }
    
    // Translation and sentiment - prefer fast models
    if (context.feature === AIFeature.TRANSLATION || context.feature === AIFeature.SENTIMENT) {
      // Gemini Flash is excellent for these tasks
      if (model.id.includes('flash')) {
        score += 20;
      }
    }

    // Balance cost vs capability (heavily weight cost savings)
    const costFactor = model.costPer1kOutput * 500;
    score -= costFactor;

    return score;
  }

  /**
   * Estimate tokens for the request
   */
  private estimateTokens(context: RoutingContext): { input: number; output: number } {
    // Rough estimation: ~4 chars per token for English, ~2 for Arabic
    const inputTokens = Math.ceil(context.inputLength / 3);
    const outputTokens = context.feature === AIFeature.SUMMARIZE ? 500 : 2048;

    return { input: inputTokens, output: outputTokens };
  }

  /**
   * Calculate estimated cost
   */
  private calculateCost(
    model: ModelConfig,
    tokens: { input: number; output: number },
  ): number {
    const inputCost = (tokens.input / 1000) * model.costPer1kInput;
    const outputCost = (tokens.output / 1000) * model.costPer1kOutput;
    return inputCost + outputCost;
  }

  /**
   * Get routing reason for logging
   */
  private getRoutingReason(
    model: ModelConfig,
    context: RoutingContext,
    requestedTier: AITier,
  ): string {
    const reasons: string[] = [];

    reasons.push(`Feature: ${context.feature}`);
    reasons.push(`Requested tier: ${requestedTier}`);

    if (context.requiresVision) {
      reasons.push('Vision required');
    }
    if (context.requiresStreaming) {
      reasons.push('Streaming required');
    }
    if (context.complexityHints?.multiStepReasoning) {
      reasons.push('Multi-step reasoning');
    }
    if (model.thinking) {
      reasons.push(`Thinking: ${model.thinking}`);
    }

    reasons.push(`Selected: ${model.id} (tier ${model.tier})`);

    return reasons.join(' | ');
  }

  /**
   * Get model configuration by ID
   */
  getModelConfig(modelId: string): ModelConfig | undefined {
    return MODEL_CONFIGS[modelId];
  }

  /**
   * Get all available models
   */
  getAvailableModels(): ModelConfig[] {
    return Object.values(MODEL_CONFIGS);
  }

  /**
   * Get models by tier
   */
  getModelsByTier(tier: AITier): ModelConfig[] {
    return Object.values(MODEL_CONFIGS).filter((m) => m.tier === tier);
  }

  /**
   * Calculate actual cost after request completion
   */
  calculateActualCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const model = MODEL_CONFIGS[modelId];
    if (!model) {
      // Default pricing if model not found
      return (inputTokens + outputTokens) * 0.00001;
    }

    const inputCost = (inputTokens / 1000) * model.costPer1kInput;
    const outputCost = (outputTokens / 1000) * model.costPer1kOutput;
    return inputCost + outputCost;
  }
  
  /**
   * Get the best model for a specific feature
   */
  getBestModelForFeature(feature: AIFeature): ModelConfig {
    const context: RoutingContext = {
      feature,
      taskType: 'text' as AITaskType,
      inputLength: 1000,
      requiresVision: false,
      requiresStreaming: true,
    };
    
    const decision = this.route(context);
    return MODEL_CONFIGS[decision.model] || MODEL_CONFIGS['gemini-2.0-flash'];
  }
}
