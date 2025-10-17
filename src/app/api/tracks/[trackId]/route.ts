import { createClient } from '@/lib/supabase/server'

import type { NextRequest } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ trackId: string }> }) {
    const { trackId } = await params
	const supabase = await createClient()
	const { data, error } = await supabase
		.from('track')
		.select('id,title,artist,duration_ms,storage_path')
		.eq('id', trackId)
		.maybeSingle()
	if (error) return new Response(error.message, { status: 500 })
	if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
	return Response.json({ track: data })
}
