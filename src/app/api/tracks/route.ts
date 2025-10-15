import { createClient } from '@supabase/supabase-js'

export async function GET() {
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL as string,
		process.env.SUPABASE_SERVICE_ROLE_KEY as string,
	)
	const { data, error } = await supabase
		.from('track')
		.select('track_id,title,artist,storage_path,created_at')
		.order('created_at', { ascending: false })
	if (error) return new Response(error.message, { status: 500 })
	return Response.json({ tracks: data })
}
