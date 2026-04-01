// ═══════════════════════════════════════════════════════════════
// N8n Service - التكامل مع n8n
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface N8nWebhookPayload {
  eventType: string;
  organizationId: string;
  entityId: string;
  entityType: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: Array<{ name: string; type: string }>;
}

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);
  private readonly n8nUrl: string;
  private readonly n8nApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.n8nUrl = this.configService.get('N8N_URL', 'http://localhost:5678');
    this.n8nApiKey = this.configService.get('N8N_API_KEY', '');
  }

  /**
   * إرسال حدث لـ n8n عبر Webhook
   */
  async triggerWebhook(
    webhookUrl: string,
    payload: N8nWebhookPayload,
  ): Promise<void> {
    if (!this.n8nApiKey) {
      this.logger.warn('N8N API key not configured, skipping webhook');
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.n8nApiKey && { 'Authorization': `Bearer ${this.n8nApiKey}` }),
        },
        body: JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        this.logger.error(`N8n webhook failed: ${response.status}`);
      }
    } catch (error) {
      this.logger.error(`Failed to trigger n8n webhook: ${error}`);
    }
  }

  /**
   * الحصول على قائمة الـ Workflows
   */
  async getWorkflows(): Promise<N8nWorkflow[]> {
    if (!this.n8nApiKey) {
      return [];
    }

    try {
      const response = await fetch(`${this.n8nUrl}/api/v1/workflows`, {
        headers: {
          'Authorization': `Bearer ${this.n8nApiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`N8n API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      this.logger.error(`Failed to fetch n8n workflows: ${error}`);
      return [];
    }
  }

  /**
   * تشغيل Workflow
   */
  async executeWorkflow(
    workflowId: string,
    payload: Record<string, unknown>,
  ): Promise<{ success: boolean; executionId?: string }> {
    if (!this.n8nApiKey) {
      this.logger.warn('N8N API key not configured');
      return { success: false };
    }

    try {
      const response = await fetch(
        `${this.n8nUrl}/api/v1/workflows/${workflowId}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.n8nApiKey}`,
          },
          body: JSON.stringify({ data: payload }),
        },
      );

      if (!response.ok) {
        throw new Error(`N8n execution failed: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        executionId: data.executionId,
      };
    } catch (error) {
      this.logger.error(`Failed to execute n8n workflow: ${error}`);
      return { success: false };
    }
  }

  /**
   * التحقق من حالة الـ HITL (Human-in-the-Loop)
   */
  async checkHITLStatus(executionId: string): Promise<{
    status: 'pending' | 'approved' | 'rejected';
    approver?: string;
    approvedAt?: string;
  }> {
    // هذا يعتمد على كيفية تنفيذ HITL في n8n
    // يمكن استخدام قاعدة بيانات محلية للتتبع
    return {
      status: 'pending',
    };
  }

  /**
   * الموافقة على HITL
   */
  async approveHITL(
    executionId: string,
    approverId: string,
  ): Promise<{ success: boolean }> {
    // إرسال إشارة للمتابعة في n8n
    try {
      await fetch(`${this.n8nUrl}/webhook/hitl/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executionId,
          approverId,
          approvedAt: new Date().toISOString(),
        }),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to approve HITL: ${error}`);
      return { success: false };
    }
  }

  /**
   * رفض HITL
   */
  async rejectHITL(
    executionId: string,
    rejecterId: string,
    reason?: string,
  ): Promise<{ success: boolean }> {
    try {
      await fetch(`${this.n8nUrl}/webhook/hitl/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executionId,
          rejecterId,
          reason,
          rejectedAt: new Date().toISOString(),
        }),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to reject HITL: ${error}`);
      return { success: false };
    }
  }
}
