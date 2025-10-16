import { supabaseServer } from '@/lib/supabaseServer'
// removed analytics RPC usage; curves are computed from raw session events
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { curvesFromEvents, processSessionEvents, buildUniformSections, type Section } from '@/lib/curves'
import TrackCurvesChart from '@/components/charts/TrackCurvesChart'
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

    const zeroRails = Array.from({ length: 60 }).map((_, i) => ({ second: i, valence: 0, arousal: 0 }))

    // Attempt to compute curves client-side from raw events (fallback to aggregates/zeros if unavailable)
    let computed: { valence: number[]; arousal: number[] } | null = null
    let binsSeconds: number[] = []
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
                // simplified shape: no positionMs; use payload.t when present
                flat.push({ type: e.type, positionMs: e.payload?.t ?? 0, payload: e.payload ?? null })
            }
        }
        serverEvents = flat
        const reviewEvents = processSessionEvents(serverEvents)
        const durationMs = (serverEvents.length ? Math.max(...serverEvents.map((e: any) => e.positionMs ?? 0)) : 0) || 60_000
        const sections: Section[] = buildUniformSections(durationMs, 10_000)
        if (reviewEvents.length > 0) {
            computed = curvesFromEvents(sections, reviewEvents, durationMs, { sigmaMs: 2500, fps: 1, bleedMs: 1500 })
            binsSeconds = Array.from({ length: computed.valence.length }).map((_, i) => i)
        }
    } catch { }
    return (
        <div className="space-y-6">
            <div>
                <Button asChild variant="outline" size="sm" className="gap-2">
                    <a href="/dashboard/tracks" aria-label="Back to tracks">
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to tracks</span>
                    </a>
                </Button>
            </div>
            {/* Hero */}
            <div className="flex items-center gap-4">
                <div className="grid size-16 place-items-center rounded-lg bg-foreground/10" />
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold truncate">{track?.title ?? 'Track'}</h1>
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

            {/* Valence/Arousal Rail + Skip/Replay markers */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold">Emotional curves</h2>
                <TrackCurvesChart
                    data={(computed
                        ? computed.valence.map((v, i) => ({ second: i, valence: v, arousal: computed!.arousal[i] ?? 0 }))
                        : zeroRails
                    )}
                />
            </section>
        </div>
    )
}
