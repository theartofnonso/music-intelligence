import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL as string,
	process.env.SUPABASE_SERVICE_ROLE_KEY as string,
)

const EventSchema = z.object({
	sessionId: z.string().uuid(),
	trackId: z.string().uuid(),
	type: z.string(),
	positionMs: z.number().int().nonnegative(),
	clientTs: z.number().int(),
	seq: z.number().int().positive(),
	payload: z.any().optional(),
})
const BatchSchema = z.object({ events: z.array(EventSchema).min(1).max(500) })

export async function POST(req: Request) {
	const body = await req.json()
	const parsed = BatchSchema.safeParse(body)
	if (!parsed.success) return new Response('Bad Request', { status: 400 })

	const rows = parsed.data.events.map((e) => ({
		session_id: e.sessionId,
		track_id: e.trackId,
		event_type: e.type,
		position_ms: e.positionMs,
		payload: e.payload ?? null,
		client_ts: new Date(e.clientTs),
		seq: e.seq,
	}))

	const { error } = await supabase.from('event').insert(rows)
	if (error) return new Response(error.message, { status: 500 })
	return Response.json({ ok: true, count: rows.length })
}
