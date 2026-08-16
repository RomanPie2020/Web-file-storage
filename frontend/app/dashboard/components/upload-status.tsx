import type { UploadItem } from '../types';

export function UploadStatus({ uploads }: { uploads: UploadItem[] }) {
  if (!uploads.length) return null;
  return (
    <ul className="upload-status" aria-live="polite">
      {uploads.map((item) => (
        <li key={item.id}>
          <span>{item.file.name}</span>
          <span>
            {item.status === 'queued'
              ? 'Waiting…'
              : item.status === 'uploading'
                ? 'Uploading…'
                : item.status === 'success'
                  ? 'Uploaded'
                  : item.error}
          </span>
        </li>
      ))}
    </ul>
  );
}
