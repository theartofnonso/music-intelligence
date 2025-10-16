import { supabaseServer } from '@/lib/supabaseServer'

async function fetchTrack(trackId: string) {
    const { data, error } = await supabaseServer
        .from('track')
        .select('track_id,title,storage_path')
        .eq('track_id', trackId)
        .maybeSingle()
    if (error) throw error
    return data
}

export default async function SessionPage({ params }: { params: Promise<{ trackId: string }> }) {
    const { trackId } = await params
    const track = await fetchTrack(trackId)
    if (!track?.storage_path) return <div className="p-6">Track not found or missing URL.</div>
    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <ClientSession trackId={track.track_id} src={track.storage_path} title={track.title ?? 'Track'} />
        </div>
    )
}


