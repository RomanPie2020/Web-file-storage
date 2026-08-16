import type { Folder } from '../types';

type Props = { path: Folder[]; onNavigate: (index: number) => void };

export function Breadcrumbs({ path, onNavigate }: Props) {
  return (
    <nav aria-label="Breadcrumbs" className="breadcrumbs">
      {['Root', ...path.map((folder) => folder.name)].map((name, index) => (
        <button type="button" key={`${name}-${index}`} onClick={() => onNavigate(index)}>
          {name}
        </button>
      ))}
    </nav>
  );
}
