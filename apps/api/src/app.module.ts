import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { PrismaModule }           from './prisma/prisma.module';
import { CacheModule }            from './cache/cache.module';
import { AuthModule }             from './modules/auth/auth.module';
import { UsersModule }            from './modules/users/users.module';
import { SetupModule }            from './modules/setup/setup.module';
import { AuditModule }            from './modules/audit/audit.module';
import { PosDevicesModule }       from './modules/pos-devices/pos-devices.module';
import { ClientsModule }          from './modules/clients/clients.module';
import { LeadsModule }            from './modules/leads/leads.module';
import { ActivitiesModule }       from './modules/activities/activities.module';
import { PropertiesModule }       from './modules/properties/properties.module';
import { UploadsModule }          from './modules/uploads/uploads.module';
import { DashboardModule }        from './modules/dashboard/dashboard.module';
import { SearchModule }           from './modules/search/search.module';
import { ConversationsModule }    from './modules/conversations/conversations.module';
import { WhatsAppModule }         from './modules/whatsapp/whatsapp.module';
import { ViewingsModule }         from './modules/viewings/viewings.module';
import { ETAModule }              from './modules/eta/eta.module';
import { DocumentsModule }        from './modules/documents/documents.module';
import { ComplianceModule }       from './modules/compliance/compliance.module';
import { DealsModule }            from './modules/deals/deals.module';
import { ReservationsModule }     from './modules/reservations/reservations.module';
import { ContractsModule }        from './modules/contracts/contracts.module';
import { PaymentsModule }         from './modules/payments/payments.module';
import { PaymentSchedulesModule } from './modules/payment-schedules/payment-schedules.module';
import { CommissionsModule }      from './modules/commissions/commissions.module';
import { OrganizationModule }     from './modules/organization/organization.module';
import { BranchesModule }         from './modules/branches/branches.module';
import { RealtimeModule }         from './modules/realtime/realtime.module';
import { AIModule }               from './modules/ai/ai.module';
import { AutomationModule }       from './modules/automation/automation.module';
import { NotificationsModule }    from './modules/notifications/notifications.module';
import { SettingsModule }         from './modules/settings/settings.module';
import { PublicModule }           from './modules/public/public.module';
import { CommunicationModule }    from './modules/communication/communication.module';
import { FinancialReportsModule } from './modules/financial-reports/financial-reports.module';

// ✅ SetupMiddleware REMOVED — setup done via seed
import { CsrfMiddleware } from './middleware/csrf.middleware';

import {
  appConfig, databaseConfig, jwtConfig, redisConfig,
  etaConfig, aiConfig, storageConfig, whatsappConfig, paymentsConfig,
} from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig, databaseConfig, jwtConfig, redisConfig,
        etaConfig, aiConfig, storageConfig, whatsappConfig, paymentsConfig,
      ],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting (more generous limits for single-tenant)
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,  limit: 20  },
      { name: 'medium', ttl: 10000, limit: 100 },
      { name: 'long',   ttl: 60000, limit: 300 },
    ]),

    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),

    PrismaModule, CacheModule,
    AuthModule, UsersModule, SetupModule, AuditModule, PosDevicesModule,
    ClientsModule, LeadsModule, ActivitiesModule, PropertiesModule, UploadsModule,
    DashboardModule, SearchModule, ConversationsModule, WhatsAppModule,
    ViewingsModule, ETAModule, DocumentsModule, ComplianceModule,
    DealsModule, ReservationsModule, ContractsModule,
    PaymentsModule, PaymentSchedulesModule, CommissionsModule,
    OrganizationModule, BranchesModule, RealtimeModule,
    AIModule, AutomationModule, NotificationsModule, SettingsModule,
    PublicModule, CommunicationModule, FinancialReportsModule,
  ],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CsrfMiddleware)
      // NestJS MiddlewareConsumer paths are WITHOUT the global prefix
      // But the middleware's own EXCLUDED_PATHS handles the full URL check
      .exclude(
        'health',
        'api/docs/(.*)',
        // Auth routes (without global prefix)
        'auth/login',
        'auth/refresh',
        'auth/logout',
        // Public routes
        'public/(.*)',
        'setup/(.*)',
      )
      .forRoutes('*');

    // ✅ No SetupMiddleware
  }
}
