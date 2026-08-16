type Props = { roomName: string; onSignOut: () => void };

export function DashboardHeader({ roomName, onSignOut }: Props) {
  return (
    <header>
      <div>
        <p className="eyebrow">ACME DATA ROOM</p>
        <h1>{roomName}</h1>
      </div>
      <button type="button" onClick={onSignOut}>
        Sign out
      </button>
    </header>
  );
}
