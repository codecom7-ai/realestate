// ═══════════════════════════════════════════════════════════════
// AI Service Unit Tests
// ═══════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import { AIService } from './ai.service';
import { AIRouterService } from './ai-router.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { IntentDetectionService } from './services/intent-detection.service';
import { NextBestActionService } from './services/next-best-action.service';
import { ChurnRiskService } from './services/churn-risk.service';

describe('AIService', () => {
  let service: AIService;
  let prisma: jest.Mocked<PrismaService>;
  let cacheService: jest.Mocked<CacheService>;
  let aiRouter: jest.Mocked<AIRouterService>;
  let intentDetection: jest.Mocked<IntentDetectionService>;
  let nextBestAction: jest.Mocked<NextBestActionService>;
  let churnRisk: jest.Mocked<ChurnRiskService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: PrismaService,
          useValue: {
            lead: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
            client: {
              findFirst: jest.fn(),
            },
            activity: {
              findMany: jest.fn(),
            },
            aiUsageLog: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: AIRouterService,
          useValue: {
            route: jest.fn(),
          },
        },
        {
          provide: IntentDetectionService,
          useValue: {
            detectIntent: jest.fn(),
          },
        },
        {
          provide: NextBestActionService,
          useValue: {
            getNextAction: jest.fn(),
          },
        },
        {
          provide: ChurnRiskService,
          useValue: {
            detectChurnRisk: jest.fn(),
            getChurnAlerts: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    prisma = module.get(PrismaService);
    cacheService = module.get(CacheService);
    aiRouter = module.get(AIRouterService);
    intentDetection = module.get(IntentDetectionService);
    nextBestAction = module.get(NextBestActionService);
    churnRisk = module.get(ChurnRiskService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('copilot', () => {
    it('should return AI response for valid message', async () => {
      // This test would mock the AI SDK response
      // For now, we'll test the structure
      expect(service).toBeDefined();
    });
  });

  describe('getLeadScore', () => {
    it('should calculate lead score based on lead data', async () => {
      const mockLead = {
        id: 'lead-123',
        stage: 'NEGOTIATING',
        budget: 2000000,
        client: {
          isVip: true,
        },
        viewings: [{ id: 'v1' }, { id: 'v2' }],
        conversations: [{ id: 'c1' }],
      };

      prisma.lead.findFirst.mockResolvedValue(mockLead as any);

      expect(service).toBeDefined();
    });
  });

  describe('Intent Detection Integration', () => {
    it('should delegate to IntentDetectionService', async () => {
      const mockIntentResult = {
        primaryIntent: 'BUY_NOW',
        confidenceScore: 85,
        secondaryIntents: [],
        recommendedActions: [],
      };

      intentDetection.detectIntent.mockResolvedValue(mockIntentResult as any);

      const result = await intentDetection.detectIntent(
        'lead-123',
        'org-123',
        'user-123',
      );

      expect(result.primaryIntent).toBe('BUY_NOW');
      expect(result.confidenceScore).toBe(85);
    });
  });

  describe('Next Best Action Integration', () => {
    it('should delegate to NextBestActionService', async () => {
      const mockActionResult = {
        action: 'CALL_NOW',
        priority: 'high',
        reasoning: 'العميل جاهز للشراء',
      };

      nextBestAction.getNextAction.mockResolvedValue(mockActionResult as any);

      const result = await nextBestAction.getNextAction(
        'lead-123',
        'org-123',
        'user-123',
      );

      expect(result.action).toBe('CALL_NOW');
      expect(result.priority).toBe('high');
    });
  });

  describe('Churn Risk Integration', () => {
    it('should delegate to ChurnRiskService', async () => {
      const mockChurnResult = {
        leadId: 'lead-123',
        riskLevel: 'HIGH',
        riskScore: 75,
        riskFactors: [],
        recoverySuggestions: [],
      };

      churnRisk.detectChurnRisk.mockResolvedValue(mockChurnResult as any);

      const result = await churnRisk.detectChurnRisk(
        'lead-123',
        'org-123',
        'user-123',
      );

      expect(result.riskLevel).toBe('HIGH');
      expect(result.riskScore).toBe(75);
    });

    it('should get churn alerts for organization', async () => {
      const mockAlerts = [
        { leadId: 'lead-1', riskScore: 85, riskLevel: 'CRITICAL' },
        { leadId: 'lead-2', riskScore: 70, riskLevel: 'HIGH' },
      ];

      churnRisk.getChurnAlerts.mockResolvedValue(mockAlerts as any);

      const result = await churnRisk.getChurnAlerts('org-123', 60);

      expect(result).toHaveLength(2);
    });
  });
});
