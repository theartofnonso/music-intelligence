type EventItem = { sessionId: string; trackId: string; type: string; positionMs: number; clientTs: number; seq: number; payload?: unknown }

let seq = 0
const buf: EventItem[] = []
let t: ReturnType<typeof setTimeout> | null = null

export function enqueue(evt: Omit<EventItem, 'seq'>) {
	buf.push({ ...evt, seq: ++seq })
	if (buf.length >= 25) flush()
	if (!t) t = setTimeout(flush, 3000)
}

export async function flush() {
	if (!buf.length) return
	const events = buf.splice(0, buf.length)
	const body = JSON.stringify({ events })
	const url = '/api/events/batch'
	const nav = (typeof navigator !== 'undefined' ? (navigator as Navigator & { sendBeacon?: (url: string, data?: BodyInit | null) => boolean }) : undefined)
	const ok = nav?.sendBeacon?.(url, body) ?? false
	if (!ok)
		await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body,
			keepalive: true,
		})
	if (t) {
		clearTimeout(t)
		t = null
	}
}

export function attachLifecycleFlush() {
	if (typeof window === 'undefined') return
	addEventListener('visibilitychange', () => {
		if (document.visibilityState !== 'visible') flush()
	})
	addEventListener('pagehide', () => flush())
	addEventListener('beforeunload', () => flush())
}
