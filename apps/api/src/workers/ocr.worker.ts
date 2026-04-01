// ═══════════════════════════════════════════════════════════════
// OCR Worker - نظام تشغيل المكتب العقاري المصري
// Phase 5.01 — Document Vault + OCR
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  OCRStatus,
  DocumentType,
  OCRResultDto,
} from '../modules/documents/dto/documents.dto';

// NOTE: في الإنتاج، يجب استخدام BullMQ مع Redis
// هذا الـ worker يعمل بشكل مبسط للـ development

interface OCRTask {
  documentId: string;
  organizationId: string;
  userId: string;
  fileUrl: string;
  mimeType: string;
}

@Injectable()
export class OCRWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OCRWorker.name);
  private isRunning = false;
  private geminiApiKey: string | null = null;

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private prisma: PrismaService,
  ) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || null;
  }

  onModuleInit() {
    this.isRunning = true;
    this.logger.log('OCR Worker initialized');
    
    if (!this.geminiApiKey) {
      this.logger.warn(
        'GEMINI_API_KEY not set - OCR will run in mock mode for development',
      );
    }
  }

  onModuleDestroy() {
    this.isRunning = false;
    this.logger.log('OCR Worker stopped');
  }

  /**
   * معالجة طلب OCR
   */
  @OnEvent('document.ocr_requested')
  async handleOCRTask(task: OCRTask) {
    this.logger.log(`Processing OCR for document: ${task.documentId}`);

    try {
      let result: OCRResultDto;

      if (this.geminiApiKey) {
        // استخدام Gemini API للـ OCR
        result = await this.processWithGemini(task);
      } else {
        // Mock mode للتطوير
        result = await this.processMock(task);
      }

      // حفظ النتيجة
      await this.saveResult(result);

      this.logger.log(`OCR completed for document: ${task.documentId}`);
    } catch (error) {
      this.logger.error(`OCR failed for document ${task.documentId}:`, error);

      // حفظ حالة الفشل
      await this.saveResult({
        documentId: task.documentId,
        status: OCRStatus.FAILED,
        errorMessage: error.message || 'Unknown error',
        processedAt: new Date(),
      });
    }
  }

  /**
   * معالجة OCR باستخدام Gemini API
   */
  private async processWithGemini(task: OCRTask): Promise<OCRResultDto> {
    try {
      // تحميل الصورة/الملف
      const response = await fetch(task.fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      // تحديد نوع MIME للصورة
      const mimeType = this.getGeminiMimeType(task.mimeType);

      // استدعاء Gemini API
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64,
                    },
                  },
                  {
                    text: this.getOCRPrompt(task.mimeType),
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 4096,
            },
          }),
        },
      );

      if (!geminiResponse.ok) {
        throw new Error(`Gemini API error: ${geminiResponse.statusText}`);
      }

      const data = await geminiResponse.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // تحليل النتيجة
      return this.parseGeminiResponse(task.documentId, text);
    } catch (error) {
      this.logger.error('Gemini processing failed:', error);
      throw error;
    }
  }

  /**
   * Mock mode للتطوير
   */
  private async processMock(task: OCRTask): Promise<OCRResultDto> {
    this.logger.log('Running OCR in mock mode');

    // محاكاة تأخير المعالجة
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // إرجاع بيانات وهمية
    return {
      documentId: task.documentId,
      status: OCRStatus.COMPLETED,
      extractedText: '[Mock OCR Result - Development Mode]',
      structuredData: {
        nationalId: '29123123456789',
        fullName: 'أحمد محمد علي',
        fullNameAr: 'أحمد محمد علي',
        birthDate: '1991-05-15',
        address: 'القاهرة - مصر الجديدة',
        issueDate: '2020-01-01',
        expiryDate: '2030-01-01',
        gender: 'M',
      },
      suggestedDocumentType: DocumentType.NATIONAL_ID,
      confidence: 0.95,
      processedAt: new Date(),
    };
  }

  /**
   * حفظ نتيجة OCR
   */
  private async saveResult(result: OCRResultDto) {
    await this.prisma.document.update({
      where: { id: result.documentId },
      data: {
        ocrStatus: result.status,
        ocrData: result.structuredData
          ? JSON.stringify(result.structuredData)
          : null,
      },
    });

    // إرسال حدث اكتمال
    this.eventEmitter.emit('document.ocr_completed', {
      documentId: result.documentId,
      status: result.status,
      structuredData: result.structuredData,
      suggestedDocumentType: result.suggestedDocumentType,
    });
  }

  /**
   * Prompt للـ OCR حسب نوع الملف
   */
  private getOCRPrompt(mimeType: string): string {
    const basePrompt = `أنت نظام OCR متخصص في استخراج البيانات من المستندات المصرية.
قم بتحليل الصورة المرفقة واستخراج البيانات التالية بتنسيق JSON:

{
  "documentType": "نوع المستند (national_id, passport, broker_license, commercial_reg, etc.)",
  "extractedText": "النص الكامل المستخرج",
  "structuredData": {
    "nationalId": "الرقم القومي (إن وجد)",
    "fullName": "الاسم بالإنجليزية",
    "fullNameAr": "الاسم بالعربية",
    "birthDate": "تاريخ الميلاد (YYYY-MM-DD)",
    "address": "العنوان",
    "issueDate": "تاريخ الإصدار",
    "expiryDate": "تاريخ الانتهاء",
    "gender": "الجنس (M/F)",
    "licenseNumber": "رقم الترخيص (للسمسرة)",
    "classification": "التصنيف (للسمسرة)",
    "regNumber": "رقم السجل (للسجل التجاري)",
    "companyName": "اسم الشركة",
    "taxId": "الرقم الضريبي"
  },
  "confidence": درجة الثقة من 0 إلى 1
}

أرجع فقط JSON بدون أي نص إضافي.`;

    return basePrompt;
  }

  /**
   * تحويل نوع MIME للـ Gemini
   */
  private getGeminiMimeType(mimeType: string): string {
    const mapping: Record<string, string> = {
      'image/jpeg': 'image/jpeg',
      'image/jpg': 'image/jpeg',
      'image/png': 'image/png',
      'image/webp': 'image/webp',
      'application/pdf': 'application/pdf',
    };
    return mapping[mimeType] || 'image/jpeg';
  }

  /**
   * تحليل استجابة Gemini
   */
  private parseGeminiResponse(documentId: string, text: string): OCRResultDto {
    try {
      // استخراج JSON من الرد
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        documentId,
        status: OCRStatus.COMPLETED,
        extractedText: parsed.extractedText || text,
        structuredData: parsed.structuredData || {},
        suggestedDocumentType: this.mapDocumentType(parsed.documentType),
        confidence: parsed.confidence || 0.8,
        processedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to parse Gemini response:', error);
      return {
        documentId,
        status: OCRStatus.COMPLETED,
        extractedText: text,
        structuredData: {},
        confidence: 0.5,
        processedAt: new Date(),
      };
    }
  }

  /**
   * تحويل نوع المستند
   */
  private mapDocumentType(type?: string): DocumentType | undefined {
    if (!type) return undefined;

    const mapping: Record<string, DocumentType> = {
      national_id: DocumentType.NATIONAL_ID,
      passport: DocumentType.PASSPORT,
      driver_license: DocumentType.DRIVER_LICENSE,
      broker_license: DocumentType.BROKER_LICENSE,
      commercial_reg: DocumentType.COMMERCIAL_REG,
      tax_id: DocumentType.TAX_ID,
    };

    return mapping[type.toLowerCase()] || DocumentType.OTHER;
  }
}
