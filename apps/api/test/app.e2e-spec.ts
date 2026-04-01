// ═══════════════════════════════════════════════════════════════
// E2E Tests - اختبارات نهاية إلى نهاية
// ═══════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('API E2E Tests', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api/v1');

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  // ═══════════════════════════════════════════════════════════════
  // Health Check
  // ═══════════════════════════════════════════════════════════════

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('status', 'ok');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Setup Endpoints
  // ═══════════════════════════════════════════════════════════════

  describe('Setup API', () => {
    describe('GET /api/v1/setup/status', () => {
      it('should return setup status', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/setup/status',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().data).toHaveProperty('isSetupDone');
        expect(response.json().data).toHaveProperty('redirectTo');
      });
    });

    describe('POST /api/v1/setup/initialize', () => {
      it('should reject missing required fields', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/setup/initialize',
          payload: {
            officeName: 'مكتب تجريبي',
            // Missing owner data
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Authentication Endpoints
  // ═══════════════════════════════════════════════════════════════

  describe('Auth API', () => {
    describe('POST /api/v1/auth/login', () => {
      it('should reject invalid credentials', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: {
            email: 'nonexistent@office.com',
            password: 'wrongpassword',
          },
        });

        expect(response.statusCode).toBe(401);
        expect(response.json().error.code).toBe('INVALID_CREDENTIALS');
      });

      it('should validate email format', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: {
            email: 'invalid-email',
            password: 'password123',
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Protected Routes (require authentication)
  // ═══════════════════════════════════════════════════════════════

  describe('Protected Routes', () => {
    it('should return 401 without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/clients',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/clients',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Properties API
  // ═══════════════════════════════════════════════════════════════

  describe('Properties API', () => {
    describe('POST /api/v1/properties', () => {
      it('should reject unauthenticated requests', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/properties',
          payload: {
            title: 'شقة تجريبية',
            propertyType: 'APARTMENT',
            city: 'القاهرة',
            areaM2: 150,
            askingPrice: 2000000,
          },
        });

        expect(response.statusCode).toBe(401);
      });
    });

    describe('POST /api/v1/properties/:id/lock', () => {
      it('should reject unauthenticated lock requests', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/properties/test-id/lock',
          payload: {
            dealId: 'deal-id',
            lockType: 'temporary',
          },
        });

        expect(response.statusCode).toBe(401);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Commissions API
  // ═══════════════════════════════════════════════════════════════

  describe('Commissions API', () => {
    describe('POST /api/v1/commissions/calculate', () => {
      it('should reject unauthenticated requests', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/commissions/calculate',
          payload: {
            dealId: 'deal-id',
          },
        });

        expect(response.statusCode).toBe(401);
      });
    });

    describe('POST /api/v1/commissions/:id/approve', () => {
      it('should reject unauthenticated approval', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/commissions/commission-id/approve',
          payload: {},
        });

        expect(response.statusCode).toBe(401);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ETA API
  // ═══════════════════════════════════════════════════════════════

  describe('ETA API', () => {
    describe('POST /api/v1/eta/receipts', () => {
      it('should reject unauthenticated requests', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/eta/receipts',
          payload: {
            paymentId: 'payment-id',
            posDeviceId: 'pos-id',
            buyerType: 'P',
            items: [],
          },
        });

        expect(response.statusCode).toBe(401);
      });
    });
  });
});
