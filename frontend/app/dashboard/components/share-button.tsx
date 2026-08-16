'use client';
import { useState } from 'react';
import { apiRequest } from '../../../lib/api';

export function ShareButton({ resourceType, resourceId }: { resourceType: 'DATA_ROOM' | 'FOLDER' | 'FILE'; resourceId: string }) {
  const [busy, setBusy] = useState(false);
  async function share() {
    const recipient = window.prompt('Recipient email (leave blank for a public link):')?.trim();
    if (recipient === undefined) return;
    setBusy(true);
    try {
      const result = await apiRequest<{ publicToken?: string }>('/shares', { method: 'POST', body: JSON.stringify({ resourceType, resourceId, shareType: recipient ? 'USER' : 'PUBLIC', recipientEmail: recipient || undefined }) });
      if (result.publicToken) await navigator.clipboard.writeText(`${window.location.origin}/share/${result.publicToken}`);
      window.alert(result.publicToken ? 'Public link copied.' : 'Permissioned share created.');
    } catch (error) { window.alert(error instanceof Error ? error.message : 'Unable to create share'); }
    finally { setBusy(false); }
  }
  return <button type="button" onClick={() => void share()} disabled={busy}>{busy ? 'Sharing…' : 'Share'}</button>;
}
