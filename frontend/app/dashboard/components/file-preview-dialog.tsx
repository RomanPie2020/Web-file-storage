import { Download, X, FileText } from 'lucide-react';
import type { FilePreview } from '../types';
import styles from './file-preview-dialog.module.css';

type Props = { preview: FilePreview; onClose: () => void };

export function FilePreviewDialog({ preview, onClose }: Props) {
  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${preview.name}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.previewHeader}>
          <div className={styles.previewTitle}>
            <FileText size={20} color="#dc2626" />
            <div>
              <h2>{preview.name}</h2>
              <p className={styles.meta}>
                {preview.mimeType} · {Number(preview.sizeBytes).toLocaleString()} bytes
              </p>
            </div>
          </div>
          <div className={styles.previewActions}>
            <a
              href={preview.downloadUrl}
              download={preview.name}
              className="btn primary"
              style={{ textDecoration: 'none' }}
            >
              <Download size={15} />
              <span>Download PDF</span>
            </a>
            <button
              type="button"
              className="icon-btn"
              onClick={onClose}
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <iframe
          title={`PDF preview of ${preview.name}`}
          src={preview.url}
          className={styles.pdf}
        />
      </section>
    </div>
  );
}

