'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '../../../../lib/api';
type Item = { id: string; name: string; sizeBytes?: string; mimeType?: string };
type Content = {
  roomName: string;
  folders?: Item[];
  files?: Item[];
  file?: Item & { url: string; downloadUrl: string };
};
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
      <header>
        <div>
          <p className="eyebrow">SHARED WITH ME</p>
          <h1>{content?.roomName ?? 'Shared resource'}</h1>
        </div>
      </header>
      {error && !content ? (
        <p>{error}</p>
      ) : content?.file ? (
        <section>
          <button type="button" onClick={() => void load('FOLDER', path.at(-1)?.id)}>
            ← Back to folder
          </button>
          <h2>{content.file.name}</h2>
          {content.file.mimeType === 'application/pdf' && (
            <iframe
              title={content.file.name}
              src={content.file.url}
              style={{ width: '100%', minHeight: 650 }}
            />
          )}
          <p>
            <a href={content.file.downloadUrl}>Download</a>
          </p>
        </section>
      ) : (
        <>
          <nav aria-label="Breadcrumbs">
            <button
              type="button"
              onClick={() => {
                setPath([]);
                void load('');
              }}
            >
              Root
            </button>
            {path.map((folder, index) => (
              <span key={folder.id}>
                {' '}
                /{' '}
                <button
                  type="button"
                  onClick={() => {
                    setPath(path.slice(0, index + 1));
                    void load('FOLDER', folder.id);
                  }}
                >
                  {folder.name}
                </button>
              </span>
            ))}
          </nav>
          <ul className="folder-list">
            {content?.folders?.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPath([...path, f]);
                    void load('FOLDER', f.id);
                  }}
                >
                  📁 {f.name}
                </button>
              </li>
            ))}
            {content?.files?.map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => void load('FILE', f.id)}>
                  📄 {f.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
