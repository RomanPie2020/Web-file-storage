'use client'
import { useEffect, useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase-browser'
import { apiRequest } from '../../lib/api'
import { Dialog } from '../../components/ui/dialog'
import { Toast } from '../../components/ui/toast'

type Room = { id: string; name: string }
type Folder = { id: string; name: string; parentId: string | null }
type RoomFile = {
	id: string
	name: string
	sizeBytes: string | number
	folderId: string | null
}
type UploadItem = {
	id: string
	file: File
	status: 'queued' | 'uploading' | 'success' | 'error'
	error?: string
}
type DialogState = {
	kind:
		| 'folder'
		| 'rename-folder'
		| 'rename-file'
		| 'delete-folder'
		| 'delete-file'
		| 'move'
	item?: Folder | RoomFile
}
const ROOT_DESTINATION = '__root__'

export default function DashboardPage() {
	const router = useRouter()
	const client = useQueryClient()
	const [room, setRoom] = useState<Room | null>(null)
	const [path, setPath] = useState<Folder[]>([])
	const [uploads, setUploads] = useState<UploadItem[]>([])
	const [dragging, setDragging] = useState(false)
	const [toast, setToast] = useState('')
	const [dialog, setDialog] = useState<DialogState | null>(null)
	const [value, setValue] = useState('')
	const parentId = path.at(-1)?.id
	const roomQuery = useQuery({
		queryKey: ['room'],
		queryFn: () => apiRequest<Room>('/data-rooms/default'),
	})
	useEffect(() => {
		supabase.auth.getSession().then(({ data }) => {
			if (!data.session) router.replace('/')
			else void roomQuery.refetch()
		})
	}, [router, roomQuery])
	useEffect(() => {
		if (roomQuery.data) setRoom(roomQuery.data)
	}, [roomQuery.data])
	const listing = useQuery({
		queryKey: ['listing', room?.id, parentId],
		enabled: !!room,
		queryFn: async () => ({
			folders: await apiRequest<Folder[]>(
				`/data-rooms/${room!.id}/folders${parentId ? `?parentId=${parentId}` : ''}`,
			),
			files: await apiRequest<RoomFile[]>(
				`/data-rooms/${room!.id}/files${parentId ? `?folderId=${parentId}` : ''}`,
			),
		}),
	})
	const allFoldersQuery = useQuery({
		queryKey: ['all-folders', room?.id],
		enabled: !!room && !!dialog && dialog.kind === 'move',
		queryFn: async () => {
			const result: Folder[] = []
			const load = async (parent?: string): Promise<void> => {
				const children = await apiRequest<Folder[]>(
					`/data-rooms/${room!.id}/folders${parent ? `?parentId=${parent}` : ''}`,
				)
				result.push(...children)
				await Promise.all(children.map(folder => load(folder.id)))
			}
			await load()
			return result
		},
	})
	const mutation = useMutation({
		mutationFn: ({
			url,
			method,
			body,
		}: {
			url: string
			method: string
			body?: unknown
		}) =>
			apiRequest(url, {
				method,
				body: body ? JSON.stringify(body) : undefined,
			}),
		onSuccess: async (_data, variables) => {
			await client.refetchQueries({ queryKey: ['listing'] })
			setDialog(null)
			setToast(
				variables.body &&
					typeof variables.body === 'object' &&
					'folderId' in variables.body
					? 'File moved successfully'
					: 'Changes saved',
			)
		},
		onError: error =>
			setToast(error instanceof Error ? error.message : 'Something went wrong'),
	})
	const folders = listing.data?.folders ?? []
	const files = listing.data?.files ?? []
	const location = useMemo(
		() => ['Root', ...path.map(folder => folder.name)],
		[path],
	)
	function openDialog(kind: DialogState['kind'], item?: Folder | RoomFile) {
		setDialog({ kind, item })
		setValue(
			kind === 'move' && item && 'folderId' in item
				? item.folderId ?? ''
				: item && 'name' in item
					? item.name
					: '',
		)
	}
	function submitDialog(event: React.FormEvent) {
		event.preventDefault()
		if (!room || !dialog) return
		const item = dialog.item
		const name = value.trim()
		if (dialog.kind === 'folder')
			mutation.mutate({
				url: `/data-rooms/${room.id}/folders`,
				method: 'POST',
				body: { name, parentId },
			})
		else if (dialog.kind === 'rename-folder')
			mutation.mutate({
				url: `/data-rooms/${room.id}/folders/${(item as Folder).id}`,
				method: 'PATCH',
				body: { name },
			})
		else if (dialog.kind === 'rename-file')
			mutation.mutate({
				url: `/data-rooms/${room.id}/files/${(item as RoomFile).id}`,
				method: 'PATCH',
				body: { name },
			})
		else if (dialog.kind === 'move')
		{
			setPath(
				value === ROOT_DESTINATION
					? []
					: [...path, ...folders.filter(folder => folder.id === value)],
			)
			mutation.mutate({
				url: `/data-rooms/${room.id}/files/${(item as RoomFile).id}`,
				method: 'PATCH',
				body: { folderId: value === ROOT_DESTINATION ? null : value },
			})
		}
		else
			mutation.mutate({
				url:
					dialog.kind === 'delete-folder'
						? `/data-rooms/${room.id}/folders/${(item as Folder).id}`
						: `/data-rooms/${room.id}/files/${(item as RoomFile).id}`,
				method: 'DELETE',
			})
	}
	async function uploadFiles(list: FileList | null) {
		if (!room || !list) return
		const queue = Array.from(list).map(file => ({
			id: crypto.randomUUID(),
			file,
			status: 'queued' as const,
		}))
		setUploads(current => [...current, ...queue])
		for (let i = 0; i < queue.length; i += 3)
			await Promise.all(
				queue.slice(i, i + 3).map(async item => {
					setUploads(current =>
						current.map(x =>
							x.id === item.id ? { ...x, status: 'uploading' } : x,
						),
					)
					try {
						const body = new FormData()
						body.append('file', item.file)
						await apiRequest(
							`/data-rooms/${room.id}/files${parentId ? `?folderId=${parentId}` : ''}`,
							{ method: 'POST', body },
						)
						setUploads(current =>
							current.map(x =>
								x.id === item.id ? { ...x, status: 'success' } : x,
							),
						)
					} catch (error) {
						setUploads(current =>
							current.map(x =>
								x.id === item.id
									? {
											...x,
											status: 'error',
											error:
												error instanceof Error
													? error.message
													: 'Upload failed',
										}
									: x,
							),
						)
					}
				}),
			)
		void client.invalidateQueries({ queryKey: ['listing'] })
	}
	function drop(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault()
		setDragging(false)
		void uploadFiles(event.dataTransfer.files)
	}
	if (roomQuery.isLoading || !room)
		return (
			<main>
				<p>Loading your Data Room…</p>
			</main>
		)
	return (
		<main className='app-shell'>
			<header>
				<div>
					<p className='eyebrow'>ACME DATA ROOM</p>
					<h1>{room.name}</h1>
				</div>
				<button type='button'
					onClick={() => {
						void supabase.auth.signOut()
						router.replace('/')
					}}
				>
					Sign out
				</button>
			</header>
			{toast && <Toast onClose={() => setToast('')}>{toast}</Toast>}
			<nav aria-label='Breadcrumbs' className='breadcrumbs'>
				{location.map((name, index) => (
					<button type='button'
						key={`${name}-${index}`}
						onClick={() => setPath(path.slice(0, index))}
					>
						{name}
					</button>
				))}
			</nav>
			<section className='toolbar'>
				<h2>{path.at(-1)?.name ?? 'Root folders'}</h2>
				<button type='button' className='primary' onClick={() => openDialog('folder')}>
					New folder
				</button>
				<label
					className={`upload-dropzone${dragging ? ' is-dragging' : ''}`}
					onDragEnter={e => {
						e.preventDefault()
						setDragging(true)
					}}
					onDragOver={e => e.preventDefault()}
					onDragLeave={e => {
						e.preventDefault()
						setDragging(false)
					}}
					onDrop={drop}
				>
					<span>Drop PDFs here or click to browse</span>
					<input
						type='file'
						accept='application/pdf,.pdf'
						multiple
						hidden
						onChange={e => void uploadFiles(e.target.files)}
					/>
				</label>
			</section>
			{uploads.length > 0 && (
				<ul className='upload-status' aria-live='polite'>
					{uploads.map(item => (
						<li key={item.id}>
							<span>{item.file.name}</span>
							<span>
								{item.status === 'queued'
									? 'Waiting…'
									: item.status === 'uploading'
										? 'Uploading…'
										: item.status === 'success'
											? 'Uploaded'
											: item.error}
							</span>
						</li>
					))}
				</ul>
			)}
			{listing.isLoading ? (
				<p>Loading folders…</p>
			) : folders.length === 0 && files.length === 0 ? (
				<p className='empty'>
					This folder is empty. Create a folder to get started.
				</p>
			) : (
				<>
					<ul className='folder-list'>
						{folders.map(folder => (
							<li key={folder.id}>
								<button type='button'
									className='folder'
									onClick={() => setPath([...path, folder])}
								>
									📁 <span>{folder.name}</span>
								</button>
								<span>
									<button type='button' onClick={() => openDialog('rename-folder', folder)}>
										Rename
									</button>
									<button type='button'
										className='danger'
										onClick={() => openDialog('delete-folder', folder)}
									>
										Delete
									</button>
								</span>
							</li>
						))}
					</ul>
					<ul className='folder-list'>
						{files.map(file => (
							<li key={file.id}>
								<span>📄 {file.name}</span>
								<span>
								<button type='button' onClick={() => openDialog('rename-file', file)}>
										Rename
									</button>
								<button type='button' onClick={() => openDialog('move', file)}>Move</button>
								<button type='button'
										className='danger'
										onClick={() => openDialog('delete-file', file)}
									>
										Delete
									</button>
								</span>
							</li>
						))}
					</ul>
				</>
			)}
			{dialog && (
				<Dialog
					open
					onOpenChange={open => !open && setDialog(null)}
					title={
						dialog.kind.startsWith('delete')
							? 'Confirm deletion'
							: dialog.kind === 'move'
								? 'Move file'
								: dialog.kind === 'folder'
									? 'Create folder'
									: 'Rename'
					}
				>
					<form onSubmit={submitDialog}>
						{dialog.kind.startsWith('delete') ? (
							<p>
								Delete “{(dialog.item as Folder | RoomFile).name}”
								{dialog.kind === 'delete-folder' ? ' and its contents' : ''}?
							</p>
						) : dialog.kind === 'move' ? (
							<select value={value} onChange={e => setValue(e.target.value)}>
								<option value={ROOT_DESTINATION}>Room root</option>
								{(allFoldersQuery.data ?? folders)
									.filter(
										folder => folder.id !== (dialog.item as RoomFile).folderId,
									)
									.map(folder => (
										<option key={folder.id} value={folder.id}>
											{folder.name}
										</option>
									))}
							</select>
						) : (
							<input
								autoFocus
								value={value}
								onChange={e => setValue(e.target.value)}
								placeholder='Name'
							/>
						)}
						<div className='dialog-actions'>
							<button type='button' onClick={() => setDialog(null)}>
								Cancel
							</button>
							<button
								className={
									dialog.kind.startsWith('delete') ? 'danger' : 'primary'
								}
								type='submit'
							>
								{dialog.kind.startsWith('delete') ? 'Delete' : 'Save'}
							</button>
						</div>
					</form>
				</Dialog>
			)}
		</main>
	)
}
