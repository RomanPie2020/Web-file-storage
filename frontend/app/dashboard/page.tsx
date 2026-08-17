'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase-browser';
import { apiRequest, ApiError } from '../../lib/api';
import { DialogState, FilePreview, Folder, MutationVariables, Room, RoomFile } from './types';
import { executeMutation } from './mutations';
import { buildDialogMutation } from './dialog-actions';
import { fetchAllFolders, fetchListing, fetchRoom, fetchShared } from './queries';
import { useFileUpload } from './hooks/use-file-upload';
import { Toast } from '../../components/ui/toast';
import { Breadcrumbs } from './components/breadcrumbs';
import { DashboardHeader } from './components/dashboard-header';
import { DashboardToolbar } from './components/dashboard-toolbar';
import { FileDialog } from './components/file-dialog';
import { FileList } from './components/file-list';
import { UploadStatus } from './components/upload-status';
import { FilePreviewDialog } from './components/file-preview-dialog';
import { FolderOpen, Users } from 'lucide-react';

const ROOT_DESTINATION = '__root__';

export default function DashboardPage() {
  const router = useRouter();
  const client = useQueryClient();
  const [room, setRoom] = useState<Room | null>(null);
  const [path, setPath] = useState<Folder[]>([]);
  const [toast, setToast] = useState('');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [value, setValue] = useState('');
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [previewError, setPreviewError] = useState('');
  const parentId = path.at(-1)?.id;
  const roomQuery = useQuery({ queryKey: ['room'], queryFn: fetchRoom });
  const sharedQuery = useQuery({ queryKey: ['shared'], queryFn: fetchShared });
  const listing = useQuery({
    queryKey: ['listing', room?.id, parentId],
    enabled: !!room,
    queryFn: () => fetchListing(room!.id, parentId),
  });
  const allFoldersQuery = useQuery({
    queryKey: ['all-folders', room?.id],
    enabled: !!room && dialog?.kind === 'move',
    queryFn: () => fetchAllFolders(room!.id),
  });
  const mutation = useMutation({
    mutationFn: (variables: MutationVariables) => executeMutation(variables),
    onSuccess: async (_data, variables) => {
      setDialog(null);
      if (variables.method === 'DELETE' && variables.url.includes('/folders/')) {
        const deletedFolderId = variables.url.split('/').at(-1);
        setPath((current) =>
          current.at(-1)?.id === deletedFolderId ? current.slice(0, -1) : current,
        );
      }
      await client.invalidateQueries({ queryKey: ['listing'] });
      setToast(
        variables.body && typeof variables.body === 'object' && 'folderId' in variables.body
          ? 'File moved successfully'
          : 'Changes saved',
      );
    },
    onError: (error) => {
      if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
        setPath((current) => current.slice(0, -1));
        void client.invalidateQueries({ queryKey: ['listing'] });
        setToast(
          'That item is no longer available. You were returned to the nearest accessible folder.',
        );
        setDialog(null);
        return;
      }
      setToast(error instanceof Error ? error.message : 'Something went wrong');
    },
  });
  const folders = listing.data?.folders ?? [];
  const files = listing.data?.files ?? [];
  const location = useMemo(() => ['Root', ...path.map((folder) => folder.name)], [path]);
  const upload = useFileUpload(room?.id ?? '', parentId);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => (data.session ? void roomQuery.refetch() : router.replace('/')));
  }, [router, roomQuery]);
  useEffect(() => {
    if (roomQuery.data) setRoom(roomQuery.data);
  }, [roomQuery.data]);
  useEffect(() => {
    if (upload.uploads.some((item) => item.status === 'success'))
      void client.invalidateQueries({ queryKey: ['listing'] });
  }, [client, upload.uploads]);
  useEffect(() => {
    if (
      listing.error instanceof ApiError &&
      (listing.error.status === 404 || listing.error.status === 403)
    ) {
      setPath((current) => current.slice(0, -1));
      setToast(
        'This folder is no longer available. You were returned to the nearest accessible folder.',
      );
    }
  }, [listing.error]);

  function openDialog(kind: DialogState['kind'], item?: Folder | RoomFile) {
    setDialog({ kind, item });
    if (kind === 'move' && item && 'folderId' in item) {
      const file = item as RoomFile;
      const initialTarget = file.folderId
        ? ROOT_DESTINATION
        : (allFoldersQuery.data?.[0]?.id ?? ROOT_DESTINATION);
      setValue(initialTarget);
    } else {
      setValue(item?.name ?? '');
    }
  }
  function submitDialog(event: React.FormEvent) {
    event.preventDefault();
    if (!room || !dialog) return;
    const destination = value === ROOT_DESTINATION ? null : value;
    mutation.mutate(
      buildDialogMutation({
        roomId: room.id,
        dialog,
        name: value.trim(),
        parentId,
        destination,
      }),
    );
  }
  async function openPreview(file: RoomFile) {
    setPreviewError('');
    try {
      setPreview(await apiRequest<FilePreview>(`/data-rooms/${room!.id}/files/${file.id}/preview`));
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
        setPath((current) => current.slice(0, -1));
        setToast(
          'This file is no longer available. You were returned to the nearest accessible folder.',
        );
        return;
      }
      setPreviewError(error instanceof Error ? error.message : 'Preview unavailable');
    }
  }

  if (roomQuery.isLoading || !room)
    return (
      <main className="app-shell">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          Loading your Data Room…
        </div>
      </main>
    );

  return (
    <main className="app-shell">
      <DashboardHeader
        roomName={room.name}
        roomId={room.id}
        onSignOut={() => {
          void supabase.auth.signOut();
          router.replace('/');
        }}
      />
      {sharedQuery.data && sharedQuery.data.length > 0 && (
        <section className="shared-list">
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}
          >
            <Users size={16} color="var(--accent)" />
            <h2>Shared with me</h2>
          </div>
          <ul>
            {sharedQuery.data.map((share) => (
              <li key={share.id}>
                <button
                  type="button"
                  onClick={() => window.open(`/share/user/${share.id}`, '_self')}
                >
                  <span style={{ fontWeight: 500 }}>
                    {share.resourceType} · {share.room?.name ?? 'Shared resource'}
                  </span>
                  <small style={{ color: 'var(--muted)' }}>Shared by {share.sharedBy}</small>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {toast && <Toast onClose={() => setToast('')}>{toast}</Toast>}
      <Breadcrumbs path={path} onNavigate={(index) => setPath(path.slice(0, index))} />
      <DashboardToolbar
        title={location.at(-1) === 'Root' ? 'Root folder' : location.at(-1)!}
        dragging={upload.dragging}
        onNewFolder={() => openDialog('folder')}
        onDragEnter={(event) => {
          event.preventDefault();
          upload.setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          upload.setDragging(false);
        }}
        onDrop={upload.drop}
        onUpload={upload.uploadFiles}
      />
      <UploadStatus uploads={upload.uploads} />
      {listing.isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          Loading contents…
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div className="empty-state">
          <FolderOpen size={36} />
          <p>This folder is empty. Create a folder or upload a PDF to get started.</p>
        </div>
      ) : (
        <FileList
          folders={folders}
          files={files}
          onOpen={openDialog}
          onPreview={openPreview}
          onOpenFolder={(folder) => setPath([...path, folder])}
        />
      )}
      {dialog && (
        <FileDialog
          dialog={dialog}
          value={value}
          folders={allFoldersQuery.data ?? folders}
          onValueChange={setValue}
          onClose={() => setDialog(null)}
          onSubmit={submitDialog}
        />
      )}
      {preview && <FilePreviewDialog preview={preview} onClose={() => setPreview(null)} />}
      {previewError && <Toast onClose={() => setPreviewError('')}>{previewError}</Toast>}
    </main>
  );
}
