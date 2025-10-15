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

export default async function TrackDetail({ params }: { params: { trackId: string } }) {
	const track = await fetchTrack(params.trackId)
	if (!track) return <div className="p-6">Track not found.</div>
	const [aggs, fp] = await Promise.all([getAggregates(track.track_id), getFingerprint(track.track_id)])
	const hasData = (aggs.attention.length + aggs.skip.length + aggs.replay.length + aggs.sentiment.length) > 0
	return (
		<div className="space-y-6">
			<h1 className="text-xl font-semibold">{track.title ?? 'Track'} — Analytics</h1>
			{!hasData && <p className="text-sm text-muted-foreground">No data yet. Share the test link and collect listener interactions.</p>}
			{hasData && (
				<div className="space-y-4">
					<section>
						<h2 className="text-sm font-semibold mb-2">Attention (ticks/sec)</h2>
						<ul className="text-xs grid grid-cols-4 gap-2">
							{aggs.attention.slice(0, 40).map((b) => (
								<li key={`att-${b.second}`} className="flex justify-between"><span>{b.second}s</span><span>{b.ticks ?? b.count ?? 0}</span></li>
							))}
						</ul>
					</section>
					<section>
						<h2 className="text-sm font-semibold mb-2">Skips / Replays (per sec)</h2>
						<ul className="text-xs grid grid-cols-4 gap-2">
							{aggs.skip.slice(0, 40).map((b) => (
								<li key={`sk-${b.second}`} className="flex justify-between"><span>{b.second}s</span><span>{b.count ?? 0}</span></li>
							))}
							{aggs.replay.slice(0, 40).map((b) => (
								<li key={`rp-${b.second}`} className="flex justify-between"><span>{b.second}s</span><span>{b.count ?? 0}</span></li>
							))}
						</ul>
					</section>
					<section>
						<h2 className="text-sm font-semibold mb-2">Sentiment (avg by sec)</h2>
						<ul className="text-xs grid grid-cols-4 gap-2">
							{aggs.sentiment.slice(0, 40).map((b) => (
								<li key={`se-${b.second}`} className="flex justify-between"><span>{b.second}s</span><span>{(b.slider_avg ?? 0).toFixed(2)}</span></li>
							))}
						</ul>
					</section>
					<section>
						<h2 className="text-sm font-semibold mb-2">Engagement Fingerprint (normalized)</h2>
						<ul className="text-xs grid grid-cols-4 gap-2">
							{fp.slice(0, 40).map((b) => (
								<li key={`fp-${b.second}`} className="flex justify-between"><span>{b.second}s</span><span>{`A:${b.attention.toFixed(2)} S:${b.skip.toFixed(2)} R:${b.replay.toFixed(2)} E:${b.sentiment.toFixed(2)}`}</span></li>
							))}
						</ul>
					</section>
				</div>
			)}
		</div>
	)
}
