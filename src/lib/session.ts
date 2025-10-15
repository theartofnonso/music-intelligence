export function getOrCreateSessionId(): string {
	if (typeof window === 'undefined') return 'server'
	const key = 'studeeo_session_id'
	let id = localStorage.getItem(key)
	if (!id) {
		id = crypto.randomUUID()
		localStorage.setItem(key, id)
	}
	return id
}
