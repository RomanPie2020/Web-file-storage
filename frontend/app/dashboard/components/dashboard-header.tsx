import { LogOut, FolderLock } from 'lucide-react';
import { ShareButton } from './share-button';

type Props = { roomName: string; roomId: string; onSignOut: () => void };

export function DashboardHeader({ roomName, roomId, onSignOut }: Props) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header-title">
        <p className="eyebrow">Data Room</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FolderLock size={22} color="var(--accent)" />
          <h1>{roomName}</h1>
        </div>
      </div>
      <div className="dashboard-header-actions">
        <ShareButton resourceType="DATA_ROOM" resourceId={roomId} />
        <button type="button" onClick={onSignOut} title="Sign out">
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}

