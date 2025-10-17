import { createSecretClient } from '@/lib/supabase/server'

export async function GET() {
	const supabase = createSecretClient()
	const { data, error } = await supabase
		.from('track')
		.select('id,title,artist,storage_path,created_at')
		.order('created_at', { ascending: false })
	if (error) return new Response(error.message, { status: 500 })
	return Response.json({ tracks: data })
}
