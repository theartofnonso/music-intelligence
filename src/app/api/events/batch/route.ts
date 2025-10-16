import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL as string,
	process.env.SUPABASE_SERVICE_ROLE_KEY as string,
)

// Accept a single merged session payload (aligned to public.session schema)
const EventItemSchema = z.object({
    type: z.string(),
    positionMs: z.number().int().nonnegative(),
    payload: z.any().optional(),
})
const SessionSchema = z.object({
    sessionId: z.string().uuid().optional(),
    trackId: z.string().uuid(),
    payload: z.object({ events: z.array(EventItemSchema).min(1) }),
})
const BatchSchema = z.object({ events: z.tuple([SessionSchema]) })

export async function POST(req: Request) {
	const body = await req.json()
	const parsed = BatchSchema.safeParse(body)
	if (!parsed.success) return new Response('Bad Request', { status: 400 })

    const e = parsed.data.events[0]
    const base = { track_id: e.trackId, payload: e.payload }
    const row = e.sessionId ? { session_id: e.sessionId, ...base } : base
    const { error } = await supabase.from('session').insert(row as any)
    if (error) return new Response(error.message, { status: 500 })
    return Response.json({ ok: true })
}
