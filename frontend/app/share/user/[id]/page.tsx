'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, FileText, Folder as FolderIcon, Home, ChevronRight, FolderOpen, UserCheck } from 'lucide-react';
import { apiRequest } from '../../../../lib/api';

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

export default function UserSharePage() {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState<Content>();
  const [path, setPath] = useState<Item[]>([]);
  const [error, setError] = useState('Loading shared resource…');

  const load = async (type: string, resourceId?: string) => {
    try {
      setError('');
      const query = resourceId ? '?resourceType=' + type + '&resourceId=' + resourceId : '';
      setContent(await apiRequest<Content>('/shares/' + id + '/content' + query));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Share unavailable');
    }
  };

  useEffect(() => {
    void load('');
  }, [id]);

  return (
    <main className="app-shell">
      <header className="dashboard-header">
        <div className="dashboard-header-title">
          <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <UserCheck size={13} /> Shared With Me
          </p>
          <h1>{content?.roomName ?? 'Shared resource'}</h1>
        </div>
      </header>

      {error && !content ? (
        <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
          {error}
        </div>
      ) : content?.file ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn"
              onClick={() => void load('FOLDER', path.at(-1)?.id)}
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
                setPath([]);
                void load('');
              }}
              disabled={path.length === 0}
            >
              <Home size={14} />
              <span>Root</span>
            </button>
            {path.map((folder, index) => {
              const isLast = index === path.length - 1;
              return (
                <span key={folder.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <ChevronRight size={14} className="breadcrumb-separator" />
                  <button
                    type="button"
                    className={`breadcrumb-item${isLast ? ' is-current' : ''}`}
                    onClick={() => {
                      setPath(path.slice(0, index + 1));
                      void load('FOLDER', folder.id);
                    }}
                    disabled={isLast}
                  >
                    <FolderIcon size={14} />
                    <span>{folder.name}</span>
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
                    onClick={() => void load('FILE', f.id)}
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

