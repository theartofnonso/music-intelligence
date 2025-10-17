import { createSecretClient } from '@/lib/supabase/server'
import { ClientSession } from './ClientSession'

async function fetchTrack(trackId: string) {
    const supabase = createSecretClient()
    const { data, error } = await supabase
        .from('track')
        .select('id,title,storage_path')
        .eq('id', trackId)
        .maybeSingle()
    if (error) throw error
    return data
}

export default async function SessionPage({ params }: { params: Promise<{ trackId: string }> }) {
    const { trackId } = await params
    const track = await fetchTrack(trackId)
    if (!track?.storage_path) return <div className="p-6">Track not found or missing URL.</div>
    return (
        <div className="mx-auto max-w-2xl space-y-6 px-3 py-4 sm:px-6 sm:py-6">
            <ClientSession trackId={track.id} src={track.storage_path} />
        </div>
    )
}


