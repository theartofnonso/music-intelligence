import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
)

export async function GET(_req: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params
  if (!trackId) return new Response('Missing trackId', { status: 400 })

  // Try fetch existing events for this track
  const { data, error } = await supabase
    .from('event')
    .select('event_type, position_ms, payload')
    .eq('track_id', trackId)
    .order('position_ms', { ascending: true })
    .limit(2000)
  if (error) return new Response(error.message, { status: 500 })

  const events = (data ?? []).map((r) => ({ type: r.event_type, positionMs: r.position_ms, payload: r.payload }))
  return Response.json({ events })
}


