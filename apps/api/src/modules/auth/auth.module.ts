// ═══════════════════════════════════════════════════════════════
// Auth Module
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const expiresIn = configService.get<string>('jwt.accessTokenExpiry') || '15m';
        const isDevelopment = configService.get('NODE_ENV') !== 'production';
        
        // In development: use simple secret (HS256)
        // In production: use RSA keys (RS256)
        const privateKey = configService.get<string>('jwt.privateKey');
        const secret = configService.get<string>('jwt.secret') || configService.get<string>('JWT_SECRET');
        
        if (isDevelopment && secret) {
          return {
            secret,
            signOptions: {
              algorithm: 'HS256' as const,
              expiresIn: expiresIn as '15m',
            },
          };
        }
        
        if (privateKey) {
          return {
            privateKey,
            signOptions: {
              algorithm: 'RS256' as const,
              expiresIn: expiresIn as '15m',
            },
          };
        }
        
        // Fallback to JWT_SECRET
        if (secret) {
          return {
            secret,
            signOptions: {
              algorithm: 'HS256' as const,
              expiresIn: expiresIn as '15m',
            },
          };
        }
        
        throw new Error('JWT_SECRET or JWT_PRIVATE_KEY must be configured');
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
