import { createClient } from '@supabase/supabase-js'

import type { NextRequest } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ trackId: string }> }) {
    const { trackId } = await params
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL as string,
		process.env.SUPABASE_SERVICE_ROLE_KEY as string,
	)
	const { data, error } = await supabase
		.from('track')
		.select('track_id,title,artist,duration_ms,storage_path')
        .eq('track_id', trackId)
		.maybeSingle()
	if (error) return new Response(error.message, { status: 500 })
	if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
	return Response.json({ track: data })
}
