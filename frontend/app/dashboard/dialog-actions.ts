import type { DialogState, Folder, MutationVariables, RoomFile } from './types';

type DialogActionInput = {
  roomId: string;
  dialog: DialogState;
  name: string;
  parentId?: string;
  destination: string | null;
};

export function buildDialogMutation({
  roomId,
  dialog,
  name,
  parentId,
  destination,
}: DialogActionInput): MutationVariables {
  const item = dialog.item;

  if (dialog.kind === 'folder')
    return {
      url: `/data-rooms/${roomId}/folders`,
      method: 'POST',
      body: { name, parentId },
    };

  if (dialog.kind === 'rename-folder')
    return {
      url: `/data-rooms/${roomId}/folders/${(item as Folder).id}`,
      method: 'PATCH',
      body: { name },
    };

  if (dialog.kind === 'rename-file')
    return {
      url: `/data-rooms/${roomId}/files/${(item as RoomFile).id}`,
      method: 'PATCH',
      body: { name },
    };

  if (dialog.kind === 'move')
    return {
      url: `/data-rooms/${roomId}/files/${(item as RoomFile).id}`,
      method: 'PATCH',
      body: { folderId: destination },
    };

  return {
    url:
      dialog.kind === 'delete-folder'
        ? `/data-rooms/${roomId}/folders/${(item as Folder).id}`
        : `/data-rooms/${roomId}/files/${(item as RoomFile).id}`,
    method: 'DELETE',
  };
}
