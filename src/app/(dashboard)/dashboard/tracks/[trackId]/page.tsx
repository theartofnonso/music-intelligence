import { supabaseServer } from '@/lib/supabaseServer'
import { getAggregates, getFingerprint } from '@/lib/analytics'
import { ArrowLeft } from 'lucide-react'
import { curvesFromEvents, mapRawEventsToReviewEvents, buildUniformSections, type Section } from '@/lib/curves'
import TrackCurvesChart from '@/components/charts/TrackCurvesChart'
import ClientEventsBreakdown from './ClientEventsBreakdown'
import SimpleWavePlayer from '@/components/player/SimpleWavePlayer'

async function fetchTrack(trackId: string) {
	const { data, error } = await supabaseServer
		.from('track')
		.select('track_id,title,artist,storage_path')
		.eq('track_id', trackId)
		.maybeSingle()
	if (error) throw error
	return data
}

export default async function TrackDetail({ params }: { params: Promise<{ trackId: string }> }) {
	const { trackId } = await params
	const track = await fetchTrack(trackId)
    console.log(track)
	if (!track) return <div className="p-6">Track not found.</div>
    const [aggs, fp] = await Promise.all([getAggregates(track.track_id), getFingerprint(track.track_id)])
    const hasData = (aggs.attention.length + aggs.skip.length + aggs.replay.length + aggs.sentiment.length) > 0
    const zeroRails = Array.from({ length: 60 }).map((_, i) => ({ second: i, valence: 0, arousal: 0 }))

    // Attempt to compute curves client-side from raw events (fallback to aggregates/zeros if unavailable)
    let computed: { V: number[]; A: number[] } | null = null
    let binsSeconds: number[] = []
    let serverEvents: any[] = []
    try {
        const { data, error } = await supabaseServer
            .from('event')
            .select('event_type, position_ms, payload')
            .eq('track_id', trackId)
            .order('position_ms', { ascending: true })
            .limit(2000)
        if (error) throw error
        serverEvents = (data ?? []).map((r) => ({ type: r.event_type, positionMs: r.position_ms, payload: r.payload }))
        const reviewEvents = mapRawEventsToReviewEvents(serverEvents)
        const durationMs = Math.max(...fp.map((b) => (b.second ?? 0))) * 1000 || 60_000
        const sections: Section[] = buildUniformSections(durationMs, 10_000)
        if (reviewEvents.length > 0) {
            computed = curvesFromEvents(sections, reviewEvents, durationMs, { sigmaMs: 2500, fps: 1, bleedMs: 1500 })
            binsSeconds = Array.from({ length: computed.V.length }).map((_, i) => i)
        }
    } catch {}
	return (
        <div className="space-y-6">
            <div>
                <a href="/dashboard/tracks" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:font-semibold">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to tracks</span>
                </a>
            </div>
            {/* Hero */}
            <div className="flex items-center gap-4">
                <div className="grid size-16 place-items-center rounded-lg bg-foreground/10" />
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold truncate">{track.title ?? 'Track'}</h1>
                    <p className="text-xs text-muted-foreground">Analysis overview</p>
                </div>
            </div>

            {/* Player */}
            <section>
                {track.storage_path && <SimpleWavePlayer src={track.storage_path} />}
            </section>

            {/* Event breakdown */}
            <section>
                <ClientEventsBreakdown src={track.storage_path ?? ''} events={serverEvents} />
            </section>

            {/* Valence/Arousal Rail + Skip/Replay markers */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold">Emotional curves</h2>
                <TrackCurvesChart
                    data={(computed
                        ? computed.V.map((v, i) => ({ second: i, valence: v, arousal: computed!.A[i] ?? 0 }))
                        : (hasData
                            ? fp.map((b:any) => ({ second: b.second, valence: b.sentiment ?? 0, arousal: b.attention ?? 0 }))
                            : zeroRails
                          )
                    )}
                />
            </section>

            
        </div>
	)
}
