import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataRoom, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_DATA_ROOM_NAME = 'My Data Room';

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
    `);

    if (created[0]) {
      return created[0];
    }

    const existing = await this.prisma.dataRoom.findFirst({
      where: { ownerId: userId, isDefault: true },
    });

    if (!existing) {
      throw new Error('Default Data Room was not available after provisioning');
    }

    return existing;
  }

  async renameDefaultDataRoom(userId: string, name: string): Promise<DataRoom> {
    const room = await this.prisma.dataRoom.findFirst({
      where: { ownerId: userId, isDefault: true },
      select: { id: true },
    });

    if (!room) {
      throw new NotFoundException('Default Data Room was not found');
    }

    return this.prisma.dataRoom.update({
      where: { id: room.id },
      data: { name },
    });
  }

  /**
   * Delete endpoints must call this before a removal is attempted. It keeps
   * the UUID-backed root intact while allowing its display name to change.
   */
  async assertDataRoomCanBeDeleted(userId: string, dataRoomId: string): Promise<void> {
    const room = await this.prisma.dataRoom.findFirst({
      where: { id: dataRoomId, ownerId: userId },
      select: { isDefault: true },
    });

    if (!room) {
      throw new NotFoundException('Data Room was not found');
    }

    if (room.isDefault) {
      throw new ForbiddenException('The default Data Room cannot be deleted');
    }
  }
}
