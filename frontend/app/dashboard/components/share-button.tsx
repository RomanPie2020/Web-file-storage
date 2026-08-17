'use client';
import { useState } from 'react';
import { Share2, Link, UserPlus, Trash2, Check, Copy, Shield } from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { Dialog } from '../../../components/ui/dialog';

export function ShareButton({
  resourceType,
  resourceId,
}: {
  resourceType: 'DATA_ROOM' | 'FOLDER' | 'FILE';
  resourceId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [shares, setShares] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function refresh() {
    try {
      const result = await apiRequest<any[]>(
        `/shares?resourceType=${resourceType}&resourceId=${resourceId}`,
      );
      setShares(result);
    } catch {
      // Ignored
    }
  }

  async function openShareModal() {
    setStatusMsg(null);
    setEmailInput('');
    setDialogOpen(true);
    await refresh();
  }

  async function handleCreatePublicShare() {
    setBusy(true);
    setStatusMsg(null);
    try {
      const result = await apiRequest<{ publicToken?: string }>('/shares', {
        method: 'POST',
        body: JSON.stringify({
          resourceType,
          resourceId,
          shareType: 'PUBLIC',
        }),
      });

      if (result.publicToken) {
        const link = `${window.location.origin}/share/${result.publicToken}`;
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        setStatusMsg({ type: 'success', text: 'Public link created and copied to clipboard!' });
      }
      await refresh();
    } catch (error) {
      setStatusMsg({ type: 'error', text: error instanceof Error ? error.message : 'Failed to create share link' });
    } finally {
      setBusy(false);
    }
  }

  async function handleShareWithUser(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setBusy(true);
    setStatusMsg(null);
    try {
      await apiRequest('/shares', {
        method: 'POST',
        body: JSON.stringify({
          resourceType,
          resourceId,
          shareType: 'USER',
          recipientEmail: emailInput.trim(),
        }),
      });
      setEmailInput('');
      setStatusMsg({ type: 'success', text: 'Shared successfully with user.' });
      await refresh();
    } catch (error) {
      setStatusMsg({ type: 'error', text: error instanceof Error ? error.message : 'Unable to share' });
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(shareId: string) {
    try {
      await apiRequest(`/shares/${shareId}`, { method: 'DELETE' });
      await refresh();
      setStatusMsg({ type: 'success', text: 'Share access revoked.' });
    } catch (error) {
      setStatusMsg({ type: 'error', text: error instanceof Error ? error.message : 'Failed to revoke' });
    }
  }

  const activeShares = shares.filter((item) => !item.revokedAt);

  return (
    <>
      <button
        type="button"
        className="icon-btn"
        onClick={() => void openShareModal()}
        title="Share"
      >
        <Share2 size={15} />
      </button>

      {dialogOpen && (
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={`Share ${resourceType === 'DATA_ROOM' ? 'Data Room' : resourceType.toLowerCase()}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Status message */}
            {statusMsg && (
              <div
                style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  backgroundColor: statusMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                  color: statusMsg.type === 'success' ? '#15803d' : '#b91c1c',
                  border: `1px solid ${statusMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                }}
              >
                {statusMsg.text}
              </div>
            )}

            {/* Public Link Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>
                Public Link
              </span>
              <button
                type="button"
                className="btn"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => void handleCreatePublicShare()}
                disabled={busy}
              >
                {copied ? <Check size={16} color="#16a34a" /> : <Link size={16} />}
                <span>{copied ? 'Link Copied to Clipboard!' : 'Create & Copy Public Link'}</span>
              </button>
            </div>

            {/* Direct User Share Form */}
            <form onSubmit={(e) => void handleShareWithUser(e)} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>
                Share with Registered User
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                  }}
                />
                <button
                  type="submit"
                  className="primary"
                  disabled={busy || !emailInput.trim()}
                >
                  <UserPlus size={15} />
                  <span>Share</span>
                </button>
              </div>
            </form>

            {/* Active Shares List */}
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>
                Active Access ({activeShares.length})
              </span>
              {activeShares.length === 0 ? (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  No active shares for this item.
                </p>
              ) : (
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0.5rem 0 0',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                  }}
                >
                  {activeShares.map((item) => (
                    <li
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.75rem',
                        borderBottom: '1px solid var(--line-subtle)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        {item.shareType === 'PUBLIC' ? (
                          <Link size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
                        ) : (
                          <Shield size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                        )}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.shareType === 'PUBLIC' ? (
                            <span>
                              Public Link{' '}
                              <code style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'var(--line-subtle)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                                #{item.publicToken ? item.publicToken.slice(0, 10) + '…' : item.id.slice(0, 8)}
                              </code>
                            </span>
                          ) : (
                            <span style={{ fontWeight: 500 }}>
                              {item.recipientEmail || item.sharedWithUserId}
                            </span>
                          )}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => void handleRevoke(item.id)}
                        title="Revoke access"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>

                  ))}
                </ul>
              )}
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}

