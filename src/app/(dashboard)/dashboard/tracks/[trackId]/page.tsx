import { supabaseServer } from '@/lib/supabaseServer'
import { getAggregates, getFingerprint } from '@/lib/analytics'

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
                <div className="space-y-1">
                    <div className="relative h-8 w-full rounded bg-accent/40 overflow-hidden">
                        <div className="absolute inset-0 flex">
                            {(hasData ? fp : dummyRails).map((b: any, i: number) => (
                                <div key={`va-${i}`} className="flex-1 relative">
                                    <div className="absolute inset-x-0 bottom-0 bg-green-600/50" style={{ height: `${Math.max(0, (b.sentiment ?? b.valence) + 1) * 25}%` }} />
                                    <div className="absolute inset-x-0 top-0 bg-blue-600/40" style={{ height: `${Math.max(0, (b.attention ?? b.arousal)) * 35}%` }} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative h-5 w-full">
                        <div className="absolute inset-0 flex">
                            {(hasData ? fp : dummyRails).map((b: any, i: number) => (
                                <div key={`mr-${i}`} className="relative flex-1">
                                    {((b.skip ?? 0) > 0) && <div className="absolute inset-x-0 bottom-0 h-2 bg-red-500/70" />}
                                    {((b.replay ?? 0) > 0) && <div className="absolute inset-x-0 top-0 h-2 bg-emerald-500/70" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
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
