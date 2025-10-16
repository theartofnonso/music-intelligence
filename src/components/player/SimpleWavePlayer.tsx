"use client"

import React from 'react'
import { Play, Pause } from 'lucide-react'

export default function SimpleWavePlayer({ src }: { src: string }) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const waveRef = React.useRef<HTMLDivElement | null>(null)
  const wsRef = React.useRef<any>(null)

  const [isPlaying, setIsPlaying] = React.useState(false)
  const [durationMs, setDurationMs] = React.useState(0)
  const [currentMs, setCurrentMs] = React.useState(0)

  // Setup hidden audio element listeners
  React.useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onMeta = () => setDurationMs(Math.floor((el.duration || 0) * 1000))
    const onTime = () => setCurrentMs(Math.floor((el.currentTime || 0) * 1000))
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    return () => {
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
    }
  }, [src])

  // Setup Wavesurfer (waveform + seek)
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
      ws.on('seek', (progress: number) => {
        const el = audioRef.current
        if (!el || !durationMs) return
        const ms = Math.round(durationMs * progress)
        el.currentTime = Math.max(0, Math.min((durationMs / 1000) || 0, ms / 1000))
      })
    }
    setup()
    return () => {
      cancelled = true
      try { ws?.destroy() } catch {}
      wsRef.current = null
    }
  }, [src, durationMs])

  // Sync waveform to audio playback position
  React.useEffect(() => {
    const ws = wsRef.current
    if (!ws || !durationMs || durationMs <= 0) return
    const ratio = Math.max(0, Math.min(1, currentMs / durationMs))
    try { ws.seekTo(ratio) } catch {}
  }, [currentMs, durationMs])

  return (
    <div className="w-full">
      {/* Controls + waveform on one line */}
      <div className="flex items-center gap-3">
        <button
          className="grid h-10 w-10 place-items-center rounded-full bg-zinc-900 text-zinc-50 shadow-sm transition hover:bg-zinc-800 active:scale-95 cursor-pointer"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={async () => {
            const el = audioRef.current; if (!el) return
            if (el.paused) { try { await el.play() } catch {} } else { el.pause() }
          }}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <div className="flex-1">
          <div ref={waveRef} className="h-20 w-full" />
        </div>
      </div>

      <audio ref={audioRef} src={src} className="hidden" />
    </div>
  )
}


