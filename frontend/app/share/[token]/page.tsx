'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, FileText, Folder as FolderIcon, Home, ChevronRight, FolderOpen, Globe } from 'lucide-react';
import { apiRequest } from '../../../lib/api';

type Item = { id: string; name: string; sizeBytes?: string; mimeType?: string };
type Content = {
  roomName: string;
  folders?: Item[];
  files?: Item[];
  file?: Item & { url: string; downloadUrl: string };
};

function formatSize(value?: string | number) {
  if (!value) return '';
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PublicSharePage() {
  const { token } = useParams<{ token: string }>();
  const [root, setRoot] = useState<{ resourceType: 'DATA_ROOM' | 'FOLDER'; resourceId: string }>();
  const [path, setPath] = useState<Item[]>([]);
  const [content, setContent] = useState<Content>();
  const [error, setError] = useState('Loading shared resource…');

  async function load(type: 'DATA_ROOM' | 'FOLDER', id: string) {
    try {
      setError('');
      setContent(
        await apiRequest<Content>(
          `/shares/public/${token}/content?resourceType=${type}&resourceId=${id}`,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Share unavailable');
    }
  }

  useEffect(() => {
    apiRequest<{ resourceType: 'DATA_ROOM' | 'FOLDER'; resourceId: string }>(
      `/shares/public/${token}`,
    )
      .then((r) => {
        setRoot(r);
        void load(r.resourceType, r.resourceId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Share unavailable'));
  }, [token]);

  const openFile = async (id: string) => {
    const result = await apiRequest<Content>(
      `/shares/public/${token}/content?resourceType=FILE&resourceId=${id}`,
    );
    setContent(result);
  };

  return (
    <main className="app-shell">
      <header className="dashboard-header">
        <div className="dashboard-header-title">
          <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Globe size={13} /> Public Data Room
          </p>
          <h1>{content?.roomName ?? 'Shared Data Room'}</h1>
        </div>
      </header>

      {error ? (
        <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
          {error}
        </div>
      ) : content?.file ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const parent = path.at(-1);
                if (parent) void load('FOLDER', parent.id);
                else if (root) void load(root.resourceType, root.resourceId);
              }}
            >
              <ArrowLeft size={15} />
              <span>Back to folder</span>
            </button>
            <a
              href={content.file.downloadUrl}
              download={content.file.name}
              className="btn primary"
              style={{ textDecoration: 'none' }}
            >
              <Download size={15} />
              <span>Download PDF</span>
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <FileText size={22} color="#dc2626" />
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{content.file.name}</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                {formatSize(content.file.sizeBytes)}
              </span>
            </div>
          </div>

          {content.file.mimeType === 'application/pdf' && (
            <iframe
              title={content.file.name}
              src={content.file.url}
              style={{
                width: '100%',
                height: '70vh',
                border: '1px solid var(--line)',
                borderRadius: '8px',
                background: '#f8fafc',
              }}
            />
          )}
        </section>
      ) : (
        <>
          <nav aria-label="Breadcrumbs" className="breadcrumbs">
            <button
              type="button"
              className={`breadcrumb-item${path.length === 0 ? ' is-current' : ''}`}
              onClick={() => {
                if (root) {
                  setPath([]);
                  void load(root.resourceType, root.resourceId);
                }
              }}
              disabled={path.length === 0}
            >
              <Home size={14} />
              <span>Root</span>
            </button>
            {path.map((p, i) => {
              const isLast = i === path.length - 1;
              return (
                <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <ChevronRight size={14} className="breadcrumb-separator" />
                  <button
                    type="button"
                    className={`breadcrumb-item${isLast ? ' is-current' : ''}`}
                    onClick={() => {
                      setPath(path.slice(0, i + 1));
                      void load('FOLDER', p.id);
                    }}
                    disabled={isLast}
                  >
                    <FolderIcon size={14} />
                    <span>{p.name}</span>
                  </button>
                </span>
              );
            })}
          </nav>

          {content?.folders && content.folders.length > 0 && (
            <ul className="folder-list">
              {content.folders.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className="item-main"
                    onClick={() => {
                      setPath([...path, f]);
                      void load('FOLDER', f.id);
                    }}
                  >
                    <FolderIcon size={18} color="#2563eb" />
                    <span className="item-name">{f.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {content?.files && content.files.length > 0 && (
            <ul className="folder-list">
              {content.files.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className="item-main"
                    onClick={() => void openFile(f.id)}
                  >
                    <FileText size={18} color="#dc2626" />
                    <span className="item-name">{f.name}</span>
                    {f.sizeBytes && <span className="item-badge">{formatSize(f.sizeBytes)}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!content?.folders?.length && !content?.files?.length && (
            <div className="empty-state">
              <FolderOpen size={36} />
              <p>This folder is empty.</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}

