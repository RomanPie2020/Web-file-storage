import { ChevronRight, Home, Folder as FolderIcon } from 'lucide-react';
import type { Folder } from '../types';

type Props = { path: Folder[]; onNavigate: (index: number) => void };

export function Breadcrumbs({ path, onNavigate }: Props) {
  const items = ['Root', ...path.map((folder) => folder.name)];

  return (
    <nav aria-label="Breadcrumbs" className="breadcrumbs">
      {items.map((name, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${name}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              type="button"
              className={`breadcrumb-item${isLast ? ' is-current' : ''}`}
              onClick={() => onNavigate(index)}
              disabled={isLast}
            >
              {index === 0 ? <Home size={14} /> : <FolderIcon size={14} />}
              <span>{name}</span>
            </button>
            {!isLast && <ChevronRight size={14} className="breadcrumb-separator" />}
          </span>
        );
      })}
    </nav>
  );
}

