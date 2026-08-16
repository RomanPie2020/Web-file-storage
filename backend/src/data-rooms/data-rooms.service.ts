import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { DataRoom, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

const DEFAULT_DATA_ROOM_NAME = 'My Data Room'

@Injectable()
export class DataRoomsService {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Creates a user's root room exactly once. The partial unique index in the
	 * initial migration makes this safe when multiple authenticated requests
	 * arrive at the same time.
	 */
	async ensureDefaultDataRoom(userId: string): Promise<DataRoom> {
		const created = await this.prisma.$queryRaw<DataRoom[]>(Prisma.sql`
      INSERT INTO data_rooms (id, owner_id, name, is_default, created_at, updated_at)
      VALUES (gen_random_uuid(), ${userId}::uuid, ${DEFAULT_DATA_ROOM_NAME}, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING
      RETURNING id, owner_id, name, is_default, created_at, updated_at
    `)

		if (created[0]) {
			return created[0]
		}

		const existing = await this.prisma.dataRoom.findFirst({
			where: { ownerId: userId, isDefault: true },
		})

		if (!existing) {
			throw new Error('Default Data Room was not available after provisioning')
		}

		return existing
	}

	private cleanName(name: unknown): string {
		if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
			throw new BadRequestException('Name must be between 1 and 120 characters')
		}
		return name.trim()
	}

	private normalized(name: string): string {
		return name.trim().normalize('NFKC').toLocaleLowerCase()
	}

	async getDefaultDataRoom(userId: string): Promise<DataRoom> {
		return this.ensureDefaultDataRoom(userId)
	}

	async renameDefaultDataRoom(userId: string, name: string): Promise<DataRoom> {
		name = this.cleanName(name)
		const room = await this.prisma.dataRoom.findFirst({
			where: { ownerId: userId, isDefault: true },
			select: { id: true },
		})

		if (!room) {
			throw new NotFoundException('Default Data Room was not found')
		}

		return this.prisma.dataRoom.update({
			where: { id: room.id },
			data: { name },
		})
	}

	/**
	 * Delete endpoints must call this before a removal is attempted. It keeps
	 * the UUID-backed root intact while allowing its display name to change.
	 */
	async assertDataRoomCanBeDeleted(
		userId: string,
		dataRoomId: string,
	): Promise<void> {
		const room = await this.prisma.dataRoom.findFirst({
			where: { id: dataRoomId, ownerId: userId },
			select: { isDefault: true },
		})

		if (!room) {
			throw new NotFoundException('Data Room was not found')
		}

		if (room.isDefault) {
			throw new ForbiddenException('The default Data Room cannot be deleted')
		}
	}

	private async ownedRoom(userId: string, roomId: string): Promise<DataRoom> {
		const room = await this.prisma.dataRoom.findFirst({
			where: { id: roomId, ownerId: userId },
		})
		if (!room) throw new NotFoundException('Data Room was not found')
		return room
	}

	async listFolders(userId: string, roomId: string, parentId?: string) {
		await this.ownedRoom(userId, roomId)
		if (parentId) await this.assertFolderInRoom(userId, roomId, parentId)
		return this.prisma.folder.findMany({
			where: { dataRoomId: roomId, parentId: parentId ?? null },
			orderBy: [{ name: 'asc' }, { id: 'asc' }],
			select: {
				id: true,
				dataRoomId: true,
				parentId: true,
				name: true,
				createdAt: true,
				updatedAt: true,
			},
		})
	}

	async createFolder(
		userId: string,
		roomId: string,
		parentId: string | undefined,
		name: string,
	) {
		await this.ownedRoom(userId, roomId)
		name = this.cleanName(name)
		const normalizedName = this.normalized(name)
		if (parentId) await this.assertFolderInRoom(userId, roomId, parentId)
		const duplicate = await this.prisma.folder.findFirst({
			where: { dataRoomId: roomId, parentId: parentId ?? null, normalizedName },
		})
		if (duplicate)
			throw new ConflictException('A folder with this name already exists here')
		return this.prisma.folder.create({
			data: { dataRoomId: roomId, parentId, name, normalizedName },
			select: {
				id: true,
				dataRoomId: true,
				parentId: true,
				name: true,
				createdAt: true,
				updatedAt: true,
			},
		})
	}

	async renameFolder(
		userId: string,
		roomId: string,
		folderId: string,
		name: string,
	) {
		await this.assertFolderInRoom(userId, roomId, folderId)
		name = this.cleanName(name)
		const normalizedName = this.normalized(name)
		const folder = await this.prisma.folder.findUniqueOrThrow({
			where: { id: folderId },
			select: { parentId: true },
		})
		const duplicate = await this.prisma.folder.findFirst({
			where: {
				dataRoomId: roomId,
				parentId: folder.parentId,
				normalizedName,
				id: { not: folderId },
			},
		})
		if (duplicate)
			throw new ConflictException('A folder with this name already exists here')
		return this.prisma.folder.update({
			where: { id: folderId },
			data: { name, normalizedName },
			select: {
				id: true,
				dataRoomId: true,
				parentId: true,
				name: true,
				createdAt: true,
				updatedAt: true,
			},
		})
	}

	async deleteFolder(userId: string, roomId: string, folderId: string) {
		await this.assertFolderInRoom(userId, roomId, folderId)
		await this.prisma.folder.delete({ where: { id: folderId } })
		return { deleted: true }
	}

	private async assertFolderInRoom(
		userId: string,
		roomId: string,
		folderId: string,
	): Promise<void> {
		await this.ownedRoom(userId, roomId)
		const result = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id FROM folders WHERE id = ${folderId}::uuid AND data_room_id = ${roomId}::uuid
        UNION ALL SELECT f.id, f.parent_id FROM folders f JOIN ancestors a ON a.parent_id = f.id
      ) SELECT id FROM ancestors LIMIT 1
    `)
		if (!result[0]) throw new NotFoundException('Folder was not found')
	}
}
