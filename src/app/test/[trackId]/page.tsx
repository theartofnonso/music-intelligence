import { ClientTest } from './ClientTest'

async function fetchTrack(trackId: string) {
	const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/tracks/${trackId}`, { cache: 'no-store' })
	if (!res.ok) return null
	const json = await res.json()
	return json.track as { track_id: string; title: string | null; storage_path: string | null }
}

export default async function Page({ params }: { params: { trackId: string } }) {
	const track = await fetchTrack(params.trackId)
	if (!track?.storage_path) {
		return <div className="p-6">Track not found or missing URL.</div>
	}
	return (
		<div className="max-w-2xl mx-auto p-6 space-y-6">
			<h1 className="text-xl font-semibold">{track.title ?? 'Track'}</h1>
			<ClientTest trackId={track.track_id} src={track.storage_path} title={track.title ?? undefined} />
		</div>
	)
}
