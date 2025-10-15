"use client"

import { useState, useCallback } from 'react'
import { AudioPlayer } from '@/components/player/AudioPlayer'
import { ReactionBar } from '@/components/reactions/ReactionBar'

export function ClientTest({ trackId, src, title }: { trackId: string; src: string; title?: string }) {
	const [positionMs, setPositionMs] = useState(0)
	const onPos = useCallback((ms: number) => setPositionMs(ms), [])
	return (
		<div className="space-y-6">
			<AudioPlayer trackId={trackId} src={src} title={title} onPositionChange={onPos} />
			<ReactionBar trackId={trackId} positionMs={positionMs} />
		</div>
	)
}
