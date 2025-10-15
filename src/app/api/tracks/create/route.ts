import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
	const body = await req.json()
	const { title, artist, storage_path, duration_ms } = body ?? {}
	if (!storage_path) return new Response('storage_path required', { status: 400 })
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL as string,
		process.env.SUPABASE_SERVICE_ROLE_KEY as string,
	)
	const { data, error } = await supabase
		.from('track')
		.insert({ title, artist, storage_path, duration_ms: duration_ms ?? null })
		.select('track_id')
		.single()
	if (error) return new Response(error.message, { status: 500 })
	return Response.json({ track_id: data.track_id })
}
