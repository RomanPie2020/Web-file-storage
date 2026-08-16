type Props = { roomName: string; roomId: string; onSignOut: () => void };
import { ShareButton } from './share-button';

export function DashboardHeader({ roomName, roomId, onSignOut }: Props) {
  return (
    <header>
      <div>
        <p className="eyebrow">ACME DATA ROOM</p>
        <h1>{roomName}</h1>
      </div>
      <ShareButton resourceType="DATA_ROOM" resourceId={roomId} />
      <button type="button" onClick={onSignOut}>
        Sign out
      </button>
    </header>
  );
}
