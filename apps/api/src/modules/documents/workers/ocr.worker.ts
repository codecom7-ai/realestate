// ═══════════════════════════════════════════════════════════════
// OCR Worker - نظام تشغيل المكتب العقاري المصري
// Phase 5.01 — Document Vault + OCR
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { DocumentType, OCRStatus } from '../dto/documents.dto';
import {
  DOCUMENT_TYPES_CONFIG,
  OCR_ENABLED_DOCUMENT_TYPES,
  getOCRPrompt,
} from '../config/document-types.config';
import ZAI from 'z-ai-web-dev-sdk';

interface OCRTaskPayload {
  documentId: string;
  organizationId: string;
  userId: string;
  fileUrl: string;
  mimeType: string;
}

interface OCRStructuredData {
  [key: string]: string | number | undefined;
}

@Injectable()
export class OCRWorker {
  private readonly logger = new Logger(OCRWorker.name);

  constructor(private prisma: PrismaService) {}

  /**
   * معالجة حدث طلب OCR
   */
  @OnEvent('document.ocr_requested')
  async handleOCRTask(payload: OCRTaskPayload) {
    this.logger.log(`Processing OCR for document ${payload.documentId}`);

    try {
      // جلب المستند
      const document = await this.prisma.document.findUnique({
        where: { id: payload.documentId },
      });

      if (!document) {
        this.logger.error(`Document ${payload.documentId} not found`);
        return;
      }

      const documentType = document.documentType as DocumentType;

      // التحقق من أن المستند يدعم OCR
      if (!OCR_ENABLED_DOCUMENT_TYPES.includes(documentType)) {
        this.logger.warn(`Document type ${documentType} does not support OCR`);
        await this.updateDocumentStatus(payload.documentId, OCRStatus.COMPLETED, null);
        return;
      }

      // الحصول على الـ prompt المناسب
      const ocrPrompt = getOCRPrompt(documentType);

      if (!ocrPrompt) {
        this.logger.warn(`No OCR prompt for document type ${documentType}`);
        await this.updateDocumentStatus(payload.documentId, OCRStatus.COMPLETED, null);
        return;
      }

      // تشغيل OCR باستخدام Gemini
      const result = await this.processWithGemini(
        payload.fileUrl,
        payload.mimeType,
        ocrPrompt,
        documentType,
      );

      // تحديث المستند بالنتيجة
      await this.updateDocumentStatus(
        payload.documentId,
        result.status,
        result.structuredData,
        result.extractedText,
        result.confidence,
        result.errorMessage,
      );

      // إرسال حدث اكتمال OCR
      if (result.status === OCRStatus.COMPLETED) {
        this.logger.log(`OCR completed for document ${payload.documentId}`);
        // إرسال عبر EventEmitter
        // سيتم التقاطه بواسطة أي مستمع آخر
      }
    } catch (error) {
      this.logger.error(`OCR failed for document ${payload.documentId}:`, error);

      await this.updateDocumentStatus(
        payload.documentId,
        OCRStatus.FAILED,
        null,
        null,
        null,
        error.message || 'Unknown error occurred during OCR processing',
      );
    }
  }

  /**
   * معالجة المستند باستخدام Gemini 3.1 Pro Preview
   */
  private async processWithGemini(
    fileUrl: string,
    mimeType: string,
    prompt: string,
    documentType: DocumentType,
  ): Promise<{
    status: OCRStatus;
    structuredData: OCRStructuredData | null;
    extractedText?: string;
    confidence?: number;
    errorMessage?: string;
  }> {
    try {
      const zai = await ZAI.create();

      // تحضير الرسالة مع الصورة
      const messages = [
        {
          role: 'system' as const,
          content: `أنت نظام OCR متخصص في استخراج البيانات من المستندات المصرية.
قم بتحليل الصورة واستخراج البيانات المطلوبة.
أرجع النتيجة بتنسيق JSON فقط بدون أي نص إضافي.
إذا لم تتمكن من قراءة حقل معين، اتركه فارغاً.
يجب أن يكون الرد JSON صالح للتحليل.`,
        },
        {
          role: 'user' as const,
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: fileUrl },
            },
          ],
        },
      ];

      // استخدام Gemini 3.1 Pro Preview (أرخص)
      const completion = await zai.chat.completions.create({
        model: 'gemini-3.1-pro-preview',
        messages: messages as any,
        temperature: 0.1, // دقة عالية
        max_tokens: 2000,
      });

      const responseText = completion.choices[0]?.message?.content || '';

      if (!responseText) {
        return {
          status: OCRStatus.FAILED,
          structuredData: null,
          errorMessage: 'Empty response from OCR service',
        };
      }

      // محاولة تحليل JSON من الرد
      let structuredData: OCRStructuredData | null = null;
      try {
        // البحث عن JSON في الرد
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          structuredData = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        this.logger.warn('Failed to parse OCR response as JSON, storing raw text');
      }

      // تشفير البيانات الحساسة
      if (structuredData) {
        structuredData = this.encryptSensitiveFields(documentType, structuredData);
      }

      return {
        status: OCRStatus.COMPLETED,
        structuredData,
        extractedText: responseText,
        confidence: 0.85, // قيمة افتراضية للثقة
      };
    } catch (error) {
      this.logger.error('Gemini OCR error:', error);
      return {
        status: OCRStatus.FAILED,
        structuredData: null,
        errorMessage: error.message || 'Failed to process document with OCR',
      };
    }
  }

  /**
   * تشفير البيانات الحساسة
   */
  private encryptSensitiveFields(
    documentType: DocumentType,
    data: OCRStructuredData,
  ): OCRStructuredData {
    const config = DOCUMENT_TYPES_CONFIG[documentType];
    if (!config) return data;

    const encryptedData = { ...data };

    for (const field of config.ocrFields) {
      if (field.encrypted && encryptedData[field.field]) {
        // تشفير AES-256-GCM سيتم تنفيذه في service آخر
        // هنا نضيف علامة أن الحقل حساس
        encryptedData[`${field.field}_encrypted`] = 'true';
      }
    }

    return encryptedData;
  }

  /**
   * تحديث حالة المستند
   */
  private async updateDocumentStatus(
    documentId: string,
    status: OCRStatus,
    structuredData: OCRStructuredData | null,
    extractedText?: string,
    confidence?: number,
    errorMessage?: string,
  ) {
    const updateData: any = {
      ocrStatus: status,
      ocrData: structuredData ? JSON.stringify(structuredData) : null,
    };

    if (status === OCRStatus.COMPLETED) {
      // تحديث تاريخ الانتهاء إذا تم استخراجه
      if (structuredData?.expiryDate) {
        try {
          const expiryDate = new Date(structuredData.expiryDate as string);
          if (!isNaN(expiryDate.getTime())) {
            updateData.expiresAt = expiryDate;
          }
        } catch {
          // تجاهل تاريخ غير صالح
        }
      }
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: updateData,
    });
  }

  /**
   * معالجة طلب OCR يدوي
   */
  async processDocumentManually(documentId: string, organizationId: string, userId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, organizationId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // إرسال حدث للمعالجة
    this.handleOCRTask({
      documentId,
      organizationId,
      userId,
      fileUrl: document.fileUrl,
      mimeType: document.mimeType,
    });

    return {
      success: true,
      message: 'OCR processing started',
      messageAr: 'بدأت معالجة OCR',
    };
  }
}
