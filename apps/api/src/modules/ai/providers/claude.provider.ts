// ═══════════════════════════════════════════════════════════════
// Claude Provider - موفر Claude API
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ClaudeRequest {
  model: 'claude-sonnet-4-6' | 'claude-opus-4-6';
  prompt: string;
  systemPrompt?: string;
  maxTokens: number;
  streaming?: boolean;
}

interface ClaudeResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

@Injectable()
export class ClaudeProvider implements OnModuleInit {
  private readonly logger = new Logger(ClaudeProvider.name);
  private apiKey: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY') || '';
  }

  /**
   * إرسال طلب لـ Claude
   */
  async generate(request: ClaudeRequest): Promise<ClaudeResponse> {
    const startTime = Date.now();

    // إذا لم يكن هناك API key، أعد رد mock
    if (!this.apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not configured, returning mock response');
      return {
        content: 'هذه استجابة تجريبية. يرجى تكوين ANTHROPIC_API_KEY.',
        model: request.model,
        inputTokens: 100,
        outputTokens: 20,
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxTokens,
          system: request.systemPrompt || 'أنت مساعد ذكي يتحدث العربية بطلاقة.',
          // إضافة thinking لـ Tier 2 فقط (claude-opus-4-6)
          ...(request.model === 'claude-opus-4-6' && {
            thinking: { type: 'adaptive' },
          }),
          messages: [
            {
              role: 'user',
              content: request.prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Claude API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const textContent = data.content?.find((c: { type: string }) => c.type === 'text');
      
      return {
        content: textContent?.text || '',
        model: data.model || request.model,
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Claude API call failed: ${error}`);
      throw error;
    }
  }

  /**
   * إرسال طلب streaming
   */
  async *generateStream(request: ClaudeRequest): AsyncGenerator<string> {
    if (!this.apiKey) {
      yield 'هذه استجابة تجريبية. يرجى تكوين ANTHROPIC_API_KEY.';
      return;
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxTokens,
          system: request.systemPrompt || 'أنت مساعد ذكي يتحدث العربية بطلاقة.',
          // إضافة thinking لـ Tier 2 فقط (claude-opus-4-6)
          ...(request.model === 'claude-opus-4-6' && {
            thinking: { type: 'adaptive' },
          }),
          messages: [
            {
              role: 'user',
              content: request.prompt,
            },
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                yield parsed.delta.text;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Claude streaming failed: ${error}`);
      throw error;
    }
  }
}
