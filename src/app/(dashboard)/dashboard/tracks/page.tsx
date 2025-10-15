import { supabaseServer } from '@/lib/supabaseServer'
import { TracksClient, type Track } from './TracksClient'

async function fetchTracks(): Promise<Track[]> {
	const { data, error } = await supabaseServer
		.from('track')
		.select('track_id,title')
		.order('created_at', { ascending: false })
	if (error) throw error
	return (data ?? []) as Track[]
}

export default async function TracksPage() {
	const tracks = await fetchTracks()
	return (
		<div className="flex flex-1 flex-col gap-4 p-2">
			<TracksClient initialTracks={tracks} />
		</div>
	)
}
