"use client"

import React from 'react'
import AudioPlayer from '@/components/player/AudioPlayer'

export default function TrackAnalysisPlayer({ src }: { src: string }) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [currentMs, setCurrentMs] = React.useState(0)
  const [durationMs, setDurationMs] = React.useState(0)
  const [isPlaying, setIsPlaying] = React.useState(false)

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

  return (
    <div className="w-full">
      <AudioPlayer
        src={src}
        currentMs={currentMs}
        durationMs={durationMs}
        isPlaying={isPlaying}
        onTogglePlay={async () => {
          const el = audioRef.current; if (!el) return
          if (el.paused) { try { await el.play() } catch {} } else { el.pause() }
        }}
        onSeek={(ms) => {
          const el = audioRef.current; if (!el) return
          el.currentTime = Math.max(0, Math.min((durationMs / 1000) || 0, ms / 1000))
        }}
      />
      <audio ref={audioRef} src={src} className="hidden" />
    </div>
  )
}


