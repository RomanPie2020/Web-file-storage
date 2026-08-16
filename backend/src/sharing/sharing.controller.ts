import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import type { Request } from 'express';
import { SharingService } from './sharing.service';

@Controller('shares')
export class SharingController {
  constructor(private readonly sharing: SharingService) {}
  private user(req: Request) { return req.user!.id; }
  @Post() create(@Req() req: Request, @Body() body: any) { return this.sharing.create(this.user(req), body); }
  @Get() list(@Req() req: Request, @Query('resourceType') resourceType: any, @Query('resourceId', ParseUUIDPipe) resourceId: string) { return this.sharing.list(this.user(req), { resourceType, resourceId }); }
  @Delete(':id') revoke(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) { return this.sharing.revoke(this.user(req), id); }
  @Public() @Get('public/:token') resolve(@Param('token') token: string) { return this.sharing.resolve(token); }
  @Public() @Get('public/:token/content') content(@Param('token') token: string, @Query('resourceType') resourceType: any, @Query('resourceId', ParseUUIDPipe) resourceId: string) { return this.sharing.publicContent(token, resourceType, resourceId); }
}
