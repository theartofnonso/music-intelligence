import { supabaseServer } from '@/lib/supabaseServer'
import { getAggregates, getFingerprint } from '@/lib/analytics'
import { curvesFromEvents, mapRawEventsToReviewEvents, buildUniformSections, type Section } from '@/lib/curves'
import TrackCurvesChart from '@/components/charts/TrackCurvesChart'

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
	if (!track) return <div className="p-6">Track not found.</div>
    const [aggs, fp] = await Promise.all([getAggregates(track.track_id), getFingerprint(track.track_id)])
    const hasData = (aggs.attention.length + aggs.skip.length + aggs.replay.length + aggs.sentiment.length) > 0
    const dummySeconds = Array.from({ length: 60 }).map((_, i) => i)
    const dummyRails = dummySeconds.map((s) => ({
        second: s,
        valence: Math.sin(s / 6) * 0.6,
        arousal: Math.max(0, Math.cos(s / 8)),
        skip: s % 11 === 0 ? 0.8 : 0,
        replay: s % 17 === 0 ? 0.7 : 0,
    }))

    // Attempt to compute curves client-side from raw events (fallback to existing aggregates if unavailable)
    let computed: { V: number[]; A: number[] } | null = null
    let binsSeconds: number[] = []
    try {
        // TODO: replace with real fetch to /api/events/[trackId] if/when available
        const rawEvents: any[] = []
        const reviewEvents = mapRawEventsToReviewEvents(rawEvents)
        const durationMs = Math.max(...fp.map((b) => (b.second ?? 0))) * 1000 || 60_000
        const sections: Section[] = buildUniformSections(durationMs, 10_000)
        if (reviewEvents.length > 0) {
            computed = curvesFromEvents(sections, reviewEvents, durationMs, { sigmaMs: 2500, fps: 1, bleedMs: 1500 })
            binsSeconds = Array.from({ length: computed.V.length }).map((_, i) => i)
        }
    } catch {}
	return (
        <div className="space-y-6">
            {/* Hero */}
            <div className="flex items-center gap-4">
                <div className="grid size-16 place-items-center rounded-lg bg-foreground/10" />
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold truncate">{track.title ?? 'Track'}</h1>
                    <p className="text-xs text-muted-foreground">Analysis overview</p>
                </div>
            </div>

            {/* Valence/Arousal Rail + Skip/Replay markers */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold">Emotional curves</h2>
                <TrackCurvesChart
                    data={(computed
                        ? computed.V.map((v, i) => ({ second: i, valence: v, arousal: computed!.A[i] ?? 0 }))
                        : (hasData
                            ? fp.map((b:any) => ({ second: b.second, valence: b.sentiment ?? 0, arousal: b.attention ?? 0 }))
                            : dummyRails.map((b:any) => ({ second: b.second, valence: b.valence, arousal: b.arousal, skip: b.skip, replay: b.replay }))
                          )
                    )}
                />
            </section>

            {/* Fingerprint mini-bars */}
            <section className="space-y-2">
                <h2 className="text-sm font-semibold">Engagement fingerprint</h2>
                <div className="grid grid-cols-3 gap-2 text-xs">
                    {(hasData ? fp.slice(0, 45) : dummyRails.slice(0, 45)).map((b: any, i: number) => (
                        <div key={`fp-${i}`} className="rounded border p-2">
                            <div className="mb-1 text-[10px] text-muted-foreground">{(b.second ?? i)}s</div>
                            <div className="flex h-10 items-end gap-1">
                                <div className="w-1.5 bg-zinc-800" style={{ height: `${Math.round(((b.attention ?? 0) * 100)) * 0.6}%` }} />
                                <div className="w-1.5 bg-red-500" style={{ height: `${Math.round(((b.skip ?? 0) * 100)) * 0.6}%` }} />
                                <div className="w-1.5 bg-emerald-500" style={{ height: `${Math.round(((b.replay ?? 0) * 100)) * 0.6}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Sections summary */}
            <section className="space-y-2">
                <h2 className="text-sm font-semibold">Sections</h2>
                <div className="rounded border">
                    <div className="grid grid-cols-5 border-b px-3 py-2 text-xs font-semibold">
                        <div>Idx</div>
                        <div>Time</div>
                        <div>Top reaction</div>
                        <div>Skip latency</div>
                        <div>Replay rate</div>
                    </div>
                    <div className="divide-y text-xs">
                        {(hasData ? fp.slice(0, 12) : dummyRails.slice(0, 12)).map((b: any, i: number) => (
                            <div key={`row-${i}`} className="grid grid-cols-5 px-3 py-2">
                                <div>#{i + 1}</div>
                                <div>{(b.second ?? i)}s–{(b.second ?? i) + 5}s</div>
                                <div>{(b.sentiment ?? b.valence) >= 0 ? 'LIKE' : 'DISLIKE'}</div>
                                <div>{(b.skip ?? 0) > 0 ? `${Math.round((b.second ?? i))}s` : '—'}</div>
                                <div>{(b.replay ?? 0) > 0 ? 'High' : '—'}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
	)
}
