export type Room = { id: string; name: string };

export type Folder = { id: string; name: string; parentId: string | null };

export type RoomFile = {
  id: string;
  name: string;
  sizeBytes: string | number;
  folderId: string | null;
};

export type UploadItem = {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'success' | 'error';
  error?: string;
};

export type DialogState = {
  kind: 'folder' | 'rename-folder' | 'rename-file' | 'delete-folder' | 'delete-file' | 'move';
  item?: Folder | RoomFile;
};

export type MutationVariables = {
  url: string;
  method: string;
  body?: unknown;
};
