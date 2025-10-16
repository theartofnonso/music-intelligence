"use client"

import { useEffect, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'

type RawEvent = { type: string; positionMs: number; payload?: any }

function fmtMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export default function ClientEventsBreakdown({ trackId, src }: { trackId: string; src: string }) {
  const [events, setEvents] = useState<RawEvent[]>([])
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/events/track/${trackId}`, { cache: 'no-store' })
        if (!res.ok) throw new Error('failed to fetch events')
        const json = await res.json()
        if (alive) setEvents(json.events ?? [])
      } catch {
        if (alive) setEvents([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [trackId])

  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Reaction Analysis</h2>
        {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
      </div>
      <div className="rounded border">
        <div className="grid grid-cols-4 border-b px-3 py-2 text-xs font-semibold">
          <div>Action</div>
          <div>Time</div>
          <div>Event</div>
          <div>Details</div>
        </div>
        <div className="divide-y text-xs">
          {events.map((e, i) => {
            const t = fmtMs(e.positionMs)
            let details = '—'
            if (e.type === 'arcade_reaction') details = e.payload?.event ?? '—'
            if (e.type === 'arcade_skip') details = `→ ${fmtMs(e.payload?.toMs ?? 0)}`
            if (e.type === 'arcade_replay') details = `← ${fmtMs(e.payload?.toMs ?? 0)}`
            return (
              <div key={`ev-${i}`} className="grid grid-cols-4 items-center px-3 py-2">
                <div>
                  <button
                    className={`rounded p-1 ${playingIndex === i && isPlaying ? 'bg-accent/60' : 'hover:bg-accent/40'} disabled:opacity-50`}
                    aria-label={`${playingIndex === i && isPlaying ? 'Pause' : 'Play'} snippet at ${t}`}
                    disabled={isPlaying && playingIndex !== i}
                    onClick={() => {
                      const el = audioRef.current
                      if (!el) return
                      if (playingIndex === i && isPlaying) { try { el.pause() } catch {}; return }
                      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
                      const startMs = Math.max(0, e.positionMs - 1000)
                      const endMs = startMs + 3000
                      el.currentTime = startMs / 1000
                      void el.play()
                      setPlayingIndex(i)
                      setIsPlaying(true)
                      stopTimerRef.current = setTimeout(() => { try { el.pause() } catch {} }, Math.max(500, endMs - startMs))
                      // notify waveform to visualize
                      window.dispatchEvent(new CustomEvent('play-snippet', { detail: { ms: startMs, durMs: endMs - startMs } }))
                    }}
                  >
                    {playingIndex === i && isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div>{t}</div>
                <div>{e.type.replace('arcade_', '').toUpperCase()}</div>
                <div>{details}</div>
              </div>
            )
          })}
          {events.length === 0 && !loading && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">No events yet for this track.</div>
          )}
        </div>
      </div>
      {/* Hidden audio element for snippets */}
      <audio
        ref={audioRef}
        src={src}
        className="hidden"
        onPlay={() => setIsPlaying(true)}
        onPause={() => { setIsPlaying(false); setPlayingIndex(null); if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null } }}
        onEnded={() => { setIsPlaying(false); setPlayingIndex(null); if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null } }}
      />
    </div>
  )
}


