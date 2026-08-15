import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { JwksService } from './jwks.service';

@Module({
  controllers: [AuthController],
  providers: [JwksService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
