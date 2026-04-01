// ═══════════════════════════════════════════════════════════════
// Gemini Provider - موفر Gemini API (للـ OCR والـ Vision)
// من skill.md: Tier 3 — Vision & OCR
// model: "gemini-3.1-pro-preview"  // OCR وثائق، صور عقارات
// ⚠️ "gemini-3-pro-preview" يتوقف 26 مارس 2026!
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * نماذج Gemini المتاحة
 * من skill.md: gemini-3.1-pro-preview للـ OCR
 * في حالة عدم توفر 3.1، نستخدم gemini-2.0-flash-exp
 */
type GeminiModel = 
  | 'gemini-1.5-pro' 
  | 'gemini-1.5-flash' 
  | 'gemini-2.0-flash-exp'
  | 'gemini-3.1-pro-preview'; // من skill.md للـ OCR

interface GeminiRequest {
  model?: GeminiModel;
  prompt: string;
  maxTokens: number;
  imageData?: {
    mimeType: string;
    data: string; // base64
  };
}

interface GeminiResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

@Injectable()
export class GeminiProvider implements OnModuleInit {
  private readonly logger = new Logger(GeminiProvider.name);
  private apiKey: string;

  // Default model for OCR and Vision tasks
  // من skill.md: gemini-3.1-pro-preview للـ OCR
  // ⚠️ gemini-3-pro-preview يتوقف 26 مارس 2026
  private readonly DEFAULT_MODEL: GeminiModel = 'gemini-3.1-pro-preview';
  
  // Fallback إذا لم يتوفر النموذج الجديد
  private readonly FALLBACK_MODEL: GeminiModel = 'gemini-2.0-flash-exp';

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY') || '';
  }

  /**
   * إرسال طلب لـ Gemini
   */
  async generate(request: GeminiRequest): Promise<GeminiResponse> {
    const startTime = Date.now();
    const model = request.model || this.DEFAULT_MODEL;

    if (!this.apiKey) {
      this.logger.warn('GOOGLE_AI_API_KEY not configured, returning mock response');
      return {
        content: 'هذه استجابة تجريبية. يرجى تكوين GOOGLE_AI_API_KEY.',
        model: model,
        inputTokens: 100,
        outputTokens: 20,
        latencyMs: Date.now() - startTime,
      };
    }

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      { text: request.prompt },
    ];

    // إضافة صورة إذا موجودة
    if (request.imageData) {
      parts.push({
        inlineData: {
          mimeType: request.imageData.mimeType,
          data: request.imageData.data,
        },
      });
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              maxOutputTokens: request.maxTokens,
              temperature: 0.1, // Low temperature for OCR tasks
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        
        // إذا فشل النموذج (مثلاً gemini-3.1-pro-preview غير متوفر)، جرب fallback
        if (response.status === 404 && model !== this.FALLBACK_MODEL) {
          this.logger.warn(`Model ${model} not found, trying fallback: ${this.FALLBACK_MODEL}`);
          return this.generate({
            ...request,
            model: this.FALLBACK_MODEL,
          });
        }
        
        throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      return {
        content: textContent,
        model: model,
        inputTokens: data.usageMetadata?.promptTokenCount || 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Gemini API call failed: ${error}`);
      throw error;
    }
  }

  /**
   * استخراج النص من صورة (OCR)
   * من skill.md: استخدم gemini-3.1-pro-preview للـ OCR
   */
  async extractTextFromImage(imageBase64: string, mimeType: string): Promise<string> {
    const result = await this.generate({
      // استخدام DEFAULT_MODEL = gemini-3.1-pro-preview (مع fallback تلقائي)
      model: this.DEFAULT_MODEL,
      prompt: 'استخرج كل النص الموجود في هذه الصورة. أعد النص فقط بدون أي تعليقات إضافية. حافظ على تنسيق النص الأصلي.',
      maxTokens: 4096,
      imageData: {
        mimeType,
        data: imageBase64,
      },
    });

    return result.content;
  }

  /**
   * تحليل مستند (عقد، بطاقة، إيصال)
   */
  async analyzeDocument(
    imageBase64: string, 
    mimeType: string, 
    documentType: string
  ): Promise<Record<string, unknown>> {
    const prompts: Record<string, string> = {
      contract: `حلل هذا العقد العقاري واستخرج البيانات التالية بصيغة JSON:
        - الأطراف (البائع والمشتري): names, nationalIds, phones
        - موضوع العقد: propertyDetails
        - السعر: amount, currency
        - تاريخ العقد: contractDate
        - المدة (إن وجدت): duration
        - الشروط الأساسية: terms
        
        أعد JSON فقط بدون أي نص إضافي.`,
      
      national_id: `استخرج البيانات من بطاقة الرقم القومي المصرية بصيغة JSON:
        - name: الاسم الكامل
        - nationalId: الرقم القومي
        - address: العنوان
        - birthDate: تاريخ الميلاد
        - gender: الجنس
        - maritalStatus: الحالة الاجتماعية
        - issueDate: تاريخ الإصدار
        - expiryDate: تاريخ الانتهاء
        
        أعد JSON فقط بدون أي نص إضافي.`,
      
      receipt: `استخرج بيانات هذا الإيصال بصيغة JSON:
        - receiptNumber: رقم الإيصال
        - date: التاريخ
        - amount: المبلغ
        - description: الوصف
        - seller: البائع
        - buyer: المشتري
        - items: قائمة الأصناف
        
        أعد JSON فقط بدون أي نص إضافي.`,

      property_deed: `استخرج بيانات هذا الصحيفة العقارية بصيغة JSON:
        - deedNumber: رقم الصحيفة
        - propertyType: نوع العقار
        - area: المساحة
        - location: الموقع
        - owner: المالك
        - registrationDate: تاريخ القيد
        - encumbrances: القيود
        
        أعد JSON فقط بدون أي نص إضافي.`,
    };

    const result = await this.generate({
      // استخدام DEFAULT_MODEL = gemini-3.1-pro-preview (مع fallback تلقائي)
      model: this.DEFAULT_MODEL,
      prompt: prompts[documentType] || 'استخرج كل البيانات المهمة من هذه الصورة بصيغة JSON. أعد JSON فقط.',
      maxTokens: 4096,
      imageData: {
        mimeType,
        data: imageBase64,
      },
    });

    // محاولة parsing الـ JSON
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      this.logger.warn('Failed to parse JSON from Gemini response');
    }

    return { rawText: result.content };
  }

  /**
   * وصف صورة عقار
   */
  async describePropertyImage(imageBase64: string, mimeType: string): Promise<{
    description: string;
    features: string[];
    condition: string;
    roomType?: string;
  }> {
    const result = await this.generate({
      model: 'gemini-1.5-flash',
      prompt: `حلل هذه الصورة العقارية وأعد النتيجة بصيغة JSON:
        - description: وصف تفصيلي للعقار بالعربية
        - features: قائمة المميزات المرئية (مثل: إضاءة طبيعية، تشطيب جيد، مساحة واسعة)
        - condition: حالة العقار (ممتاز/جيد/يحتاج صيانة)
        - roomType: نوع الغرفة إن أمكن تحديده (صالة/غرفة نوم/مطبخ/حمام/شرفة)
        
        أعد JSON فقط.`,
      maxTokens: 1024,
      imageData: {
        mimeType,
        data: imageBase64,
      },
    });

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      this.logger.warn('Failed to parse JSON from property image analysis');
    }

    return {
      description: result.content,
      features: [],
      condition: 'غير محدد',
    };
  }
}
