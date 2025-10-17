import { supabaseServer } from '@/lib/supabaseServer'
import ClientEventsBreakdown from './ClientEventsBreakdown'
import SimpleWavePlayer from '@/components/player/SimpleWavePlayer'

async function fetchTrack(trackId: string) {
    const { data, error } = await supabaseServer
        .from('track')
        .select('id,title,artist,storage_path')
        .eq('id', trackId)
        .maybeSingle()
    if (error) throw error
    return data
}

export default async function TrackDetail({ params }: { params: Promise<{ trackId: string }> }) {
    const { trackId } = await params
    const track = await fetchTrack(trackId)

    let serverEvents: any[] = []
    try {
        const { data, error } = await supabaseServer
            .from('session')
            .select('payload, created_at')
            .eq('track_id', trackId)
            .order('created_at', { ascending: true })
            .limit(2000)
        if (error) throw error
        const rows = (data ?? []) as Array<{ payload: any; created_at: string }>
        const flat: any[] = []
        for (const r of rows) {
            const events = Array.isArray(r.payload?.events) ? r.payload.events : []
            for (const e of events) {
                flat.push({ type: e.type, positionMs: e.payload?.t ?? 0, payload: e.payload ?? null })
            }
        }
        serverEvents = flat
    } catch { }
    return (
        <div className="space-y-6">
            <div />
            {/* Hero */}
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="grid size-16 place-items-center rounded-lg bg-foreground/10" />
                <div className="min-w-0 text-center sm:text-left">
                    <h1 className="truncate text-xl font-semibold">{track?.title ?? 'Track'}</h1>
                    <p className="text-xs text-muted-foreground">Analysis overview</p>
                </div>
            </div>

            {/* Player */}
			<section>
				{track?.storage_path ? (
					<SimpleWavePlayer src={track.storage_path} />
				) : (
					<div className="h-24 rounded-md border bg-foreground/5 opacity-50 grid place-items-center text-xs text-muted-foreground">
						Audio unavailable
					</div>
				)}
			</section>

            {/* Event breakdown */}
			<section>
				<ClientEventsBreakdown src={track?.storage_path ?? ''} events={serverEvents} />
			</section>
        </div>
    )
}
