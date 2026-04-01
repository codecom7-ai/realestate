// @ts-nocheck
// ═══════════════════════════════════════════════════════════════
// Model Registry Service - نظام تشغيل المكتب العقاري المصري
// Dynamic model discovery from multiple AI providers
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { AIProvider } from './dto/ai.dto';

// ═══════════════════════════════════════════════════════════════
// MODEL INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface DiscoveredModel {
  id: string;                    // Model ID للاتصال
  name: string;                  // اسم العرض
  provider: AIProvider;          // المزود
  contextWindow: number;         // عدد الـ tokens المدعومة

  // الأسعار (USD per 1M tokens)
  pricing: {
    input: number;               // سعر الـ input
    output: number;              // سعر الـ output
    cacheRead?: number;          // سعر قراءة الكاش (optional)
    cacheWrite?: number;         // سعر كتابة الكاش (optional)
  };

  // القدرات
  capabilities: {
    vision: boolean;             // يدعم الصور
    streaming: boolean;          // يدعم الـ streaming
    functionCall: boolean;       // يدعم استدعاء الدوال
    json: boolean;               // يدعم JSON mode
    tools: boolean;              // يدعم الأدوات
  };

  // معلومات إضافية
  metadata?: {
    family?: string;             // عائلة النموذج (gpt-4, claude-3, etc.)
    version?: string;            // الإصدار
    releaseDate?: string;        // تاريخ الإصدار
    deprecated?: boolean;        // هل تم إهماله
    recommended?: boolean;       // هل موصى به
  };
}

export interface ProviderModels {
  provider: AIProvider;
  models: DiscoveredModel[];
  lastUpdated: Date;
  status: 'active' | 'error' | 'unknown';
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER API ENDPOINTS
// ═══════════════════════════════════════════════════════════════

const PROVIDER_ENDPOINTS = {
  [AIProvider.OPENROUTER]: 'https://openrouter.ai/api/v1/models',
  [AIProvider.OPENAI]: 'https://api.openai.com/v1/models',
  [AIProvider.GOOGLE]: 'https://generativelanguage.googleapis.com/v1beta/models',
  [AIProvider.MINIMAX]: 'https://api.minimax.chat/v1/models',
  [AIProvider.DEEPSEEK]: 'https://api.deepseek.com/v1/models',
  [AIProvider.ZAI]: 'https://api.z.ai/v1/models', // افتراضي
};

// ═══════════════════════════════════════════════════════════════
// MODEL REGISTRY SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class ModelRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ModelRegistryService.name);
  private readonly modelCache = new Map<AIProvider, ProviderModels>();

  // نماذج ثابتة للطوارئ (fallback)
  private readonly fallbackModels: DiscoveredModel[] = [
    // OpenAI
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: AIProvider.OPENAI,
      contextWindow: 128000,
      pricing: { input: 0.15, output: 0.60 },
      capabilities: { vision: true, streaming: true, functionCall: true, json: true, tools: true },
      metadata: { family: 'gpt-4o', recommended: true },
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: AIProvider.OPENAI,
      contextWindow: 128000,
      pricing: { input: 2.50, output: 10.00 },
      capabilities: { vision: true, streaming: true, functionCall: true, json: true, tools: true },
      metadata: { family: 'gpt-4o' },
    },
    {
      id: 'o3-mini',
      name: 'O3 Mini',
      provider: AIProvider.OPENAI,
      contextWindow: 200000,
      pricing: { input: 1.10, output: 4.40 },
      capabilities: { vision: false, streaming: true, functionCall: true, json: true, tools: true },
      metadata: { family: 'o3', recommended: true },
    },

    // Google Gemini
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      provider: AIProvider.GOOGLE,
      contextWindow: 1048576,
      pricing: { input: 0.10, output: 0.40 },
      capabilities: { vision: true, streaming: true, functionCall: true, json: true, tools: true },
      metadata: { family: 'gemini-2', recommended: true },
    },
    {
      id: 'gemini-2.0-flash-lite',
      name: 'Gemini 2.0 Flash Lite',
      provider: AIProvider.GOOGLE,
      contextWindow: 1048576,
      pricing: { input: 0.075, output: 0.30 },
      capabilities: { vision: true, streaming: true, functionCall: true, json: true, tools: true },
      metadata: { family: 'gemini-2' },
    },

    // Z.ai GLM
    {
      id: 'glm-4-plus',
      name: 'GLM-4 Plus',
      provider: AIProvider.ZAI,
      contextWindow: 128000,
      pricing: { input: 0, output: 0 }, // مجاني عبر z-ai-web-dev-sdk
      capabilities: { vision: true, streaming: true, functionCall: true, json: true, tools: false },
      metadata: { family: 'glm-4', recommended: true },
    },
    {
      id: 'glm-4-flash',
      name: 'GLM-4 Flash',
      provider: AIProvider.ZAI,
      contextWindow: 128000,
      pricing: { input: 0, output: 0 }, // مجاني
      capabilities: { vision: true, streaming: true, functionCall: true, json: true, tools: false },
      metadata: { family: 'glm-4' },
    },
    {
      id: 'glm-4v-plus',
      name: 'GLM-4V Plus (Vision)',
      provider: AIProvider.ZAI,
      contextWindow: 8192,
      pricing: { input: 0, output: 0 }, // مجاني
      capabilities: { vision: true, streaming: false, functionCall: false, json: false, tools: false },
      metadata: { family: 'glm-4v', recommended: true },
    },

    // MiniMax
    {
      id: 'abab6.5-chat',
      name: 'MiniMax M6.5 Chat',
      provider: AIProvider.MINIMAX,
      contextWindow: 245000,
      pricing: { input: 0.30, output: 1.00 },
      capabilities: { vision: false, streaming: true, functionCall: true, json: true, tools: true },
      metadata: { family: 'abab6.5' },
    },
    {
      id: 'abab6.5s-chat',
      name: 'MiniMax M6.5S Chat',
      provider: AIProvider.MINIMAX,
      contextWindow: 245000,
      pricing: { input: 0.10, output: 0.30 },
      capabilities: { vision: false, streaming: true, functionCall: true, json: true, tools: true },
      metadata: { family: 'abab6.5', recommended: true },
    },
    {
      id: 'abab7-chat',
      name: 'MiniMax M7 Chat',
      provider: AIProvider.MINIMAX,
      contextWindow: 32000,
      pricing: { input: 0.50, output: 1.50 },
      capabilities: { vision: true, streaming: true, functionCall: true, json: true, tools: true },
      metadata: { family: 'abab7', recommended: true },
    },

    // DeepSeek
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      provider: AIProvider.DEEPSEEK,
      contextWindow: 64000,
      pricing: { input: 0.14, output: 0.28 },
      capabilities: { vision: false, streaming: true, functionCall: true, json: true, tools: true },
      metadata: { family: 'deepseek', recommended: true },
    },
    {
      id: 'deepseek-reasoner',
      name: 'DeepSeek Reasoner (R1)',
      provider: AIProvider.DEEPSEEK,
      contextWindow: 64000,
      pricing: { input: 0.55, output: 2.19 },
      capabilities: { vision: false, streaming: true, functionCall: false, json: false, tools: false },
      metadata: { family: 'deepseek-r' },
    },

    // Anthropic (via OpenRouter)
    {
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      provider: AIProvider.OPENROUTER,
      contextWindow: 200000,
      pricing: { input: 3.00, output: 15.00 },
      capabilities: { vision: true, streaming: true, functionCall: true, json: true, tools: true },
      metadata: { family: 'claude-3.5', recommended: true },
    },
    {
      id: 'anthropic/claude-3-opus',
      name: 'Claude 3 Opus',
      provider: AIProvider.OPENROUTER,
      contextWindow: 200000,
      pricing: { input: 15.00, output: 75.00 },
      capabilities: { vision: true, streaming: true, functionCall: true, json: true, tools: true },
      metadata: { family: 'claude-3' },
    },
  ];

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('🚀 Initializing Model Registry...');
    await this.refreshAllModels();
  }

  // ═══════════════════════════════════════════════════════════════
  // MODEL FETCHING METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * تحديث جميع النماذج من جميع المزودين
   */
  @Cron('0 */6 * * *') // كل 6 ساعات
  async refreshAllModels(): Promise<void> {
    this.logger.log('🔄 Refreshing models from all providers...');

    const providers = [
      AIProvider.OPENROUTER,
      AIProvider.OPENAI,
      AIProvider.GOOGLE,
      AIProvider.MINIMAX,
      AIProvider.ZAI,
      AIProvider.DEEPSEEK,
    ];

    await Promise.allSettled(
      providers.map(provider => this.fetchProviderModels(provider))
    );

    this.logger.log(`✅ Model registry updated. Total models: ${this.getAllModels().length}`);
  }

  /**
   * جلب النماذج من مزود معين
   */
  async fetchProviderModels(provider: AIProvider): Promise<ProviderModels> {
    try {
      let models: DiscoveredModel[];

      switch (provider) {
        case AIProvider.OPENROUTER:
          models = await this.fetchOpenRouterModels();
          break;
        case AIProvider.OPENAI:
          models = await this.fetchOpenAIModels();
          break;
        case AIProvider.GOOGLE:
          models = await this.fetchGoogleModels();
          break;
        case AIProvider.MINIMAX:
          models = await this.fetchMiniMaxModels();
          break;
        case AIProvider.ZAI:
          models = await this.fetchZAIModels();
          break;
        case AIProvider.DEEPSEEK:
          models = await this.fetchDeepSeekModels();
          break;
        default:
          models = this.getFallbackModels(provider);
      }

      const result: ProviderModels = {
        provider,
        models,
        lastUpdated: new Date(),
        status: 'active',
      };

      this.modelCache.set(provider, result);
      this.logger.log(`✅ Fetched ${models.length} models from ${provider}`);

      return result;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch models from ${provider}: ${error.message}`);

      const fallback = {
        provider,
        models: this.getFallbackModels(provider),
        lastUpdated: new Date(),
        status: 'error' as const,
        error: error.message,
      };

      this.modelCache.set(provider, fallback);
      return fallback;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PROVIDER-SPECIFIC FETCHERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * OpenRouter - يجلب جميع النماذج المتاحة
   */
  private async fetchOpenRouterModels(): Promise<DiscoveredModel[]> {
    const response = await fetch(PROVIDER_ENDPOINTS[AIProvider.OPENROUTER], {
      headers: {
        'Authorization': `Bearer ${this.getApiKey('OPENROUTER_API_KEY')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();

    return data.data.map((model: any) => ({
      id: model.id,
      name: model.name || model.id,
      provider: AIProvider.OPENROUTER,
      contextWindow: model.context_length || 8192,
      pricing: {
        input: (model.pricing?.prompt || 0) * 1000000,  // تحويل لـ USD per 1M
        output: (model.pricing?.completion || 0) * 1000000,
      },
      capabilities: {
        vision: model.architecture?.modality?.includes('image') || false,
        streaming: true,
        functionCall: true,
        json: true,
        tools: true,
      },
      metadata: {
        family: model.id.split('/')[0],
        deprecated: model.deprecated || false,
      },
    }));
  }

  /**
   * OpenAI Models
   */
  private async fetchOpenAIModels(): Promise<DiscoveredModel[]> {
    const response = await fetch(PROVIDER_ENDPOINTS[AIProvider.OPENAI], {
      headers: {
        'Authorization': `Bearer ${this.getApiKey('OPENAI_API_KEY')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();

    // فلترة النماذج النشطة فقط
    const activeModels = data.data.filter((m: any) =>
      m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3')
    );

    return activeModels.map((model: any) => this.parseOpenAIModel(model));
  }

  private parseOpenAIModel(model: any): DiscoveredModel {
    const id = model.id;
    const pricing = this.getOpenAIPricing(id);

    return {
      id,
      name: this.getOpenAIModelName(id),
      provider: AIProvider.OPENAI,
      contextWindow: this.getOpenAIContextWindow(id),
      pricing,
      capabilities: {
        vision: id.includes('vision') || id.includes('gpt-4o') || id.includes('gpt-4-turbo'),
        streaming: !id.includes('o1'),
        functionCall: true,
        json: true,
        tools: true,
      },
      metadata: {
        family: id.split('-').slice(0, 2).join('-'),
      },
    };
  }

  private getOpenAIPricing(modelId: string): { input: number; output: number } {
    const pricingMap: Record<string, { input: number; output: number }> = {
      'gpt-4o-mini': { input: 0.15, output: 0.60 },
      'gpt-4o': { input: 2.50, output: 10.00 },
      'gpt-4-turbo': { input: 10.00, output: 30.00 },
      'gpt-4': { input: 30.00, output: 60.00 },
      'o3-mini': { input: 1.10, output: 4.40 },
      'o1': { input: 15.00, output: 60.00 },
      'o1-mini': { input: 1.10, output: 4.40 },
    };

    for (const [key, price] of Object.entries(pricingMap)) {
      if (modelId.startsWith(key)) return price;
    }

    return { input: 1.00, output: 3.00 }; // Default
  }

  private getOpenAIContextWindow(modelId: string): number {
    if (modelId.includes('gpt-4o') || modelId.includes('o3')) return 128000;
    if (modelId.includes('gpt-4-turbo')) return 128000;
    if (modelId.includes('gpt-4')) return 8192;
    if (modelId.includes('o1')) return 200000;
    return 8192;
  }

  private getOpenAIModelName(modelId: string): string {
    const names: Record<string, string> = {
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4o': 'GPT-4o',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4': 'GPT-4',
      'o3-mini': 'O3 Mini',
      'o1': 'O1',
      'o1-mini': 'O1 Mini',
    };

    for (const [key, name] of Object.entries(names)) {
      if (modelId.startsWith(key)) return name;
    }

    return modelId;
  }

  /**
   * Google Gemini Models
   */
  private async fetchGoogleModels(): Promise<DiscoveredModel[]> {
    const apiKey = this.getApiKey('GOOGLE_API_KEY');
    const response = await fetch(
      `${PROVIDER_ENDPOINTS[AIProvider.GOOGLE]}?key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();

    return data.models
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((model: any) => this.parseGoogleModel(model));
  }

  private parseGoogleModel(model: any): DiscoveredModel {
    const id = model.name.replace('models/', '');
    const pricing = this.getGooglePricing(id);

    return {
      id,
      name: model.displayName || id,
      provider: AIProvider.GOOGLE,
      contextWindow: model.inputTokenLimit || 32768,
      pricing,
      capabilities: {
        vision: id.includes('vision') || id.includes('gemini'),
        streaming: true,
        functionCall: model.supportedGenerationMethods?.includes('generateContent'),
        json: true,
        tools: true,
      },
      metadata: {
        family: id.split('-')[0],
      },
    };
  }

  private getGooglePricing(modelId: string): { input: number; output: number } {
    if (modelId.includes('flash-lite')) return { input: 0.01875, output: 0.075 };
    if (modelId.includes('flash')) return { input: 0.075, output: 0.30 };
    if (modelId.includes('pro')) return { input: 1.25, output: 5.00 };
    return { input: 0.10, output: 0.40 };
  }

  /**
   * MiniMax Models
   */
  private async fetchMiniMaxModels(): Promise<DiscoveredModel[]> {
    // MiniMax API - للأسف لا يوجد endpoint للنماذج
    // نستخدم النماذج الثابتة
    return this.getFallbackModels(AIProvider.MINIMAX);
  }

  /**
   * Z.ai Models
   */
  private async fetchZAIModels(): Promise<DiscoveredModel[]> {
    // Z.ai - متوفر عبر z-ai-web-dev-sdk
    // النماذج مجانية
    return [
      {
        id: 'glm-4-plus',
        name: 'GLM-4 Plus',
        provider: AIProvider.ZAI,
        contextWindow: 128000,
        pricing: { input: 0, output: 0 },
        capabilities: { vision: false, streaming: true, functionCall: true, json: true, tools: false },
        metadata: { family: 'glm-4', recommended: true },
      },
      {
        id: 'glm-4-flash',
        name: 'GLM-4 Flash',
        provider: AIProvider.ZAI,
        contextWindow: 128000,
        pricing: { input: 0, output: 0 },
        capabilities: { vision: false, streaming: true, functionCall: true, json: true, tools: false },
        metadata: { family: 'glm-4' },
      },
      {
        id: 'glm-4v-plus',
        name: 'GLM-4V Plus',
        provider: AIProvider.ZAI,
        contextWindow: 8192,
        pricing: { input: 0, output: 0 },
        capabilities: { vision: true, streaming: false, functionCall: false, json: false, tools: false },
        metadata: { family: 'glm-4v', recommended: true },
      },
      {
        id: 'glm-4-air',
        name: 'GLM-4 Air',
        provider: AIProvider.ZAI,
        contextWindow: 8192,
        pricing: { input: 0, output: 0 },
        capabilities: { vision: false, streaming: true, functionCall: false, json: false, tools: false },
        metadata: { family: 'glm-4' },
      },
    ];
  }

  /**
   * DeepSeek Models
   */
  private async fetchDeepSeekModels(): Promise<DiscoveredModel[]> {
    return [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        provider: AIProvider.DEEPSEEK,
        contextWindow: 64000,
        pricing: { input: 0.14, output: 0.28 },
        capabilities: { vision: false, streaming: true, functionCall: true, json: true, tools: true },
        metadata: { family: 'deepseek', recommended: true },
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner (R1)',
        provider: AIProvider.DEEPSEEK,
        contextWindow: 64000,
        pricing: { input: 0.55, output: 2.19 },
        capabilities: { vision: false, streaming: true, functionCall: false, json: false, tools: false },
        metadata: { family: 'deepseek-r' },
      },
    ];
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * خريطة أسماء المتغيرات لكل مزود
   */
  private readonly providerKeyMap: Record<AIProvider, string[]> = {
    [AIProvider.OPENAI]: ['OPENAI_API_KEY'],
    [AIProvider.ANTHROPIC]: ['ANTHROPIC_API_KEY'],
    [AIProvider.GOOGLE]: ['GOOGLE_API_KEY', 'GOOGLE_AI_API_KEY'],
    [AIProvider.OPENROUTER]: ['OPENROUTER_API_KEY'],
    [AIProvider.MINIMAX]: ['MINIMAX_API_KEY'],
    [AIProvider.DEEPSEEK]: ['DEEPSEEK_API_KEY'],
    [AIProvider.ZAI]: [], // Z.ai لا يحتاج API key - يستخدم z-ai-web-dev-sdk
    [AIProvider.META]: [], // Llama عبر OpenRouter
  };

  /**
   * الحصول على API key للمزود
   */
  private getApiKey(keyName: string): string {
    const key = this.configService.get<string>(keyName);

    if (!key || key.includes('your-') || key.includes('sk-your')) {
      this.logger.warn(`⚠️ API key not configured: ${keyName}`);
      return '';
    }

    return key;
  }

  /**
   * التحقق من توفر API key لمزود معين
   */
  hasProviderKey(provider: AIProvider): boolean {
    const keyNames = this.providerKeyMap[provider] || [];

    // Z.ai لا يحتاج API key
    if (keyNames.length === 0) return true;

    for (const keyName of keyNames) {
      const key = this.configService.get<string>(keyName);
      if (key && !key.includes('your-') && !key.includes('sk-your')) {
        return true;
      }
    }

    return false;
  }

  /**
   * الحصول على المزودين المتاحين (لديهم API keys)
   */
  getAvailableProviders(): AIProvider[] {
    return Object.values(AIProvider).filter(provider => this.hasProviderKey(provider));
  }

  /**
   * حالة الـ API keys
   */
  getApiKeyStatus(): Record<AIProvider, { configured: boolean; keyName?: string }> {
    const status: Record<AIProvider, { configured: boolean; keyName?: string }> = {} as any;

    for (const provider of Object.values(AIProvider)) {
      const keyNames = this.providerKeyMap[provider] || [];

      if (keyNames.length === 0) {
        // Z.ai لا يحتاج API key
        status[provider] = { configured: true, keyName: 'z-ai-web-dev-sdk (no key needed)' };
        continue;
      }

      let configured = false;
      let foundKey: string | undefined;

      for (const keyName of keyNames) {
        const key = this.configService.get<string>(keyName);
        if (key && !key.includes('your-') && !key.includes('sk-your')) {
          configured = true;
          foundKey = keyName;
          break;
        }
      }

      status[provider] = { configured, keyName: foundKey };
    }

    return status;
  }

  private getFallbackModels(provider: AIProvider): DiscoveredModel[] {
    return this.fallbackModels.filter(m => m.provider === provider);
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  /**
   * الحصول على جميع النماذج
   */
  getAllModels(): DiscoveredModel[] {
    const models: DiscoveredModel[] = [];

    for (const [, providerModels] of this.modelCache) {
      models.push(...providerModels.models);
    }

    // إضافة النماذج الثابتة للمزودين غير المتاحين
    for (const model of this.fallbackModels) {
      if (!models.find(m => m.id === model.id)) {
        models.push(model);
      }
    }

    return models;
  }

  /**
   * الحصول على نماذج مزود معين
   */
  getModelsByProvider(provider: AIProvider): DiscoveredModel[] {
    const cached = this.modelCache.get(provider);
    if (cached) return cached.models;

    return this.getFallbackModels(provider);
  }

  /**
   * الحصول على نموذج بالاسم
   */
  getModel(modelId: string): DiscoveredModel | undefined {
    return this.getAllModels().find(m => m.id === modelId);
  }

  /**
   * البحث عن النماذج
   */
  searchModels(query: {
    provider?: AIProvider;
    minContextWindow?: number;
    maxInputPrice?: number;
    maxOutputPrice?: number;
    requiresVision?: boolean;
    requiresStreaming?: boolean;
    requiresFunctionCall?: boolean;
    family?: string;
    freeOnly?: boolean;
  }): DiscoveredModel[] {
    let models = this.getAllModels();

    if (query.provider) {
      models = models.filter(m => m.provider === query.provider);
    }

    if (query.minContextWindow) {
      models = models.filter(m => m.contextWindow >= query.minContextWindow);
    }

    if (query.maxInputPrice !== undefined) {
      models = models.filter(m => m.pricing.input <= query.maxInputPrice!);
    }

    if (query.maxOutputPrice !== undefined) {
      models = models.filter(m => m.pricing.output <= query.maxOutputPrice!);
    }

    if (query.requiresVision) {
      models = models.filter(m => m.capabilities.vision);
    }

    if (query.requiresStreaming) {
      models = models.filter(m => m.capabilities.streaming);
    }

    if (query.requiresFunctionCall) {
      models = models.filter(m => m.capabilities.functionCall);
    }

    if (query.family) {
      models = models.filter(m => m.metadata?.family?.includes(query.family!));
    }

    if (query.freeOnly) {
      models = models.filter(m => m.pricing.input === 0 && m.pricing.output === 0);
    }

    return models;
  }

  /**
   * الحصول على أرخص النماذج
   */
  getCheapestModels(limit: number = 10): DiscoveredModel[] {
    return this.getAllModels()
      .sort((a, b) => (a.pricing.input + a.pricing.output) - (b.pricing.input + b.pricing.output))
      .slice(0, limit);
  }

  /**
   * الحصول على النماذج المجانية
   */
  getFreeModels(): DiscoveredModel[] {
    return this.getAllModels().filter(m => m.pricing.input === 0 && m.pricing.output === 0);
  }

  /**
   * الحصول على النماذج الموصى بها
   */
  getRecommendedModels(): DiscoveredModel[] {
    return this.getAllModels().filter(m => m.metadata?.recommended);
  }

  /**
   * حالة المزودين
   */
  getProvidersStatus(): ProviderModels[] {
    return Array.from(this.modelCache.values());
  }

  /**
   * حساب تكلفة الطلب
   */
  calculateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const model = this.getModel(modelId);
    if (!model) return 0;

    const inputCost = (inputTokens / 1000000) * model.pricing.input;
    const outputCost = (outputTokens / 1000000) * model.pricing.output;

    return inputCost + outputCost;
  }
}
