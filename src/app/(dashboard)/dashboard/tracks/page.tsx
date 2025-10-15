import { TrackRowActions } from '@/components/dashboard/TrackRowActions'
import Link from 'next/link'

type Track = { track_id: string; title: string | null }

async function fetchTracks(): Promise<{ tracks: Track[] }> {
	const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/tracks`, { cache: 'no-store' })
	return res.json()
}

export default async function TracksPage() {
	const data = await fetchTracks()
	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">Tracks</h1>
			<ul className="text-sm space-y-1">
				{(data?.tracks ?? []).map((t: Track) => (
					<li key={t.track_id} className="flex items-center justify-between gap-4">
						<span className="truncate"><Link href={`/dashboard/tracks/${t.track_id}`} className="underline">{t.title ?? 'Untitled'}</Link></span>
						<TrackRowActions trackId={t.track_id} />
					</li>
				))}
			</ul>
		</div>
	)
}
