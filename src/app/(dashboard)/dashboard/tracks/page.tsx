import { createClient } from '@/lib/supabase/server'
import { TracksClient, type Track } from './TracksClient'

async function fetchTracks(): Promise<Track[]> {
	const supabase = await createClient()
	const { data: user } = await supabase.auth.getUser()
	const { data, error } = await supabase
        .from('track')
        .select('id,title,created_at')
        .eq('owner_id', user.user?.id ?? '')
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
