import { createClient } from '@supabase/supabase-js'

type AttentionRow = { second: number; ticks?: number; count?: number }
type CountRow = { second: number; count?: number }
type SentimentRow = { second: number; slider_avg?: number }

function normalize(values: number[]): number[] {
	if (!values.length) return values
	const max = Math.max(...values)
	if (max === 0) return values.map(() => 0)
	return values.map((v) => v / max)
}

export async function GET(req: Request) {
	const url = new URL(req.url)
	const trackId = url.searchParams.get('track_id')
	if (!trackId) return new Response('track_id required', { status: 400 })
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL as string,
		process.env.SUPABASE_SERVICE_ROLE_KEY as string,
	)
	const [att, sk, rp, se] = await Promise.all([
		supabase.rpc('agg_attention_seconds', { p_track_id: trackId }),
		supabase.rpc('agg_skip_seconds', { p_track_id: trackId }),
		supabase.rpc('agg_replay_seconds', { p_track_id: trackId }),
		supabase.rpc('agg_sentiment_seconds', { p_track_id: trackId }),
	])
	const attention = (att.data ?? []) as AttentionRow[]
	const skip = (sk.data ?? []) as CountRow[]
	const replay = (rp.data ?? []) as CountRow[]
	const sentiment = (se.data ?? []) as SentimentRow[]
	const seconds = new Set<number>()
	;[attention, skip, replay, sentiment].forEach((arr) => arr.forEach((r) => seconds.add(r.second)))
	const sorted = [...seconds].sort((a, b) => a - b)
	const attMap = new Map(sorted.map((s) => [s, 0]))
	for (const r of attention) attMap.set(r.second, r.ticks ?? r.count ?? 0)
	const skMap = new Map(sorted.map((s) => [s, 0]))
	for (const r of skip) skMap.set(r.second, r.count ?? 0)
	const rpMap = new Map(sorted.map((s) => [s, 0]))
	for (const r of replay) rpMap.set(r.second, r.count ?? 0)
	const seMap = new Map(sorted.map((s) => [s, 0]))
	for (const r of sentiment) seMap.set(r.second, r.slider_avg ?? 0)
	const attVals = sorted.map((s) => (attMap.get(s) as number) ?? 0)
	const skVals = sorted.map((s) => (skMap.get(s) as number) ?? 0)
	const rpVals = sorted.map((s) => (rpMap.get(s) as number) ?? 0)
	const seVals = sorted.map((s) => Math.max(0, (seMap.get(s) as number) ?? 0))
	const nAtt = normalize(attVals)
	const nSk = normalize(skVals)
	const nRp = normalize(rpVals)
	const nSe = normalize(seVals)
	const bins = sorted.map((second, i) => ({
		second,
		attention: nAtt[i] ?? 0,
		skip: nSk[i] ?? 0,
		replay: nRp[i] ?? 0,
		sentiment: nSe[i] ?? 0,
	}))
	return Response.json({ trackId, bins })
}
