import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
	const reqId = (globalThis as any).crypto?.randomUUID?.() ?? String(Date.now())
	const startedAt = Date.now()

	try {
		const body = await req.json()
		const { title, artist, storage_path, duration_ms } = body ?? {}
		console.log(`[tracks/create][${reqId}] request`, {
			title: typeof title === 'string' ? title : undefined,
			artist: typeof artist === 'string' ? artist : undefined,
			storage_path_present: Boolean(storage_path),
			duration_ms: typeof duration_ms === 'number' ? duration_ms : undefined,
		})

		if (!storage_path) {
			console.warn(`[tracks/create][${reqId}] missing storage_path`)
			return new Response('storage_path required', { status: 400 })
		}

		const supabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL as string,
			process.env.SUPABASE_SERVICE_ROLE_KEY as string,
		)
		console.log(`[tracks/create][${reqId}] inserting track`)
		const { data, error } = await supabase
			.from('track')
			.insert({ title, artist, storage_path, duration_ms: duration_ms ?? null })
			.select('track_id,title,artist,storage_path,created_at')
			.single()
		if (error) {
			console.error(`[tracks/create][${reqId}] insert error`, { message: error.message })
			return new Response(error.message, { status: 500 })
		}
		const tookMs = Date.now() - startedAt
		console.log(`[tracks/create][${reqId}] success`, { track_id: data.track_id, tookMs })
		return Response.json(data)
	} catch (err) {
		console.error(`[tracks/create][${reqId}] unhandled`, err)
		return new Response('Internal Server Error', { status: 500 })
	}
}
