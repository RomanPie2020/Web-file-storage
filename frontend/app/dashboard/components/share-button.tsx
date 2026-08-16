'use client';
import { useState } from 'react';
import { apiRequest } from '../../../lib/api';

export function ShareButton({
  resourceType,
  resourceId,
}: {
  resourceType: 'DATA_ROOM' | 'FOLDER' | 'FILE';
  resourceId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [shares, setShares] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  async function refresh() {
    const result = await apiRequest<any[]>(
      `/shares?resourceType=${resourceType}&resourceId=${resourceId}`,
    );
    setShares(result);
  }
  async function share() {
    const recipient = window.prompt('Recipient email (leave blank for a public link):')?.trim();
    if (recipient === undefined) return;
    setBusy(true);
    try {
      const result = await apiRequest<{ publicToken?: string }>('/shares', {
        method: 'POST',
        body: JSON.stringify({
          resourceType,
          resourceId,
          shareType: recipient ? 'USER' : 'PUBLIC',
          recipientEmail: recipient || undefined,
        }),
      });
      if (result.publicToken)
        await navigator.clipboard.writeText(
          `${window.location.origin}/share/${result.publicToken}`,
        );
      window.alert(result.publicToken ? 'Public link copied.' : 'Permissioned share created.');
      await refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to create share');
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="share-controls">
      <button type="button" onClick={() => void share()} disabled={busy}>
        {busy ? 'Sharing…' : 'Share'}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) void refresh();
        }}
      >
        Manage
      </button>
      {open && (
        <span>
          {shares
            .filter((item) => !item.revokedAt)
            .map((item) => (
              <span key={item.id}>
                <small>{item.shareType === 'PUBLIC' ? 'Public link' : item.sharedWithUserId}</small>
                <button
                  type="button"
                  onClick={async () => {
                    await apiRequest(`/shares/${item.id}`, { method: 'DELETE' });
                    await refresh();
                  }}
                >
                  Revoke
                </button>
              </span>
            ))}
        </span>
      )}
    </span>
  );
}
