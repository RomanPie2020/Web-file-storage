import type { Folder, RoomFile } from '../types';

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

export function FileList({ folders, files, onOpen, onOpenFolder, onPreview }: Props) {
  return (
    <>
      <ul className="folder-list">
        {folders.map((folder) => (
          <li key={folder.id}>
            <button type="button" className="folder" onClick={() => onOpenFolder(folder)}>
              📁 <span>{folder.name}</span>
            </button>
            <span>
              <button type="button" onClick={() => onOpen('rename-folder', folder)}>
                Rename
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => onOpen('delete-folder', folder)}
              >
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
      <ul className="folder-list">
        {files.map((file) => (
          <li key={file.id}>
            <button type="button" className="file-name" onClick={() => onPreview(file)}>
              📄 {file.name}
            </button>
            <span>
              <button type="button" onClick={() => onOpen('rename-file', file)}>
                Rename
              </button>
              <button type="button" onClick={() => onOpen('move', file)}>
                Move
              </button>
              <button type="button" className="danger" onClick={() => onOpen('delete-file', file)}>
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
