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
  const currentFolderId =
    dialog.kind === 'move' && dialog.item && 'folderId' in dialog.item
      ? (dialog.item as RoomFile).folderId
      : undefined;

  const availableFolders = folders.filter((folder) => folder.id !== currentFolderId);
  const noDestinations = dialog.kind === 'move' && !currentFolderId && availableFolders.length === 0;

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
            {dialog.kind === 'delete-folder'
              ? ' and all descendant folders and files (including their stored PDFs)'
              : ` (${formatSize((dialog.item as RoomFile).sizeBytes)})`}?
          </p>
        ) : dialog.kind === 'move' ? (
          noDestinations ? (
            <p>No destination folders available.</p>
          ) : (
            <select value={value} onChange={(event) => onValueChange(event.target.value)}>
              {currentFolderId && <option value={ROOT_DESTINATION}>Room root</option>}
              {availableFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          )
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
          <button
            className={dialog.kind.startsWith('delete') ? 'danger' : 'primary'}
            type="submit"
            disabled={noDestinations}
          >
            {dialog.kind.startsWith('delete') ? 'Delete' : 'Save'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function formatSize(value: string | number) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return 'size unavailable';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
