import { createClient, createSecretClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
    const reqId = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID?.() ?? String(Date.now())

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

        // Get user id via user-auth client (requires this route to run with user session)
        const userScoped = await createClient()
        const { data: userData } = await userScoped.auth.getUser()
        if (!userData?.user) return new Response('Unauthorized', { status: 401 })
        const supabase = createSecretClient()
        const { data, error } = await supabase
			.from('track')
            .insert({ title, artist, storage_path, duration_ms: duration_ms ?? null, owner_id: userData.user.id })
            .select('id,title,artist,storage_path,created_at')
			.single()
		if (error) {
			return new Response(error.message, { status: 500 })
		}
		return Response.json(data)
    } catch (err: unknown) {
        console.error(`[tracks/create][${reqId}] unhandled`, err)
		return new Response('Internal Server Error', { status: 500 })
	}
}
