import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from './app.module';
import { XssSanitizationPipe } from './common/pipes/xss-sanitization.pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true, trustProxy: true }),
  );

  const config  = app.get(ConfigService);
  const isProd  = config.get('NODE_ENV') === 'production';
  const origin  = config.get('CORS_ORIGIN', 'https://aqar.souqdev.com');

  // ① Register @fastify/cookie — MUST be before any middleware reading cookies
  await app.register(fastifyCookie as any, {
    secret: config.get('COOKIE_SECRET', 'real-estate-os-change-in-prod'),
  });

  // ② CORS
  app.enableCors({
    origin,
    credentials: true,
    methods:     ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: [
      'Content-Type', 'Authorization', 'Accept-Language',
      'x-csrf-token', 'X-Requested-With',
    ],
  });

  // ③ Helmet (security headers)
  await app.register(helmet as any, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", 'data:', 'https:'],
        scriptSrc:  ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  // ④ Global API prefix
  app.setGlobalPrefix('api/v1');

  // ⑤ Validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:               true,
      forbidNonWhitelisted:    true,
      transform:               true,
      transformOptions:        { enableImplicitConversion: true },
      disableErrorMessages:    isProd,
    }),
    new XssSanitizationPipe({ throwOnXss: false }),
  );

  // ⑥ Swagger docs
  const doc = new DocumentBuilder()
    .setTitle('Real Estate OS API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));

  // ⑦ Health endpoint (bypasses all middleware)
  // ⑦ Health endpoints (bypasses all middleware)
  const healthHandler = (_req: any, res: any) => {
    res.send({ status: 'ok', timestamp: new Date().toISOString() });
  };
  app.getHttpAdapter().get('/api/v1/health', healthHandler);
  app.getHttpAdapter().get('/health',        healthHandler); // for OLS health check

  // ⑧ No-cache for API responses
  app.getHttpAdapter().getInstance().addHook('onRequest', async (req: any, reply: any) => {
    const url: string = req.url ?? '';
    if (!url.startsWith('/api/v1/health') && !url.includes('/_next/')) {
      reply.header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }
  });

  const port = config.get<number>('PORT', 3102);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API running on http://localhost:${port}/api/v1`);
}

bootstrap();
