"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabaseBrowser } from '@/lib/supabaseClient'

export default function UploadPage() {
	const [file, setFile] = useState<File | null>(null)
	const [title, setTitle] = useState('')
	const [artist, setArtist] = useState('')
	const [busy, setBusy] = useState(false)
	const [message, setMessage] = useState('')

	const onUpload = async () => {
		if (!file) return
		setBusy(true)
		setMessage('')
		try {
			const path = `audio-public/${crypto.randomUUID()}/${file.name}`
			const { error: upErr } = await supabaseBrowser.storage.from('audio-public').upload(path, file, { upsert: false })
			if (upErr) throw upErr
			const { data: pub } = supabaseBrowser.storage.from('audio-public').getPublicUrl(path)
			const res = await fetch('/api/tracks/create', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ title, artist, storage_path: pub.publicUrl }),
			})
			if (!res.ok) throw new Error('Failed to create track')
			const json = (await res.json()) as { track_id: string }
			setMessage(`Uploaded and created track ${json.track_id}`)
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Upload failed'
			setMessage(msg)
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">Upload Track</h1>
			<div className="flex flex-col gap-2 max-w-md">
				<Input placeholder="Title" value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
				<Input placeholder="Artist" value={artist} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArtist(e.target.value)} />
				<input type="file" accept="audio/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)} />
				<Button disabled={!file || busy} onClick={onUpload}>Upload</Button>
				{message && <p className="text-sm text-muted-foreground">{message}</p>}
			</div>
		</div>
	)
}
