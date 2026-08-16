import { apiRequest } from '../../lib/api';
import type { Folder, Room, RoomFile } from './types';

export type Listing = { folders: Folder[]; files: RoomFile[] };

export const fetchRoom = () => apiRequest<Room>('/data-rooms/default');

export async function fetchListing(roomId: string, parentId?: string): Promise<Listing> {
  return {
    folders: await apiRequest<Folder[]>(
      `/data-rooms/${roomId}/folders${parentId ? `?parentId=${parentId}` : ''}`,
    ),
    files: await apiRequest<RoomFile[]>(
      `/data-rooms/${roomId}/files${parentId ? `?folderId=${parentId}` : ''}`,
    ),
  };
}

export async function fetchAllFolders(roomId: string): Promise<Folder[]> {
  const result: Folder[] = [];
  const load = async (parentId?: string): Promise<void> => {
    const children = await apiRequest<Folder[]>(
      `/data-rooms/${roomId}/folders${parentId ? `?parentId=${parentId}` : ''}`,
    );
    result.push(...children);
    await Promise.all(children.map((folder) => load(folder.id)));
  };
  await load();
  return result;
}
