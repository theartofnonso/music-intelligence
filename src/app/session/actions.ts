'use server'

import { supabaseServer } from '@/lib/supabaseServer'

export async function sendSessionPayloadAction(input: { trackId: string; events: unknown[] }) {
    const { trackId, events } = input
    if (!trackId || !Array.isArray(events) || events.length === 0) return { ok: false }
    const { error } = await supabaseServer.from('session').insert({ track_id: trackId, payload: { events } })
    if (error) throw new Error(error.message)
    return { ok: true }
}


