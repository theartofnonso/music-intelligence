"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { enqueue } from '@/lib/eventBuffer'
import { getOrCreateSessionId } from '@/lib/session'

type Props = { trackId: string; positionMs: number }

const EMOJIS = ['🔥', '😊', '😐', '😢', '⏭️']

export function ReactionBar({ trackId, positionMs }: Props) {
	const sessionId = getOrCreateSessionId()
	const [slider, setSlider] = useState<number[]>([50])

	const react = (emoji: string) => {
		enqueue({
			sessionId,
			trackId,
			type: 'reaction_tap',
			positionMs,
			clientTs: Date.now(),
			payload: { emoji },
		})
	}

	const onSlider = (v: number[]) => {
		setSlider(v)
		enqueue({
			sessionId,
			trackId,
			type: 'sentiment_slider',
			positionMs,
			clientTs: Date.now(),
			payload: { value: (v[0] - 50) / 50 },
		})
	}

	return (
		<div className="flex items-center gap-2">
			{EMOJIS.map((e) => (
				<Button key={e} size="sm" variant="outline" onClick={() => react(e)}>
					{e}
				</Button>
			))}
			<div className="w-40">
				<Slider min={0} max={100} step={1} value={slider} onValueChange={onSlider} aria-label="sentiment" />
			</div>
		</div>
	)
}
