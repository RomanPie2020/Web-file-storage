import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Request } from 'express'
import { memoryStorage } from 'multer'
import { FilesService } from './files.service'

@Controller('data-rooms/:roomId/files')
export class FilesController {
  constructor(private readonly files: FilesService) {}
  private user(req: Request) { return req.user!.id }
  @Get() list(@Req() req: Request, @Param('roomId', ParseUUIDPipe) roomId: string, @Query('folderId', new ParseUUIDPipe({ optional: true })) folderId?: string) { return this.files.list(this.user(req), roomId, folderId) }
  @Post() @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })) upload(@Req() req: Request, @Param('roomId', ParseUUIDPipe) roomId: string, @Query('folderId', new ParseUUIDPipe({ optional: true })) folderId: string | undefined, @UploadedFile() file: Express.Multer.File) { return this.files.upload(this.user(req), roomId, folderId, file) }
  @Patch(':fileId') rename(@Req() req: Request, @Param('roomId', ParseUUIDPipe) roomId: string, @Param('fileId', ParseUUIDPipe) fileId: string, @Body() body: { name?: string; folderId?: string }) { return body.folderId === undefined ? this.files.rename(this.user(req), roomId, fileId, body.name ?? '') : this.files.move(this.user(req), roomId, fileId, body.folderId || undefined) }
  @Delete(':fileId') delete(@Req() req: Request, @Param('roomId', ParseUUIDPipe) roomId: string, @Param('fileId', ParseUUIDPipe) fileId: string) { return this.files.delete(this.user(req), roomId, fileId) }
}
