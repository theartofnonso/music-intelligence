"use client"

import React from 'react'
import { Play, Pause } from 'lucide-react'

export default function SimpleWavePlayer({ src }: { src: string }) {
  const waveRef = React.useRef<HTMLDivElement | null>(null)
  const wsRef = React.useRef<any>(null)
  const stopTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Setup Wavesurfer (waveform only)
  React.useEffect(() => {
    let ws: any
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
        barWidth: 2,
        barGap: 10,
        height: 84,
        responsive: true,
        interact: true,
      })
      wsRef.current = ws
      ws.load(src)
      // react to external snippet play events to visualize position
      const onPlaySnippet = (ev: Event) => {
        const detail = (ev as CustomEvent<{ ms: number; durMs?: number }>).detail
        if (!detail || !wsRef.current) return
        const { ms, durMs = 3000 } = detail
        const seconds = Math.max(0, (ms || 0) / 1000)
        try {
          wsRef.current.setTime?.(seconds)
        } catch {
          const dur = wsRef.current.getDuration?.() || 1
          wsRef.current.seekTo(Math.max(0, Math.min(1, seconds / dur)))
        }
        try { wsRef.current.play() } catch {}
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
        stopTimerRef.current = setTimeout(() => { try { wsRef.current.pause() } catch {} }, Math.max(200, durMs))
      }
      window.addEventListener('play-snippet', onPlaySnippet as EventListener)
      ;(ws as any).__onPlaySnippet = onPlaySnippet
    }
    setup()
    return () => {
      cancelled = true
      if ((ws as any)?.__onPlaySnippet) {
        window.removeEventListener('play-snippet', (ws as any).__onPlaySnippet)
      }
      try { ws?.destroy() } catch {}
      wsRef.current = null
    }
  }, [src])

  return (
    <div className="w-full">
      {/* Waveform only */}
      <div className="relative h-20 w-full">
        <div ref={waveRef} className="absolute inset-0" />
      </div>
    </div>
  )
}


