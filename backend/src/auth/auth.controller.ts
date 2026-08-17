import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { DataRoomsService } from '../data-rooms/data-rooms.service';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';
import { SignupDto, SignupValidationPipe } from './signup.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly dataRooms: DataRoomsService,
    private readonly auth: AuthService,
  ) {}

  @Public()
  @Post('signup')
  signup(@Body(SignupValidationPipe) body: SignupDto) {
    return this.auth.signup(body);
  }

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
