import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import * as Joi from 'joi';
import { HealthService } from './health/health.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: Joi.object({
    PORT: Joi.number().port().default(3001),
    FRONTEND_ORIGIN: Joi.string().uri().default('http://localhost:3000'),
    SUPABASE_URL: Joi.string().uri().allow('').optional(),
    SUPABASE_ANON_KEY: Joi.string().allow('').optional(),
    SUPABASE_SERVICE_ROLE_KEY: Joi.string().allow('').optional(),
    DATABASE_URL: Joi.string().allow('').optional(),
    SUPABASE_JWT_ISSUER: Joi.string().uri().allow('').optional(),
    SUPABASE_JWT_AUDIENCE: Joi.string().allow('').optional(),
    SUPABASE_JWKS_URL: Joi.string().uri().allow('').optional(),
  }) })],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
