'use server'

import { createClient } from '@/lib/supabase/server'

export async function sendSessionPayloadAction(input: { trackId: string; events: unknown[] }) {
    const { trackId, events } = input
    if (!trackId || !Array.isArray(events) || events.length === 0) return { ok: false }
    const supabase = await createClient()
    const { error } = await supabase.from('session').insert({ track_id: trackId, payload: { events } })
    if (error) throw new Error(error.message)
    return { ok: true }
}


