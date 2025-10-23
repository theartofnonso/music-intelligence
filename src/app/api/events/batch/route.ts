'use server'

import { NextRequest } from 'next/server'
import { createSecretClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const contentType = req.headers.get('content-type') || ''
    let body: unknown
    if (contentType.includes('application/json')) {
      body = await req.json().catch(() => ({}))
    } else if (contentType.includes('text/plain')) {
      const text = await req.text().catch(() => '')
      try { body = JSON.parse(text) } catch { body = {} }
    } else {
      body = await req.json().catch(() => ({}))
    }

    const payload = (body ?? {}) as { trackId?: string; events?: unknown[] }
    const rawTrackId = typeof payload.trackId === 'string' ? payload.trackId.trim() : ''
    const isUuid = (s: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s)
    const trackId = isUuid(rawTrackId) ? rawTrackId : ''
    const events = Array.isArray(payload.events) ? payload.events : []
    if (!trackId || events.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: !trackId ? 'invalid_track_id' : 'invalid_events' }), { status: 400 })
    }

    const supabase = createSecretClient()
    const { error } = await supabase.from('session').insert({ track_id: trackId, payload: { events } })
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 })
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (_e) {
    return new Response(JSON.stringify({ ok: false, error: 'unexpected' }), { status: 500 })
  }
}


