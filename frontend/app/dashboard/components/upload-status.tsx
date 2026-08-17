import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { UploadItem } from '../types';

export function UploadStatus({ uploads }: { uploads: UploadItem[] }) {
  if (!uploads.length) return null;
  return (
    <ul className="upload-status" aria-live="polite">
      {uploads.map((item) => (
        <li key={item.id}>
          <span style={{ fontWeight: 500 }}>{item.file.name}</span>
          <span>
            {item.status === 'queued' && (
              <span className="status-badge">Waiting…</span>
            )}
            {item.status === 'uploading' && (
              <span className="status-badge status-uploading">
                <Loader2 size={12} className="spin" /> Uploading…
              </span>
            )}
            {item.status === 'success' && (
              <span className="status-badge status-success">
                <CheckCircle2 size={12} /> Uploaded
              </span>
            )}
            {item.status === 'error' && (
              <span className="status-badge status-error">
                <AlertCircle size={12} /> {item.error || 'Failed'}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

