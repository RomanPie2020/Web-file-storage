'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase-browser'
import { apiRequest } from '../../lib/api'
type Room = { id: string; name: string }
type Folder = { id: string; name: string; parentId: string | null }
type RoomFile = {
	id: string
	name: string
	sizeBytes: string | number
	folderId: string | null
}
export default function DashboardPage() {
	const router = useRouter()
	const [room, setRoom] = useState<Room | null>(null)
	const [folders, setFolders] = useState<Folder[]>([])
	const [files, setFiles] = useState<RoomFile[]>([])
	const [uploading, setUploading] = useState<string[]>([])
	const [path, setPath] = useState<Folder[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const parentId = path.at(-1)?.id
	async function loadFolders(roomId: string, parent?: string) {
		setLoading(true)
		setError('')
		try {
			setFolders(
				await apiRequest<Folder[]>(
					`/data-rooms/${roomId}/folders${parent ? `?parentId=${parent}` : ''}`,
				),
			)
			setFiles(
				await apiRequest<RoomFile[]>(
					`/data-rooms/${roomId}/files${parent ? `?folderId=${parent}` : ''}`,
				),
			)
		} catch {
			setError('Unable to load folders.')
		} finally {
			setLoading(false)
		}
	}
	async function uploadFiles(list: FileList | null) {
		if (!room || !list) return
		const queue = Array.from(list).filter(
			file => !uploading.includes(file.name),
		)
		setUploading(queue.map(file => file.name))
		for (let index = 0; index < queue.length; index += 3) {
			await Promise.all(
				queue.slice(index, index + 3).map(async file => {
					try {
						const body = new FormData()
						body.append('file', file)
						await apiRequest(
							`/data-rooms/${room.id}/files${parentId ? `?folderId=${parentId}` : ''}`,
							{ method: 'POST', body },
						)
					} catch (error) {
						setError(
							`${file.name}: ${error instanceof Error ? error.message : 'Upload failed.'}`,
						)
					}
				}),
			)
		}
		setUploading([])
		await loadFolders(room.id, parentId)
	}
	useEffect(() => {
		let active = true
		void supabase.auth.getSession().then(async ({ data }) => {
			if (!active) return
			if (!data.session) {
				router.replace('/')
				return
			}
			try {
				const nextRoom = await apiRequest<Room>('/data-rooms/default')
				if (!active) return
				setRoom(nextRoom)
				await loadFolders(nextRoom.id)
			} catch {
				setError('Unable to load your Data Room.')
				setLoading(false)
			}
		})
		return () => {
			active = false
		}
	}, [router])
	const location = useMemo(
		() => ['Root', ...path.map(folder => folder.name)],
		[path],
	)
	async function addFolder() {
		if (!room) return
		const name = window.prompt('Folder name')
		if (!name?.trim()) return
		try {
			await apiRequest(`/data-rooms/${room.id}/folders`, {
				method: 'POST',
				body: JSON.stringify({ name, parentId }),
			})
			await loadFolders(room.id, parentId)
		} catch {
			setError('Could not create that folder.')
		}
	}
	async function renameFolder(folder: Folder) {
		if (!room) return
		const name = window.prompt('New folder name', folder.name)
		if (!name?.trim()) return
		try {
			await apiRequest(`/data-rooms/${room.id}/folders/${folder.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ name }),
			})
			await loadFolders(room.id, parentId)
		} catch {
			setError('Could not rename that folder.')
		}
	}
	async function deleteFolder(folder: Folder) {
		if (!room || !window.confirm(`Delete “${folder.name}” and its contents?`))
			return
		try {
			await apiRequest(`/data-rooms/${room.id}/folders/${folder.id}`, {
				method: 'DELETE',
			})
			await loadFolders(room.id, parentId)
		} catch {
			setError('Could not delete that folder.')
		}
	}
	async function signOut() {
		await supabase.auth.signOut()
		router.replace('/')
	}
	if (loading && !room)
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
					<h1>{room?.name ?? 'Data Room'}</h1>
				</div>
				<button onClick={signOut}>Sign out</button>
			</header>
			{error && (
				<p role='alert' className='error'>
					{error}
				</p>
			)}
			<nav aria-label='Breadcrumbs' className='breadcrumbs'>
				{location.map((name, index) => (
					<button
						key={`${name}-${index}`}
						onClick={() => {
							const next = path.slice(0, index)
							setPath(next)
							if (room) void loadFolders(room.id, next.at(-1)?.id)
						}}
					>
						{name}
					</button>
				))}
			</nav>
			<section className='toolbar'>
				<h2>{path.at(-1)?.name ?? 'Root folders'}</h2>
				<button onClick={addFolder}>New folder</button>
				<label className='upload-button'>
					Upload PDFs
					<input
						type='file'
						accept='application/pdf,.pdf'
						multiple
						hidden
						onChange={event => void uploadFiles(event.target.files)}
					/>
				</label>
			</section>
			{uploading.length > 0 && <p>Uploading {uploading.length} file(s)…</p>}
			{loading ? (
				<p>Loading folders…</p>
			) : folders.length === 0 && files.length === 0 ? (
				<p className='empty'>
					This folder is empty. Create a folder to get started.
				</p>
			) : (
				<ul className='folder-list'>
					{folders.map(folder => (
						<li key={folder.id}>
							<button
								className='folder'
								onClick={() => {
									setPath([...path, folder])
									if (room) void loadFolders(room.id, folder.id)
								}}
							>
								📁 <span>{folder.name}</span>
							</button>
							<span>
								<button onClick={() => void renameFolder(folder)}>
									Rename
								</button>
								<button onClick={() => void deleteFolder(folder)}>
									Delete
								</button>
							</span>
						</li>
					))}
				</ul>
			)}
			{files.length > 0 && (
				<ul className='folder-list'>
					{files.map(file => (
						<li key={file.id}>
							<span>📄 {file.name}</span>
							<span>
								<button
									onClick={() => {
										const name = window.prompt('New file name', file.name)
										if (name && room)
											void apiRequest(
												`/data-rooms/${room.id}/files/${file.id}`,
												{ method: 'PATCH', body: JSON.stringify({ name }) },
											)
												.then(() => loadFolders(room.id, parentId))
												.catch(error =>
													setError(
														error instanceof Error
															? error.message
															: 'Could not rename that file.',
													),
												)
									}}
								>
									Rename
								</button>
								<button
									onClick={() => {
										const destination = window.prompt(
											'Destination folder UUID (leave empty for the room root)',
											parentId ?? '',
										)
										if (destination !== null && room)
											void apiRequest(
												`/data-rooms/${room.id}/files/${file.id}`,
												{
													method: 'PATCH',
													body: JSON.stringify({
														folderId: destination.trim(),
													}),
												},
											)
												.then(() => loadFolders(room.id, parentId))
												.catch(error =>
													setError(
														error instanceof Error
															? error.message
															: 'Could not move that file.',
													),
												)
									}}
								>
									Move
								</button>
								<button
									onClick={() => {
										if (!room || !window.confirm(`Delete “${file.name}”?`))
											return
										void apiRequest(`/data-rooms/${room.id}/files/${file.id}`, {
											method: 'DELETE',
										})
											.then(() => loadFolders(room.id, parentId))
											.catch(error =>
												setError(
													error instanceof Error
														? error.message
														: 'Could not delete that file.',
												),
											)
									}}
								>
									Delete
								</button>
							</span>
						</li>
					))}
				</ul>
			)}
		</main>
	)
}
