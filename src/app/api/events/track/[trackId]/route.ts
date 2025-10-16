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

  if ((data?.length ?? 0) > 0) {
    const events = (data ?? []).map((r) => ({ type: r.event_type, positionMs: r.position_ms, payload: r.payload }))
    return Response.json({ events })
  }

  // Seed dummy rows into DB once, then return
  const seed = [
    { event_type: 'arcade_reaction', position_ms: 5000,  payload: { sectionIndex: 0, event: 'LIKE',    weight: 1 } },
    { event_type: 'arcade_reaction', position_ms: 20000, payload: { sectionIndex: 2, event: 'DISLIKE', weight: -1 } },
    { event_type: 'arcade_skip',     position_ms: 30000, payload: { fromMs: 30000, toMs: 40000, deltaMs: 10000, fromSectionIndex: 3, toSectionIndex: 4, event: 'SKIP',   weight: -1 } },
    { event_type: 'arcade_replay',   position_ms: 45000, payload: { fromMs: 45000, toMs: 35000, deltaMs: -10000, fromSectionIndex: 4, toSectionIndex: 3, event: 'REPLAY', weight: 1 } },
    { event_type: 'arcade_reaction', position_ms: 60000, payload: { sectionIndex: 6, event: 'LIKE',    weight: 1 } },
  ].map((e) => ({
    session_id: '00000000-0000-0000-0000-000000000000',
    track_id: trackId,
    event_type: e.event_type,
    position_ms: e.position_ms,
    payload: e.payload,
    client_ts: new Date(),
    seq: Math.floor(Math.random() * 1_000_000) + 1,
  }))

  const { error: insErr } = await supabase.from('event').insert(seed)
  if (insErr) return new Response(insErr.message, { status: 500 })

  const { data: after } = await supabase
    .from('event')
    .select('event_type, position_ms, payload')
    .eq('track_id', trackId)
    .order('position_ms', { ascending: true })
    .limit(2000)
  const events = (after ?? []).map((r) => ({ type: r.event_type, positionMs: r.position_ms, payload: r.payload }))
  return Response.json({ events })
}


