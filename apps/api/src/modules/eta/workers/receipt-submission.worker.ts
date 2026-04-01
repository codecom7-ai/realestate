// ═══════════════════════════════════════════════════════════════
// Receipt Submission Worker - معالج إرسال الإيصالات
// BullMQ worker مع استراتيجية Retry
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job, Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { ETAAuthService } from '../eta-auth.service';
import { ETASignerService } from '../eta-signer.service';
import { ETAReceiptStatus, ProfessionalReceiptDto, ReceiptSubmissionDto } from '../dto/eta.dto';

/**
 * بيانات مهمة الإرسال
 */
interface ReceiptSubmissionJobData {
  receiptId: string;
  organizationId: string;
  payload: ProfessionalReceiptDto;
  attempt: number;
}

/**
 * استراتيجية Retry:
 * - 422: انتظر Retry-After header
 * - 401: أعد المصادقة
 * - 5xx: exponential backoff (1s, 2s, 4s, 8s) max 3
 */
@Injectable()
export class ReceiptSubmissionWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReceiptSubmissionWorker.name);
  private worker: Worker | null = null;
  private queue: Queue | null = null;
  private readonly maxRetries = 3;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly authService: ETAAuthService,
    private readonly signerService: ETASignerService,
  ) {}

  async onModuleInit() {
    // التحقق من Redis
    const redisUrl = this.configService.get('REDIS_URL', 'redis://localhost:6379');

    try {
      // إنشاء Queue
      this.queue = new Queue('eta-receipt-submission', {
        connection: { url: redisUrl },
      });

      // إنشاء Worker
      this.worker = new Worker<ReceiptSubmissionJobData>(
        'eta-receipt-submission',
        async (job) => this.processJob(job),
        {
          connection: { url: redisUrl },
          concurrency: 5, // معالجة 5 مهام في نفس الوقت
          limiter: {
            max: 10, // 10 مهام
            duration: 1000, // في الثانية
          },
        },
      );

      // أحداث Worker
      this.worker.on('completed', (job) => {
        this.logger.log(`Job ${job.id} completed`);
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(`Job ${job?.id} failed: ${err.message}`);
      });

      this.logger.log('✅ ETA Receipt Submission Worker started');
    } catch (error) {
      this.logger.warn(`⚠️ Redis not available, worker disabled: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
  }

  /**
   * إضافة مهمة إرسال للـ Queue
   */
  async addSubmissionJob(
    receiptId: string,
    organizationId: string,
    payload: ProfessionalReceiptDto,
  ): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Queue not available, processing synchronously');
      await this.processSubmission(receiptId, organizationId, payload, 1);
      return;
    }

    await this.queue.add(
      'submit-receipt',
      {
        receiptId,
        organizationId,
        payload,
        attempt: 1,
      },
      {
        attempts: this.maxRetries,
        backoff: {
          type: 'exponential',
          delay: 1000, // ابدأ بـ 1 ثانية
        },
        removeOnComplete: 100, // احتفظ بآخر 100 مهمة ناجحة
        removeOnFail: 500, // احتفظ بآخر 500 مهمة فاشلة
      },
    );

    this.logger.log(`Added job for receipt ${receiptId}`);
  }

  /**
   * معالجة مهمة الإرسال
   */
  private async processJob(job: Job<ReceiptSubmissionJobData>): Promise<void> {
    const { receiptId, organizationId, payload, attempt } = job.data;

    this.logger.log(`Processing job ${job.id} for receipt ${receiptId}, attempt ${attempt}`);

    await this.processSubmission(receiptId, organizationId, payload, attempt);
  }

  /**
   * تنفيذ الإرسال
   */
  private async processSubmission(
    receiptId: string,
    organizationId: string,
    payload: ProfessionalReceiptDto,
    attempt: number,
  ): Promise<void> {
    try {
      const token = await this.authService.getToken();
      const apiUrl = this.authService.getApiUrl();

      // توقيع الإيصال
      const signature = await this.signerService.signReceipt(payload);

      // بناء الطلب
      const submissionPayload: ReceiptSubmissionDto = {
        receipts: [payload],
        signatures: [signature],
      };

      const response = await fetch(`${apiUrl}/api/v1/receiptsubmissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionPayload),
      });

      // معالجة الاستجابة
      await this.handleResponse(response, receiptId, payload, attempt);
    } catch (error) {
      await this.handleError(error, receiptId, attempt);
    }
  }

  /**
   * معالجة الاستجابة من ETA
   */
  private async handleResponse(
    response: Response,
    receiptId: string,
    payload: ProfessionalReceiptDto,
    attempt: number,
  ): Promise<void> {
    const receipt = await this.prisma.eTAReceipt.findUnique({
      where: { id: receiptId },
    });

    if (!receipt) {
      throw new Error(`Receipt ${receiptId} not found`);
    }

    // 401 Unauthorized - إعادة المصادقة
    if (response.status === 401) {
      await this.authService.invalidateToken();
      throw new Error('Token expired, re-authenticating');
    }

    // 422 Duplicate Submission
    if (response.status === 422) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '600');
      await this.prisma.eTAReceipt.update({
        where: { id: receiptId },
        data: {
          status: ETAReceiptStatus.QUEUED_FOR_RETRY,
          lastError: `Duplicate submission, retry after ${retryAfter}s`,
          retryCount: attempt,
        },
      });

      // إعادة المحاولة بعد Retry-After
      if (attempt < this.maxRetries) {
        throw new Error(`Duplicate submission, will retry after ${retryAfter}s`);
      }
      return;
    }

    // 5xx Server Error
    if (response.status >= 500) {
      throw new Error(`ETA server error: ${response.status}`);
    }

    // نجاح أو خطأ آخر
    if (response.status === 202 || response.ok) {
      const result = await response.json();

      if (result.acceptedDocuments?.length > 0) {
        const accepted = result.acceptedDocuments[0];
        await this.prisma.eTAReceipt.update({
          where: { id: receiptId },
          data: {
            submissionUUID: result.submissionUUID,
            longId: accepted.longId,
            status: ETAReceiptStatus.VALID,
            processedAt: new Date(),
            etaResponse: JSON.stringify(result),
            lastError: null,
          },
        });
        this.logger.log(`Receipt ${receiptId} submitted successfully`);
      } else if (result.rejectedDocuments?.length > 0) {
        const rejected = result.rejectedDocuments[0];
        await this.prisma.eTAReceipt.update({
          where: { id: receiptId },
          data: {
            submissionUUID: result.submissionUUID,
            status: ETAReceiptStatus.INVALID,
            etaResponse: JSON.stringify(result),
            lastError: rejected.error?.message || 'Unknown error',
            processedAt: new Date(),
          },
        });
        this.logger.warn(`Receipt ${receiptId} rejected: ${rejected.error?.message}`);
      }
    } else {
      const errorText = await response.text();
      throw new Error(`ETA submission failed: ${response.status} - ${errorText}`);
    }
  }

  /**
   * معالجة الأخطاء
   */
  private async handleError(error: Error, receiptId: string, attempt: number): Promise<void> {
    this.logger.error(`Error processing receipt ${receiptId}: ${error.message}`);

    // تحديث حالة الإيصال
    if (attempt >= this.maxRetries) {
      await this.prisma.eTAReceipt.update({
        where: { id: receiptId },
        data: {
          status: ETAReceiptStatus.INVALID,
          lastError: `Max retries exceeded: ${error.message}`,
          retryCount: attempt,
        },
      });
    } else {
      await this.prisma.eTAReceipt.update({
        where: { id: receiptId },
        data: {
          status: ETAReceiptStatus.QUEUED_FOR_RETRY,
          lastError: error.message,
          retryCount: attempt,
        },
      });
    }

    throw error; // إعادة رمي الخطأ لتفعيل الـ retry
  }

  /**
   * معالجة الإيصالات المعلقة
   */
  async processPendingReceipts(): Promise<number> {
    const pendingReceipts = await this.prisma.eTAReceipt.findMany({
      where: {
        status: ETAReceiptStatus.QUEUED_FOR_RETRY,
        retryCount: { lt: this.maxRetries },
      },
      take: 50,
    });

    for (const receipt of pendingReceipts) {
      const payload = JSON.parse(receipt.receiptPayload) as ProfessionalReceiptDto;
      await this.addSubmissionJob(
        receipt.id,
        receipt.organizationId,
        payload,
      );
    }

    this.logger.log(`Queued ${pendingReceipts.length} pending receipts`);
    return pendingReceipts.length;
  }
}
