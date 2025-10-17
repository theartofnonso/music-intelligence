import { createSecretClient } from '@/lib/supabase/server'
import ClientEventsBreakdown from './ClientEventsBreakdown'

async function fetchTrack(trackId: string) {
    const supabase = createSecretClient()
    const { data, error } = await supabase
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

    type SegmentPayload = { t?: number; segmentIndex?: number; segmentStartMs?: number; segmentEndMs?: number }
    type ServerEvent = { type: string; positionMs: number; payload?: SegmentPayload }
    let serverEvents: ServerEvent[] = []
    try {
        const supabase = createSecretClient()
        const { data, error } = await supabase
            .from('session')
            .select('payload, created_at')
            .eq('track_id', trackId)
            .order('created_at', { ascending: true })
            .limit(2000)
        if (error) throw error
        const rows = (data ?? []) as Array<{ payload: { events?: Array<{ type: string; payload?: SegmentPayload }> } | null; created_at: string }>
        const flat: ServerEvent[] = []
        for (const r of rows) {
            const events = Array.isArray(r.payload?.events) ? r.payload?.events ?? [] : []
            for (const e of events) {
                const t = typeof e.payload?.t === 'number' ? e.payload.t : 0
                flat.push({ type: e.type, positionMs: t, payload: e.payload })
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

            {/* Event breakdown */}
            <section>
                <ClientEventsBreakdown src={track?.storage_path ?? ''} events={serverEvents} />
            </section>
        </div>
    )
}
