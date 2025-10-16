"use client"

import React from 'react'
import { Play, Pause } from 'lucide-react'

export default function LiteAudioPlayer({ src }: { src: string }) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = React.useState(false)

  React.useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
    }
  }, [src])

  return (
    <div className="w-full max-w-[420px] mx-auto grid place-items-center">
      <button
        className="grid h-16 w-16 place-items-center rounded-full bg-zinc-900 text-zinc-50 shadow-sm transition hover:bg-zinc-800 active:scale-95 cursor-pointer"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        onClick={async () => {
          const el = audioRef.current; if (!el) return
          if (el.paused) { try { await el.play() } catch {} } else { el.pause() }
        }}
      >
        {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
      </button>
      <audio ref={audioRef} src={src} className="hidden" />
    </div>
  )
}


