"use client"

import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
// no card components
import { UploadCloud, Music, Upload, X } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabaseClient'
import { createTrackAction } from './actions'
import { formatRelativeTime } from '@/lib/utils'
import { TrackRowActions } from '@/components/dashboard/TrackRowActions'
import { Progress } from '@/components/ui/progress'

export type Track = { track_id: string; title: string | null; created_at?: string }

type Props = { initialTracks: Track[] }

export function TracksClient({ initialTracks }: Props) {
	const [tracks, setTracks] = useState<Track[]>(initialTracks)
	const [file, setFile] = useState<File | null>(null)
	const [dragActive, setDragActive] = useState(false)
	const [busy, setBusy] = useState(false)
	const [message, setMessage] = useState('')
	const [uploadProgress, setUploadProgress] = useState<number | null>(null)
	const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const fileInputRef = useRef<HTMLInputElement | null>(null)

	const onChooseClick = () => fileInputRef.current?.click()

	const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		setDragActive(true)
	}
	const onDragLeave = () => setDragActive(false)
	const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		setDragActive(false)
		const f = e.dataTransfer.files?.[0]
		if (f) setFile(f)
	}
	const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.currentTarget.files?.[0] ?? null
		setFile(f)
	}

	const upload = useCallback(async () => {
		if (!file) return
		setBusy(true)
		setMessage('')
		setUploadProgress(1)
		if (progressTimerRef.current) clearInterval(progressTimerRef.current)
		progressTimerRef.current = setInterval(() => {
			setUploadProgress((p) => {
				if (p === null) return p
				// creep up to 90% while uploading; complete on success
				return Math.min(90, (p || 1) + 2)
			})
		}, 200)
		const reqId = crypto.randomUUID()
		console.log(`[upload][${reqId}] start`, { name: file.name, size: file.size, type: file.type })
		try {
			const bucket = 'audio-public'
			const folder = 'uploads'
			const path = `${folder}/${file.name}`
			console.log(`[upload][${reqId}] storage.upload`, { bucket: 'audio-public', path })
			const { error: upErr } = await supabaseBrowser.storage.from('audio-public').upload(path, file, { upsert: false })
			if (upErr) throw upErr
			const { data: pub } = supabaseBrowser.storage.from(bucket).getPublicUrl(path)
			console.log(`[upload][${reqId}] got publicUrl`, { publicUrl: pub.publicUrl })
			const form = new FormData()
			form.set('title', file.name)
			// Store absolute public URL for direct playback
			form.set('storage_path', pub.publicUrl)
			const json = await createTrackAction(form) as { track_id: string; title: string | null; storage_path: string; created_at?: string }
			console.log(`[upload][${reqId}] success`, { track_id: json.track_id })
			setUploadProgress(100)
			setTracks((prev) => [{ track_id: json.track_id, title: json.title ?? file.name, created_at: json.created_at }, ...prev])
			setFile(null)
			if (fileInputRef.current) fileInputRef.current.value = ''
			setMessage('Uploaded')
		} catch (e: unknown) {
			console.error(`[upload] error`, e)
			setMessage(e instanceof Error ? e.message : 'Upload failed')
		} finally {
			setBusy(false)
			if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null }
			setTimeout(() => setUploadProgress(null), 400)
		}
	}, [file])

	return (
		<div className="space-y-6 relative">
			<section>
				<div>
					<div
						className={`border border-dashed rounded-xl p-10 text-center transition-colors ${dragActive ? 'bg-accent/80' : 'bg-accent/60'}`}
						onDragOver={onDragOver}
						onDragLeave={onDragLeave}
						onDrop={onDrop}
						onClick={onChooseClick}
						role="button"
						aria-label="Upload area"
					>
						<div className="mx-auto grid h-12 w-12 place-items-center rounded-full">
							<UploadCloud className="h-5 w-5" />
						</div>
						<p className="mt-3 text-sm">
							Drag and Drop file here or{' '}
							<label htmlFor="file-input" className="underline underline-offset-4 cursor-pointer font-mono" aria-label="Choose file" onClick={(e) => e.stopPropagation()}>Choose file</label>
						</p>
						<input id="file-input" ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={onPick} />
						{file && <p className="mt-2 text-xs">Selected: {file.name}</p>}
					</div>
					<div className="mt-4 flex items-center justify-end gap-2">
						{file && <Button variant="secondary" type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}>
							<X className="h-4 w-4" />
							Cancel
						</Button>}
						<Button disabled={!file || busy} onClick={upload}>
							<Upload className="h-4 w-4" />
							Upload
						</Button>
					</div>
				</div>
				{message && <p className="mt-2 text-xs text-muted-foreground">{message}</p>}
			</section>
			<section className="space-y-2">
				<h2 className="text-sm font-semibold">Files</h2>
				{tracks.length === 0 ? (
					<div className="p-6 text-center text-xs text-muted-foreground">
						No files yet. Upload an audio file to get started.
					</div>
				) : (
				<ul className="text-sm space-y-1">
						{tracks.map((t) => {
							const rel = formatRelativeTime(t.created_at)
							return (
								<li key={t.track_id} className="flex items-center justify-between gap-4 rounded-md px-2 py-2 transition-colors hover:bg-accent/40">
									<a href={`/dashboard/tracks/${t.track_id}`} className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer">
										<div className="grid size-10 place-items-center rounded-md bg-foreground/10">
											<Music className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
										</div>
										<div className="min-w-0">
											<p className="font-semibold truncate">{t.title ?? 'Untitled'}</p>
											{rel && <p className="text-xs text-muted-foreground">{rel}</p>}
										</div>
									</a>
                                <TrackRowActions trackId={t.track_id} onDeleted={(id) => setTracks((prev) => prev.filter((x) => x.track_id !== id))} />
								</li>
							)
						})}
					</ul>
				)}
			</section>
			{busy && (
				<div className="fixed inset-0 z-50 grid place-items-center bg-background/60 backdrop-blur-sm">
					<div className="w-full max-w-sm rounded-md border bg-background p-4 text-center">
						<p className="text-sm font-medium">Uploading…</p>
						<div className="mt-3">
							<Progress value={uploadProgress ?? undefined} />
							<p className="mt-1 text-[10px] text-muted-foreground">{Math.round(uploadProgress ?? 0)}%</p>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
