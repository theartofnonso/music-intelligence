'use server'

import { createSecretClient } from '@/lib/supabase/server'

export async function sendSessionPayloadAction(input: { trackId: string; events: unknown[] }) {
    const { trackId, events } = input
    const isUuid = (s: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s)
    if (!trackId || !isUuid(trackId) || !Array.isArray(events) || events.length === 0) return { ok: false }
    const supabase = createSecretClient()
    const { error } = await supabase.from('session').insert({ track_id: trackId, payload: { events } })
    if (error) throw new Error(error.message)
    return { ok: true }
}


