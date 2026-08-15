import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  @Public()
  @Get('status')
  getStatus() { return { status: 'ok' }; }

  @Get('me')
  getMe(@Req() request: Request) { return request.user; }
}
