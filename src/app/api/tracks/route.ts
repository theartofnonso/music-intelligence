import { createClient } from '@/lib/supabase/server'

export async function GET() {
	const supabase = await createClient()
	const { data: user } = await supabase.auth.getUser()
	const { data, error } = await supabase
		.from('track')
		.select('id,title,artist,storage_path,created_at')
		.eq('owner_id', user.user?.id ?? '')
		.order('created_at', { ascending: false })
	if (error) return new Response(error.message, { status: 500 })
	return Response.json({ tracks: data })
}
