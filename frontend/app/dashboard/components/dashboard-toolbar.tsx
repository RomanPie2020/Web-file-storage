import { FolderPlus, UploadCloud } from 'lucide-react';
import type { DragEvent } from 'react';

type Props = {
  title: string;
  dragging: boolean;
  onNewFolder: () => void;
  onDragEnter: (event: DragEvent<HTMLLabelElement>) => void;
  onDragOver: (event: DragEvent<HTMLLabelElement>) => void;
  onDragLeave: (event: DragEvent<HTMLLabelElement>) => void;
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;
  onUpload: (files: FileList | null) => void;
};

export function DashboardToolbar({
  title,
  dragging,
  onNewFolder,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onUpload,
}: Props) {
  return (
    <section className="toolbar">
      <h2>{title}</h2>
      <div className="toolbar-actions">
        <button type="button" className="primary" onClick={onNewFolder}>
          <FolderPlus size={16} />
          <span>New folder</span>
        </button>
        <label
          className={`upload-dropzone${dragging ? ' is-dragging' : ''}`}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <UploadCloud size={16} />
          <span>{dragging ? 'Drop PDF files here' : 'Upload PDF'}</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            multiple
            hidden
            onChange={(event) => onUpload(event.target.files)}
          />
        </label>
      </div>
    </section>
  );
}

