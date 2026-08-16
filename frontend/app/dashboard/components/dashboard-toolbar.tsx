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
      <button type="button" className="primary" onClick={onNewFolder}>
        New folder
      </button>
      <label
        className={`upload-dropzone${dragging ? ' is-dragging' : ''}`}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <span>Drop PDFs here or click to browse</span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          onChange={(event) => onUpload(event.target.files)}
        />
      </label>
    </section>
  );
}
