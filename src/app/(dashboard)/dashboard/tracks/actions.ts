'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTrackAction(formData: FormData) {
	const title = String(formData.get('title') ?? '') || null
	const storage_path = String(formData.get('storage_path') ?? '')
	const artist = (formData.get('artist') as string) || null
	const duration_ms = formData.get('duration_ms') ? Number(formData.get('duration_ms')) : null
	if (!storage_path) throw new Error('storage_path required')
	const supabase = await createClient()
	const { data, error } = await supabase
		.from('track')
		.insert({ title, artist, storage_path, duration_ms })
		.select('id,title,created_at,storage_path')
		.single()
	if (error) throw new Error(error.message)
	revalidatePath('/dashboard/tracks')
	return data
}

export async function deleteTrackAction(trackId: string) {
	// Look up storage_path to delete file, then delete the track
	const supabase = await createClient()
	const { data: t, error: selErr } = await supabase
		.from('track')
		.select('storage_path')
		.eq('id', trackId)
		.maybeSingle()
	if (selErr) throw new Error(selErr.message)

	if (t?.storage_path) {
		// Support both full public URLs and bucket-relative paths like "audio-public/dir/file.mp3"
		let bucket: string | null = null
		let objectPath: string | null = null
		if (t.storage_path.startsWith('http')) {
			const url = new URL(t.storage_path)
			const parts = url.pathname.split('/')
			const publicIdx = parts.findIndex((p) => p === 'public')
			if (publicIdx >= 0) {
				const after = parts.slice(publicIdx + 1)
				// Decode each segment to match exact storage object path
				const decoded = after.map((seg) => {
					try { return decodeURIComponent(seg) } catch { return seg }
				})
				bucket = decoded.shift() ?? null
				objectPath = decoded.join('/') || null
			}
		} else {
			// Assume "bucket/path/to/object"
			const [b, ...rest] = t.storage_path.split('/')
			bucket = b || null
			objectPath = rest.join('/') || null
			console.log('objectPath', objectPath)
		}
		if (!bucket || !objectPath) {
			throw new Error('Failed to resolve storage object path for deletion')
		}
		const { error: remErr } = await supabase.storage.from(bucket).remove([objectPath])
		if (remErr) throw new Error(`Storage delete failed: ${remErr.message}`)
	}

	const { error: delErr } = await supabase.from('track').delete().eq('id', trackId)
	if (delErr) throw new Error(delErr.message)
	revalidatePath('/dashboard/tracks')
	return { ok: true }
}