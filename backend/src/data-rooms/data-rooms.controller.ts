import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	Req,
} from '@nestjs/common'
import type { Request } from 'express'
import { DataRoomsService } from './data-rooms.service'

type BodyInput = { name?: string }

@Controller('data-rooms')
export class DataRoomsController {
	constructor(private readonly rooms: DataRoomsService) {}
	private user(request: Request): string {
		return request.user!.id
	}

	@Get('default') getDefault(@Req() request: Request) {
		return this.rooms.getDefaultDataRoom(this.user(request))
	}
	@Patch('default') rename(@Req() request: Request, @Body() body: BodyInput) {
		return this.rooms.renameDefaultDataRoom(this.user(request), body.name ?? '')
	}
	@Get(':roomId/folders') list(
		@Req() request: Request,
		@Param('roomId', ParseUUIDPipe) roomId: string,
		@Query('parentId') parentId?: string,
	) {
		return this.rooms.listFolders(this.user(request), roomId, parentId)
	}
	@Post(':roomId/folders') create(
		@Req() request: Request,
		@Param('roomId', ParseUUIDPipe) roomId: string,
		@Body() body: BodyInput & { parentId?: string },
	) {
		return this.rooms.createFolder(
			this.user(request),
			roomId,
			body.parentId,
			body.name ?? '',
		)
	}
	@Patch(':roomId/folders/:folderId') renameFolder(
		@Req() request: Request,
		@Param('roomId', ParseUUIDPipe) roomId: string,
		@Param('folderId', ParseUUIDPipe) folderId: string,
		@Body() body: BodyInput,
	) {
		return this.rooms.renameFolder(
			this.user(request),
			roomId,
			folderId,
			body.name ?? '',
		)
	}
	@Delete(':roomId/folders/:folderId') delete(
		@Req() request: Request,
		@Param('roomId', ParseUUIDPipe) roomId: string,
		@Param('folderId', ParseUUIDPipe) folderId: string,
	) {
		return this.rooms.deleteFolder(this.user(request), roomId, folderId)
	}
}
