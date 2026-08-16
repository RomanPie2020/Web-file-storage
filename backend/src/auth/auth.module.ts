import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DataRoomsModule } from '../data-rooms/data-rooms.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { JwksService } from './jwks.service';

@Module({
  imports: [DataRoomsModule],
  controllers: [AuthController],
  providers: [JwksService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
