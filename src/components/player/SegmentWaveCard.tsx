"use client"

import React from 'react'
import { Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  src: string
  startMs: number
  endMs: number
  title?: string
  subtitle?: string
  aggregates?: { lastReaction?: string | null; reactions?: number; skips?: number; replays?: number }
}

// Global single-play bus
const GLOBAL_EVENT = 'segment-wavecard:play'

export function SegmentWaveCard({ src, startMs, endMs, title, subtitle, aggregates }: Props) {
  const waveRef = React.useRef<HTMLDivElement | null>(null)
  type WaveHandle = {
    load: (src: string) => void
    on: (ev: string, cb: (...args: unknown[]) => void) => void
    play: (start?: number, end?: number) => void
    pause: () => void
    setTime?: (sec: number) => void
    unAll?: () => void
    destroy?: () => void
  }
  const wsRef = React.useRef<WaveHandle | null>(null)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const playEndRef = React.useRef<number | null>(null)
  const readyRef = React.useRef(false)

  // Setup Wavesurfer (stable, only on src change)
  React.useEffect(() => {
    let ws: WaveHandle | null = null
    let cancelled = false
    async function setup() {
      if (!waveRef.current || !src) return
      const WaveSurfer = (await import('wavesurfer.js')).default
      if (cancelled) return
      ws = WaveSurfer.create({
        container: waveRef.current,
        waveColor: '#d4d4d8',
        progressColor: '#000000',
        cursorColor: '#000000',
        normalize: true,
        height: 48,
        responsive: true,
        interact: false,
      }) as WaveHandle
      wsRef.current = ws
      ws.load(src)
      ws.on('ready', () => { readyRef.current = true })
      ws.on('pause', () => setIsPlaying(false))
      ws.on('finish', () => setIsPlaying(false))
      ws.on('audioprocess', (t: number) => {
        const end = playEndRef.current
        if (typeof end === 'number' && t >= end - 0.01) {
          try { ws?.pause() } catch {}
          setIsPlaying(false)
          playEndRef.current = null
        }
      })
    }
    setup()
    return () => {
      cancelled = true
      try { ws?.unAll?.(); ws?.destroy?.() } catch {}
      wsRef.current = null
    }
  }, [src])

  // Single play coordination
  const cardId = React.useId()
  React.useEffect(() => {
    const onGlobal = (ev: Event) => {
      const id = (ev as CustomEvent<string>).detail
      if (id !== cardId) {
        try { wsRef.current?.pause() } catch {}
        setIsPlaying(false)
      }
    }
    window.addEventListener(GLOBAL_EVENT, onGlobal as EventListener)
    return () => window.removeEventListener(GLOBAL_EVENT, onGlobal as EventListener)
  }, [cardId])

  
  const durationSec = Math.max(0, (endMs - startMs) / 1000)

  const handleToggle = async () => {
    const ws = wsRef.current
    if (!ws || !readyRef.current) return
    const startSec = Math.max(0, (startMs || 0) / 1000)
    const endSec = Math.max(startSec, (endMs || 0) / 1000)
    if (isPlaying) {
      try { ws.pause() } catch {}
      setIsPlaying(false)
      playEndRef.current = null
      return
    }
    // Notify others to pause
    window.dispatchEvent(new CustomEvent(GLOBAL_EVENT, { detail: cardId }))
    try { ws.setTime?.(startSec) } catch {}
    try { ws.play(startSec, endSec) } catch { try { ws.play() } catch {} }
    playEndRef.current = endSec
    setIsPlaying(true)
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {title && <p className="text-sm font-medium truncate">{title}</p>}
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <Button variant="outline" size="icon" onClick={handleToggle} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      </div>
      <div className="mt-2 relative h-14 w-full">
        <div ref={waveRef} className="absolute inset-0" />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{Math.max(0, Math.floor(startMs / 1000))}s – {Math.max(0, Math.floor(endMs / 1000))}s ({Math.max(1, Math.round(durationSec))}s)</span>
        {aggregates && (
          <span>
            {aggregates.lastReaction ?? '—'} · {aggregates.reactions ?? 0} reactions · {aggregates.skips ?? 0}/{aggregates.replays ?? 0}
          </span>
        )}
      </div>
      
    </div>
  )
}


