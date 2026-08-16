import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { DataRoomsService } from '../data-rooms/data-rooms.service';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly dataRooms: DataRoomsService) {}

  @Public()
  @Get('status')
  getStatus() {
    return { status: 'ok' };
  }

  @Get('me')
  async getMe(@Req() request: Request) {
    const user = request.user;
    if (!user) return undefined;

    await this.dataRooms.ensureDefaultDataRoom(user.id);
    return user;
  }
}
