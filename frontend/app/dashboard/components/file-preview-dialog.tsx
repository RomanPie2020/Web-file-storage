import type { FilePreview } from '../types';

type Props = { preview: FilePreview; onClose: () => void };

export function FilePreviewDialog({ preview, onClose }: Props) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="dialog preview-dialog" role="dialog" aria-modal="true" aria-label={`Preview ${preview.name}`} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>{preview.name}</h2>
          <button type="button" onClick={onClose} aria-label="Close preview">Close</button>
        </header>
        <p>{preview.mimeType} · {Number(preview.sizeBytes).toLocaleString()} bytes</p>
        <iframe title={`PDF preview of ${preview.name}`} src={preview.url} className="pdf-preview" />
        <a href={preview.downloadUrl} download={preview.name}>Download PDF</a>
      </section>
    </div>
  );
}
