import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ShareResourceType, ShareType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';

type Resource = { resourceType: ShareResourceType; resourceId: string };

@Injectable()
export class SharingService {
  private readonly admin: SupabaseClient;
  private readonly bucket: string;
  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    this.admin = createClient(config.getOrThrow('SUPABASE_URL'), config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'));
    this.bucket = config.get<string>('SUPABASE_STORAGE_BUCKET', 'data-room-pdfs');
  }

  private email(value: unknown) {
    if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
      throw new BadRequestException('A valid recipient email is required');
    return value.trim().toLowerCase();
  }
  private async roomOf(resource: Resource) {
    if (resource.resourceType === ShareResourceType.DATA_ROOM) return this.prisma.dataRoom.findUnique({ where: { id: resource.resourceId } });
    if (resource.resourceType === ShareResourceType.FOLDER) return this.prisma.folder.findUnique({ where: { id: resource.resourceId }, select: { dataRoom: true } }).then((x) => x?.dataRoom);
    return this.prisma.file.findUnique({ where: { id: resource.resourceId }, select: { dataRoom: true } }).then((x) => x?.dataRoom);
  }
  private async owns(userId: string, resource: Resource) {
    const room = await this.roomOf(resource);
    if (!room || room.ownerId !== userId) throw new ForbiddenException('You do not own this resource');
    return room.id;
  }
  async create(userId: string, input: Resource & { shareType?: ShareType; recipientEmail?: string; expiresAt?: string }) {
    const roomId = await this.owns(userId, input);
    const shareType = input.shareType ?? ShareType.PUBLIC;
    if (shareType === ShareType.USER && !input.recipientEmail) throw new BadRequestException('Recipient email is required');
    let sharedWithUserId: string | undefined;
    if (shareType === ShareType.USER) {
      const result = await this.admin.auth.admin.listUsers({ perPage: 1000 });
      const match = result.data.users.find((u) => u.email?.toLowerCase() === this.email(input.recipientEmail));
      if (!match) throw new NotFoundException('Recipient has no account');
      sharedWithUserId = match.id;
    }
    return this.prisma.share.create({ data: { resourceType: input.resourceType, resourceId: input.resourceId, shareType, sharedWithUserId, publicToken: shareType === ShareType.PUBLIC ? randomBytes(32).toString('base64url') : undefined, expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined }, select: { id: true, resourceType: true, resourceId: true, shareType: true, role: true, publicToken: true, sharedWithUserId: true, expiresAt: true, revokedAt: true, createdAt: true } });
  }
  async list(userId: string, resource: Resource) { await this.owns(userId, resource); return this.prisma.share.findMany({ where: { resourceType: resource.resourceType, resourceId: resource.resourceId }, orderBy: { createdAt: 'desc' }, select: { id: true, resourceType: true, resourceId: true, shareType: true, role: true, publicToken: true, sharedWithUserId: true, expiresAt: true, revokedAt: true, createdAt: true } }); }
  async revoke(userId: string, id: string) { const share = await this.prisma.share.findUnique({ where: { id } }); if (!share) throw new NotFoundException('Share was not found'); await this.owns(userId, share); return this.prisma.share.update({ where: { id }, data: { revokedAt: new Date() }, select: { id: true, revokedAt: true } }); }

  private async candidates(resource: Resource): Promise<Resource[]> {
    if (resource.resourceType === ShareResourceType.DATA_ROOM) return [resource];
    if (resource.resourceType === ShareResourceType.FILE) {
      const file = await this.prisma.file.findUnique({ where: { id: resource.resourceId }, select: { dataRoomId: true, folderId: true } });
      if (!file) return [];
      return [{ resourceType: ShareResourceType.DATA_ROOM, resourceId: file.dataRoomId }, ...(file.folderId ? await this.candidates({ resourceType: ShareResourceType.FOLDER, resourceId: file.folderId }) : []), resource];
    }
    const folder = await this.prisma.folder.findUnique({ where: { id: resource.resourceId }, select: { dataRoomId: true, parentId: true } });
    if (!folder) return [];
    return [{ resourceType: ShareResourceType.DATA_ROOM, resourceId: folder.dataRoomId }, ...(folder.parentId ? await this.candidates({ resourceType: ShareResourceType.FOLDER, resourceId: folder.parentId }) : []), resource];
  }
  async canAccess(userId: string | undefined, resource: Resource, token?: string) {
    const room = await this.roomOf(resource); if (!room) return false;
    if (userId && room.ownerId === userId) return true;
    const candidates = await this.candidates(resource);
    const shares = await this.prisma.share.findMany({ where: { AND: [{ OR: candidates.map((x) => ({ resourceType: x.resourceType, resourceId: x.resourceId })) }, { revokedAt: null }, { OR: [{ shareType: ShareType.PUBLIC, ...(token ? { publicToken: token } : {}) }, ...(userId ? [{ shareType: ShareType.USER, sharedWithUserId: userId }] : [])] }] } });
    return shares.some((s) => !s.expiresAt || s.expiresAt > new Date());
  }
  async resolve(token: string) {
    const share = await this.prisma.share.findFirst({ where: { publicToken: token, shareType: ShareType.PUBLIC, revokedAt: null } });
    if (!share || (share.expiresAt && share.expiresAt <= new Date())) throw new NotFoundException('Share link is unavailable');
    const room = await this.roomOf(share);
    if (!room) throw new NotFoundException('Shared resource was not found');
    if (share.resourceType === ShareResourceType.FILE) {
      const file = await this.prisma.file.findUnique({ where: { id: share.resourceId }, select: { id: true, name: true, sizeBytes: true, mimeType: true } });
      if (!file) throw new NotFoundException('Shared file was not found');
      return { shareId: share.id, resourceType: share.resourceType, resourceId: share.resourceId, roomId: room.id, roomName: room.name, file: { ...file, sizeBytes: file.sizeBytes.toString() } };
    }
    const parentId = share.resourceType === ShareResourceType.FOLDER ? share.resourceId : null;
    const [folder, files] = await Promise.all([
      this.prisma.folder.findMany({ where: { dataRoomId: room.id, parentId }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      this.prisma.file.findMany({ where: { dataRoomId: room.id, folderId: parentId }, select: { id: true, name: true, sizeBytes: true, mimeType: true }, orderBy: { name: 'asc' } }),
    ]);
    return { shareId: share.id, resourceType: share.resourceType, resourceId: share.resourceId, roomId: room.id, roomName: room.name, folders: folder, files: files.map((file) => ({ ...file, sizeBytes: file.sizeBytes.toString() })) };
  }
  async assertAccess(userId: string | undefined, resource: Resource, token?: string) { if (!(await this.canAccess(userId, resource, token))) throw new ForbiddenException('You do not have access to this resource'); }

  async publicContent(token: string, resourceType: ShareResourceType, resourceId: string) {
    await this.assertAccess(undefined, { resourceType, resourceId }, token);
    const room = await this.roomOf({ resourceType, resourceId });
    if (!room) throw new NotFoundException('Shared resource was not found');
    if (resourceType === ShareResourceType.FILE) {
      const file = await this.prisma.file.findUnique({ where: { id: resourceId }, select: { id: true, name: true, sizeBytes: true, mimeType: true, storagePath: true } });
      if (!file) throw new NotFoundException('Shared file was not found');
      const signed = await this.admin.storage.from(this.bucket).createSignedUrl(file.storagePath, 300);
      const download = await this.admin.storage.from(this.bucket).createSignedUrl(file.storagePath, 300, { download: file.name });
      if (signed.error || download.error) throw new NotFoundException('Preview unavailable');
      return { roomName: room.name, file: { id: file.id, name: file.name, sizeBytes: file.sizeBytes.toString(), mimeType: file.mimeType, url: signed.data.signedUrl, downloadUrl: download.data.signedUrl } };
    }
    const parentId = resourceType === ShareResourceType.FOLDER ? resourceId : null;
    const [folders, files] = await Promise.all([
      this.prisma.folder.findMany({ where: { dataRoomId: room.id, parentId }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      this.prisma.file.findMany({ where: { dataRoomId: room.id, folderId: parentId }, select: { id: true, name: true, sizeBytes: true, mimeType: true }, orderBy: { name: 'asc' } }),
    ]);
    return { roomName: room.name, folders, files: files.map((file) => ({ ...file, sizeBytes: file.sizeBytes.toString() })) };
  }
}
