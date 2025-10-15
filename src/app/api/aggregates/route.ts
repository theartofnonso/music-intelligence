import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
	const url = new URL(req.url)
	const trackId = url.searchParams.get('track_id')
	if (!trackId) return new Response('track_id required', { status: 400 })
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL as string,
		process.env.SUPABASE_SERVICE_ROLE_KEY as string,
	)
	const [attention, skip, replay, sentiment] = await Promise.all([
		supabase.rpc('agg_attention_seconds', { p_track_id: trackId }),
		supabase.rpc('agg_skip_seconds', { p_track_id: trackId }),
		supabase.rpc('agg_replay_seconds', { p_track_id: trackId }),
		supabase.rpc('agg_sentiment_seconds', { p_track_id: trackId }),
	])
	return Response.json({
		attention: attention.data ?? [],
		skip: skip.data ?? [],
		replay: replay.data ?? [],
		sentiment: sentiment.data ?? [],
	})
}
