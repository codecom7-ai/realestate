import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Unit Lock Race Condition (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testPropertyId: string;
  let testDeal1Id: string;
  let testDeal2Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);

    // Clean test data
    await prisma.propertyLock.deleteMany();
    await prisma.deal.deleteMany();
    await prisma.property.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Test Office',
        slug: 'test-office',
        isSetupDone: true,
      },
    });

    // Create test user
    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: 'test@example.com',
        passwordHash: '$2b$12$test',
        firstName: 'Test',
        lastName: 'User',
        role: 'OWNER',
        permissions: [],
      },
    });

    // Create test client
    const client = await prisma.client.create({
      data: {
        organizationId: org.id,
        firstName: 'Test',
        lastName: 'Client',
        phone: '01012345678',
      },
    });

    // Create test property
    const property = await prisma.property.create({
      data: {
        organizationId: org.id,
        title: 'Test Property',
        propertyType: 'APARTMENT',
        status: 'AVAILABLE',
        city: 'Cairo',
        areaM2: 100,
        askingPrice: 1000000,
      },
    });
    testPropertyId = property.id;

    // Create test deals
    const deal1 = await prisma.deal.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        propertyId: property.id,
        stage: 'NEGOTIATION',
        dealType: 'sale',
      },
    });
    testDeal1Id = deal1.id;

    const deal2 = await prisma.deal.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        propertyId: property.id,
        stage: 'NEGOTIATION',
        dealType: 'sale',
      },
    });
    testDeal2Id = deal2.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Concurrent Unit Lock Requests', () => {
    it('should only allow one lock to succeed when multiple requests arrive simultaneously', async () => {
      // Simulate two concurrent lock requests
      const lockRequests = [
        // Request 1
        prisma.propertyLock.create({
          data: {
            propertyId: testPropertyId,
            lockedByDealId: testDeal1Id,
            lockType: 'temporary',
            expiresAt: new Date(Date.now() + 86400000),
          },
        }),
        // Request 2
        prisma.propertyLock.create({
          data: {
            propertyId: testPropertyId,
            lockedByDealId: testDeal2Id,
            lockType: 'temporary',
            expiresAt: new Date(Date.now() + 86400000),
          },
        }),
      ];

      // Execute both requests simultaneously
      const results = await Promise.allSettled(lockRequests);

      // Count successes and failures
      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      // Only one should succeed
      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);

      // Verify the failure is due to unique constraint
      if (failures[0].status === 'rejected') {
        expect(failures[0].reason.code).toBe('P2002'); // Prisma unique constraint error
      }
    });

    it('should prevent double booking after lock is created', async () => {
      // Verify property has a lock
      const existingLock = await prisma.propertyLock.findUnique({
        where: { propertyId: testPropertyId },
      });

      expect(existingLock).toBeDefined();
      expect(existingLock!.lockedByDealId).toBe(testDeal1Id);

      // Try to create another lock - should fail
      await expect(
        prisma.propertyLock.create({
          data: {
            propertyId: testPropertyId,
            lockedByDealId: testDeal2Id,
            lockType: 'confirmed',
            expiresAt: new Date(Date.now() + 86400000),
          },
        })
      ).rejects.toThrow();
    });

    it('should allow new lock after previous lock is removed', async () => {
      // Remove existing lock
      await prisma.propertyLock.delete({
        where: { propertyId: testPropertyId },
      });

      // Now should be able to create new lock
      const newLock = await prisma.propertyLock.create({
        data: {
          propertyId: testPropertyId,
          lockedByDealId: testDeal2Id,
          lockType: 'confirmed',
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      expect(newLock).toBeDefined();
      expect(newLock.lockedByDealId).toBe(testDeal2Id);
    });
  });
});
