import { supabaseServer } from '@/lib/supabaseServer'

export type BinCount = { second: number; count?: number; ticks?: number }
export type BinSentiment = { second: number; slider_avg?: number }

export async function getAggregates(trackId: string) {
	const [att, sk, rp, se] = await Promise.all([
		supabaseServer.rpc('agg_attention_seconds', { p_track_id: trackId }),
		supabaseServer.rpc('agg_skip_seconds', { p_track_id: trackId }),
		supabaseServer.rpc('agg_replay_seconds', { p_track_id: trackId }),
		supabaseServer.rpc('agg_sentiment_seconds', { p_track_id: trackId }),
	])
	return {
		attention: (att.data ?? []) as BinCount[],
		skip: (sk.data ?? []) as BinCount[],
		replay: (rp.data ?? []) as BinCount[],
		sentiment: (se.data ?? []) as BinSentiment[],
	}
}

export async function getFingerprint(trackId: string) {
	const { attention, skip, replay, sentiment } = await getAggregates(trackId)
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
	const normalize = (v: number[]) => {
		if (!v.length) return v
		const m = Math.max(...v)
		if (m === 0) return v.map(() => 0)
		return v.map((x) => x / m)
	}
	const nAtt = normalize(attVals)
	const nSk = normalize(skVals)
	const nRp = normalize(rpVals)
	const nSe = normalize(seVals)
	return sorted.map((second, i) => ({ second, attention: nAtt[i] ?? 0, skip: nSk[i] ?? 0, replay: nRp[i] ?? 0, sentiment: nSe[i] ?? 0 }))
}
