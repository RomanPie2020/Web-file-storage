import { Folder as FolderIcon, FileText, Edit2, Move, Trash2 } from 'lucide-react';
import type { Folder, RoomFile } from '../types';
import { ShareButton } from './share-button';

type Props = {
  folders: Folder[];
  files: RoomFile[];
  onOpen: (
    kind: 'rename-folder' | 'delete-folder' | 'rename-file' | 'move' | 'delete-file',
    item: Folder | RoomFile,
  ) => void;
  onOpenFolder: (folder: Folder) => void;
  onPreview: (file: RoomFile) => void;
};

function formatSize(value: string | number) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileList({ folders, files, onOpen, onOpenFolder, onPreview }: Props) {
  return (
    <>
      {folders.length > 0 && (
        <ul className="folder-list">
          {folders.map((folder) => (
            <li key={folder.id}>
              <button
                type="button"
                className="item-main"
                onClick={() => onOpenFolder(folder)}
                title={`Open ${folder.name}`}
              >
                <FolderIcon size={18} color="#2563eb" />
                <span className="item-name">{folder.name}</span>
              </button>
              <div className="item-actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => onOpen('rename-folder', folder)}
                  title="Rename folder"
                >
                  <Edit2 size={15} />
                </button>
                <ShareButton resourceType="FOLDER" resourceId={folder.id} />
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => onOpen('delete-folder', folder)}
                  title="Delete folder"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="folder-list">
          {files.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                className="item-main"
                onClick={() => onPreview(file)}
                title={`Preview ${file.name}`}
              >
                <FileText size={18} color="#dc2626" />
                <span className="item-name">{file.name}</span>
                <span className="item-badge">{formatSize(file.sizeBytes)}</span>
              </button>
              <div className="item-actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => onOpen('rename-file', file)}
                  title="Rename file"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => onOpen('move', file)}
                  title="Move file"
                >
                  <Move size={15} />
                </button>
                <ShareButton resourceType="FILE" resourceId={file.id} />
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => onOpen('delete-file', file)}
                  title="Delete file"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

