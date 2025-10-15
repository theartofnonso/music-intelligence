"use client"

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { getOrCreateSessionId } from '@/lib/session'
import { enqueue, attachLifecycleFlush } from '@/lib/eventBuffer'

type Props = {
	trackId: string
	src: string
	title?: string
	durationMs?: number
	onPositionChange?: (ms: number) => void
}

export function AudioPlayer({ trackId, src, title, onPositionChange }: Props) {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const waveRef = useRef<HTMLDivElement | null>(null)
    const wsRef = useRef<any>(null)
	const [positionMs, setPositionMs] = useState(0)
	const sessionId = getOrCreateSessionId()

	useEffect(() => {
		attachLifecycleFlush()
	}, [])

	const emit = (type: string, payload?: unknown) => {
		enqueue({
			sessionId,
			trackId,
			type,
			positionMs,
			clientTs: Date.now(),
			payload,
		})
	}

	useEffect(() => {
		const el = audioRef.current
		if (!el) return
        // Create or recreate WaveSurfer when src changes
        if (wsRef.current) {
            try { wsRef.current.destroy() } catch {}
            wsRef.current = null
        }
        if (waveRef.current) {
            (async () => {
                try {
                    const mod = await import('wavesurfer.js')
                    const WaveSurfer = (mod as any).default ?? mod
                    wsRef.current = WaveSurfer.create({
                        container: waveRef.current,
                        waveColor: getComputedStyle(document.documentElement).getPropertyValue('--color-foreground') || '#000',
                        progressColor: 'currentColor',
                        cursorColor: 'transparent',
                        height: 64,
                        barWidth: 2,
                        barGap: 1,
                        normalize: true,
                    })
                    wsRef.current.load(src)
                } catch {}
            })()
        }
		const onPlay = () => emit('play')
		const onPause = () => emit('pause')
		const onEnded = () => emit('ended')
		let lastTick = 0
		const onTime = () => {
			const ms = Math.floor(el.currentTime * 1000)
			setPositionMs(ms)
			onPositionChange?.(ms)
			if (ms - lastTick >= 500) {
				lastTick = ms
				emit('timeupdate_tick')
			}
		}
		const onSeeked = () => {
			const ms = Math.floor(el.currentTime * 1000)
			emit('seek', { toMs: ms })
			onPositionChange?.(ms)
		}
		el.addEventListener('play', onPlay)
		el.addEventListener('pause', onPause)
		el.addEventListener('ended', onEnded)
		el.addEventListener('timeupdate', onTime)
		el.addEventListener('seeked', onSeeked)
		return () => {
			el.removeEventListener('play', onPlay)
			el.removeEventListener('pause', onPause)
			el.removeEventListener('ended', onEnded)
			el.removeEventListener('timeupdate', onTime)
			el.removeEventListener('seeked', onSeeked)
            if (wsRef.current) {
                try { wsRef.current.destroy() } catch {}
                wsRef.current = null
            }
		}
    }, [trackId, onPositionChange, src])

	const skipSeconds = (sec: number) => {
		const el = audioRef.current
		if (!el) return
		const from = el.currentTime
		el.currentTime = Math.max(0, from + sec)
		emit(sec > 0 ? 'skip_forward' : 'skip_backward', { seconds: sec })
	}

	return (
		<div className="w-full space-y-3">
			<div className="flex items-center justify-between">
				<div className="text-sm font-medium">{title ?? 'Track'}</div>
				<div className="text-xs tabular-nums">{(positionMs / 1000).toFixed(1)}s</div>
			</div>
            <audio ref={audioRef} src={src} controls className="w-full" />
            <div ref={waveRef} className="w-full h-16 text-foreground/90" />
			<div className="flex items-center gap-2">
				<Button variant="secondary" onClick={() => skipSeconds(-5)}>-5s</Button>
				<Button variant="secondary" onClick={() => skipSeconds(5)}>+5s</Button>
			</div>
			<div className="py-2">
				<Slider min={0} max={100} step={1} value={[0]} onValueChange={() => {}} aria-label="dummy" />
			</div>
		</div>
	)
}
