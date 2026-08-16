import { Dialog } from '../../../components/ui/dialog';
import type { DialogState, Folder, RoomFile } from '../types';

const ROOT_DESTINATION = '__root__';
type Props = {
  dialog: DialogState;
  value: string;
  folders: Folder[];
  onValueChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
};

export function FileDialog({ dialog, value, folders, onValueChange, onClose, onSubmit }: Props) {
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={
        dialog.kind.startsWith('delete')
          ? 'Confirm deletion'
          : dialog.kind === 'move'
            ? 'Move file'
            : dialog.kind === 'folder'
              ? 'Create folder'
              : 'Rename'
      }
    >
      <form onSubmit={onSubmit}>
        {dialog.kind.startsWith('delete') ? (
          <p>
            Delete “{(dialog.item as Folder | RoomFile).name}”
            {dialog.kind === 'delete-folder' ? ' and its contents' : ''}?
          </p>
        ) : dialog.kind === 'move' ? (
          <select value={value} onChange={(event) => onValueChange(event.target.value)}>
            <option value={ROOT_DESTINATION}>Room root</option>
            {folders
              .filter((folder) => folder.id !== (dialog.item as RoomFile).folderId)
              .map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
          </select>
        ) : (
          <input
            autoFocus
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder="Name"
          />
        )}
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className={dialog.kind.startsWith('delete') ? 'danger' : 'primary'} type="submit">
            {dialog.kind.startsWith('delete') ? 'Delete' : 'Save'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
