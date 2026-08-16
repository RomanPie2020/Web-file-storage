'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase-browser';
import { DialogState, Folder, MutationVariables, Room, RoomFile } from './types';
import { executeMutation } from './mutations';
import { fetchAllFolders, fetchListing, fetchRoom } from './queries';
import { useFileUpload } from './hooks/use-file-upload';
import { Toast } from '../../components/ui/toast';
import { Breadcrumbs } from './components/breadcrumbs';
import { DashboardHeader } from './components/dashboard-header';
import { DashboardToolbar } from './components/dashboard-toolbar';
import { FileDialog } from './components/file-dialog';
import { FileList } from './components/file-list';
import { UploadStatus } from './components/upload-status';

const ROOT_DESTINATION = '__root__';

export default function DashboardPage() {
  const router = useRouter();
  const client = useQueryClient();
  const [room, setRoom] = useState<Room | null>(null);
  const [path, setPath] = useState<Folder[]>([]);
  const [toast, setToast] = useState('');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [value, setValue] = useState('');
  const parentId = path.at(-1)?.id;
  const roomQuery = useQuery({ queryKey: ['room'], queryFn: fetchRoom });
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
      await client.refetchQueries({ queryKey: ['listing'] });
      setDialog(null);
      setToast(
        variables.body && typeof variables.body === 'object' && 'folderId' in variables.body
          ? 'File moved successfully'
          : 'Changes saved',
      );
    },
    onError: (error) => setToast(error instanceof Error ? error.message : 'Something went wrong'),
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

  function openDialog(kind: DialogState['kind'], item?: Folder | RoomFile) {
    setDialog({ kind, item });
    setValue(
      kind === 'move' && item && 'folderId' in item ? (item.folderId ?? '') : (item?.name ?? ''),
    );
  }
  function submitDialog(event: React.FormEvent) {
    event.preventDefault();
    if (!room || !dialog) return;
    const item = dialog.item;
    const name = value.trim();
    if (dialog.kind === 'folder')
      mutation.mutate({
        url: `/data-rooms/${room.id}/folders`,
        method: 'POST',
        body: { name, parentId },
      });
    else if (dialog.kind === 'rename-folder')
      mutation.mutate({
        url: `/data-rooms/${room.id}/folders/${(item as Folder).id}`,
        method: 'PATCH',
        body: { name },
      });
    else if (dialog.kind === 'rename-file')
      mutation.mutate({
        url: `/data-rooms/${room.id}/files/${(item as RoomFile).id}`,
        method: 'PATCH',
        body: { name },
      });
    else if (dialog.kind === 'move') {
      setPath(
        value === ROOT_DESTINATION
          ? []
          : [...path, ...folders.filter((folder) => folder.id === value)],
      );
      mutation.mutate({
        url: `/data-rooms/${room.id}/files/${(item as RoomFile).id}`,
        method: 'PATCH',
        body: { folderId: value === ROOT_DESTINATION ? null : value },
      });
    } else
      mutation.mutate({
        url:
          dialog.kind === 'delete-folder'
            ? `/data-rooms/${room.id}/folders/${(item as Folder).id}`
            : `/data-rooms/${room.id}/files/${(item as RoomFile).id}`,
        method: 'DELETE',
      });
  }

  if (roomQuery.isLoading || !room)
    return (
      <main>
        <p>Loading your Data Room…</p>
      </main>
    );
  return (
    <main className="app-shell">
      <DashboardHeader
        roomName={room.name}
        onSignOut={() => {
          void supabase.auth.signOut();
          router.replace('/');
        }}
      />
      {toast && <Toast onClose={() => setToast('')}>{toast}</Toast>}
      <Breadcrumbs path={path} onNavigate={(index) => setPath(path.slice(0, index))} />
      <DashboardToolbar
        title={location.at(-1) === 'Root' ? 'Root folders' : location.at(-1)!}
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
        <p>Loading folders…</p>
      ) : folders.length === 0 && files.length === 0 ? (
        <p className="empty">This folder is empty. Create a folder to get started.</p>
      ) : (
        <FileList
          folders={folders}
          files={files}
          onOpen={openDialog}
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
    </main>
  );
}
