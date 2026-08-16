import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, File as FileRecord } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SharingService } from '../sharing/sharing.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SIGNED_URL_LIFETIME_SECONDS = 5 * 60;

@Injectable()
export class FilesService {
  private readonly storage: SupabaseClient;
  private readonly bucket: string;
  constructor(
    private readonly prisma: PrismaService,
    private readonly sharing: SharingService,
    config: ConfigService,
  ) {
    this.bucket = config.get<string>('SUPABASE_STORAGE_BUCKET', 'data-room-pdfs');
    this.storage = createClient(
      config.getOrThrow('SUPABASE_URL'),
      config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  private normalize(name: string) {
    return name.trim().normalize('NFKC').toLocaleLowerCase();
  }
  private publicFile<T extends { sizeBytes: bigint }>(file: T) {
    return { ...file, sizeBytes: file.sizeBytes.toString() };
  }
  private validName(name: unknown) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 255)
      throw new BadRequestException('File name must be between 1 and 255 characters');
    return name.trim();
  }
  private async folder(userId: string, roomId: string, folderId?: string) {
    const room = await this.prisma.dataRoom.findFirst({
      where: { id: roomId, ownerId: userId },
      select: { id: true },
    });
    if (!room) throw new NotFoundException('Data Room was not found');
    if (folderId) {
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(folderId)
      )
        throw new BadRequestException('Destination folder must be a valid folder');
      const folder = await this.prisma.folder.findFirst({
        where: { id: folderId, dataRoomId: roomId },
        select: { id: true },
      });
      if (!folder) throw new NotFoundException('Folder was not found');
    }
  }

  async list(userId: string, roomId: string, folderId?: string) {
    await this.sharing.assertAccess(userId, { resourceType: folderId ? 'FOLDER' as any : 'DATA_ROOM' as any, resourceId: folderId ?? roomId });
    await this.folder(userId, roomId, folderId);
    const files = await this.prisma.file.findMany({
      where: { ownerId: userId, dataRoomId: roomId, folderId: folderId ?? null },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        dataRoomId: true,
        folderId: true,
        name: true,
        sizeBytes: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return files.map((file) => ({ ...file, sizeBytes: file.sizeBytes.toString() }));
  }

  async upload(
    userId: string,
    roomId: string,
    folderId: string | undefined,
    uploaded: Express.Multer.File,
  ) {
    await this.folder(userId, roomId, folderId);
    if (!uploaded || uploaded.size > MAX_FILE_SIZE)
      throw new BadRequestException('PDF files must be 10 MB or smaller');
    if (
      uploaded.mimetype !== 'application/pdf' ||
      uploaded.buffer.subarray(0, 5).toString('ascii') !== '%PDF-'
    )
      throw new BadRequestException('Only valid PDF files are allowed');
    const storagePath = `${userId}/${roomId}/${randomUUID()}.pdf`;
    const result = await this.storage.storage
      .from(this.bucket)
      .upload(storagePath, uploaded.buffer, { contentType: 'application/pdf', upsert: false });
    if (result.error)
      throw new BadRequestException(`Storage upload failed: ${result.error.message}`);
    let name = this.validName(uploaded.originalname);
    const dot = name.toLowerCase().endsWith('.pdf') ? name.length - 4 : name.length;
    const stem = name.slice(0, dot),
      suffix = name.slice(dot);
    try {
      for (let attempt = 0; attempt < 100; attempt++) {
        const candidate = attempt === 0 ? name : `${stem} (${attempt + 1})${suffix}`;
        try {
          const created = await this.prisma.file.create({
            data: {
              dataRoomId: roomId,
              folderId,
              ownerId: userId,
              name: candidate,
              normalizedName: this.normalize(candidate),
              sizeBytes: uploaded.size,
              mimeType: 'application/pdf',
              storagePath,
            },
            select: {
              id: true,
              dataRoomId: true,
              folderId: true,
              name: true,
              sizeBytes: true,
              mimeType: true,
              createdAt: true,
              updatedAt: true,
            },
          });
          return this.publicFile(created);
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
            throw error;
        }
      }
      throw new ConflictException('Could not generate a unique file name');
    } catch (error) {
      await this.storage.storage.from(this.bucket).remove([storagePath]);
      throw error;
    }
  }

  private async owned(userId: string, roomId: string, fileId: string): Promise<FileRecord> {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, dataRoomId: roomId, ownerId: userId },
    });
    if (!file) throw new NotFoundException('File was not found');
    return file;
  }
  async preview(userId: string, roomId: string, fileId: string) {
    await this.sharing.assertAccess(userId, { resourceType: 'FILE' as any, resourceId: fileId });
    const file = await this.owned(userId, roomId, fileId);
    if (file.mimeType !== 'application/pdf')
      throw new BadRequestException('Preview unavailable for this file type');
    const result = await this.storage.storage
      .from(this.bucket)
      .createSignedUrl(file.storagePath, SIGNED_URL_LIFETIME_SECONDS, {
        download: false,
      });
    const download = await this.storage.storage
      .from(this.bucket)
      .createSignedUrl(file.storagePath, SIGNED_URL_LIFETIME_SECONDS, {
        download: file.name,
      });
    if (result.error || !result.data?.signedUrl || download.error || !download.data?.signedUrl)
      throw new BadRequestException('Preview unavailable right now');
    return {
      url: result.data.signedUrl,
      downloadUrl: download.data.signedUrl,
      name: file.name,
      sizeBytes: file.sizeBytes.toString(),
      mimeType: file.mimeType,
      expiresInSeconds: SIGNED_URL_LIFETIME_SECONDS,
    };
  }
  async rename(userId: string, roomId: string, fileId: string, rawName: string) {
    const file = await this.owned(userId, roomId, fileId),
      name = this.validName(rawName);
    try {
      const updated = await this.prisma.file.update({
        where: { id: file.id },
        data: { name, normalizedName: this.normalize(name) },
        select: {
          id: true,
          dataRoomId: true,
          folderId: true,
          name: true,
          sizeBytes: true,
          mimeType: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return this.publicFile(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('A file with this name already exists here');
      throw error;
    }
  }
  async move(userId: string, roomId: string, fileId: string, folderId?: string) {
    const file = await this.owned(userId, roomId, fileId);
    await this.folder(userId, roomId, folderId);
    try {
      const updated = await this.prisma.file.update({
        where: { id: file.id },
        data: { folderId: folderId ?? null },
        select: {
          id: true,
          dataRoomId: true,
          folderId: true,
          name: true,
          sizeBytes: true,
          mimeType: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return this.publicFile(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('A file with this name already exists in the destination');
      throw error;
    }
  }
  async delete(userId: string, roomId: string, fileId: string) {
    const file = await this.owned(userId, roomId, fileId);
    const result = await this.storage.storage.from(this.bucket).remove([file.storagePath]);
    if (result.error)
      throw new BadRequestException(`Storage deletion failed: ${result.error.message}`);
    await this.prisma.file.delete({ where: { id: file.id } });
    return { deleted: true };
  }
}
