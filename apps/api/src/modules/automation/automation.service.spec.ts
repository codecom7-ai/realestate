// ═══════════════════════════════════════════════════════════════
// Automation Service Unit Tests
// ═══════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import { AutomationService } from './automation.service';
import { RulesEngineService } from './rules-engine.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AutomationService', () => {
  let service: AutomationService;
  let prisma: jest.Mocked<PrismaService>;
  let rulesEngine: jest.Mocked<RulesEngineService>;

  const mockRule = {
    id: 'rule-123',
    organizationId: 'org-123',
    name: 'إشعار عند تغيير المرحلة',
    trigger: 'lead.stage_changed',
    conditions: { type: 'and', conditions: [] },
    actions: [{ type: 'send_notification', config: { message: 'تم تغيير المرحلة' } }],
    isActive: true,
    runCount: 5,
    lastRunAt: new Date(),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationService,
        {
          provide: PrismaService,
          useValue: {
            automationRule: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: RulesEngineService,
          useValue: {
            evaluateConditions: jest.fn(),
            executeActions: jest.fn(),
            testRule: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AutomationService>(AutomationService);
    prisma = module.get(PrismaService);
    rulesEngine = module.get(RulesEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an automation rule', async () => {
      prisma.automationRule.create.mockResolvedValue(mockRule as any);

      const createDto = {
        name: 'إشعار عند تغيير المرحلة',
        trigger: 'lead.stage_changed',
        conditions: { type: 'and', conditions: [] },
        actions: [{ type: 'send_notification', config: { message: 'test' } }],
      };

      const result = await service.create('org-123', createDto);

      expect(result.name).toBe('إشعار عند تغيير المرحلة');
      expect(prisma.automationRule.create).toHaveBeenCalled();
    });
  });

  describe('toggle', () => {
    it('should toggle rule active status', async () => {
      prisma.automationRule.findFirst.mockResolvedValue(mockRule as any);
      prisma.automationRule.update.mockResolvedValue({
        ...mockRule,
        isActive: false,
      } as any);

      const result = await service.toggle('rule-123', 'org-123', false);

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      prisma.automationRule.findFirst.mockResolvedValue(null);

      await expect(
        service.toggle('non-existent', 'org-123', true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('testRule', () => {
    it('should test a rule with sample data', async () => {
      rulesEngine.testRule.mockResolvedValue({
        matched: true,
        actionsExecuted: 1,
        results: [{ success: true, action: 'send_notification' }],
      });

      const result = await service.testRule('rule-123', 'org-123', {
        leadId: 'lead-123',
        stage: 'NEW',
      });

      expect(result.matched).toBe(true);
      expect(result.actionsExecuted).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return automation statistics', async () => {
      prisma.automationRule.count
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(7)   // active
        .mockResolvedValueOnce(3);  // inactive

      const result = await service.getStats('org-123');

      expect(result.total).toBe(10);
      expect(result.active).toBe(7);
      expect(result.inactive).toBe(3);
    });
  });
});
