"use client"

import { useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'

type RawEvent = { type: string; positionMs?: number; payload?: any }

function fmtMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export default function ClientEventsBreakdown({ src, events: initialEvents }: { src: string; events: RawEvent[] }) {
  const [events] = useState<RawEvent[]>(initialEvents)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)


  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Reaction Analysis</h2>
      </div>
      <div className="rounded border">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[520px]">
            <div className="grid grid-cols-4 border-b px-3 py-2 text-xs font-semibold">
              <div>Action</div>
              <div>Time</div>
              <div>Event</div>
              <div>Details</div>
            </div>
            <div className="divide-y text-xs">
              {events.map((e, i) => {
                const tsMs = e.positionMs ?? e.payload?.t ?? 0
                const t = fmtMs(tsMs)
                const segStart = typeof e.payload?.segmentStartMs === 'number' ? e.payload.segmentStartMs : undefined
                const segEnd = typeof e.payload?.segmentEndMs === 'number' ? e.payload.segmentEndMs : undefined
                const segStr = segStart != null && segEnd != null ? `Seg ${fmtMs(segStart)}–${fmtMs(segEnd)}` : ''
                let details = '—'
                if (e.type === 'LIKE' || e.type === 'DISLIKE' || e.type === 'NEUTRAL') {
                  details = segStr || (e.payload?.event ?? e.type)
                }
                if (e.type === 'SKIP') {
                  const toMs = e.payload?.toMs ?? 0
                  details = [`→ ${fmtMs(toMs)}`, segStr].filter(Boolean).join(' • ')
                }
                if (e.type === 'REPLAY') {
                  const toMs = e.payload?.toMs ?? 0
                  details = [`← ${fmtMs(toMs)}`, segStr].filter(Boolean).join(' • ')
                }
                return (
                  <div key={`ev-${i}`} className="grid grid-cols-4 items-center px-3 py-2">
                    <div>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className={`${playingIndex === i && isPlaying ? 'bg-accent/60' : ''}`}
                        aria-label={`${playingIndex === i && isPlaying ? 'Pause' : 'Play'} snippet at ${t}`}
                        disabled={isPlaying && playingIndex !== i}
                        onClick={() => {
                          const el = audioRef.current
                          if (!el) return
                          if (playingIndex === i && isPlaying) { try { el.pause() } catch { }; return }
                          if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
                          // Prefer preview from the segment start when available
                          const startMs = typeof segStart === 'number' ? segStart : Math.max(0, tsMs - 1000)
                          const endMs = typeof segEnd === 'number' ? Math.min(segEnd, startMs + 4000) : startMs + 3000
                          el.currentTime = startMs / 1000
                          void el.play()
                          setPlayingIndex(i)
                          setIsPlaying(true)
                          stopTimerRef.current = setTimeout(() => { try { el.pause() } catch { } }, Math.max(500, endMs - startMs))
                          window.dispatchEvent(new CustomEvent('play-snippet', { detail: { ms: startMs, durMs: endMs - startMs } }))
                        }}
                      >
                        {playingIndex === i && isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div>{t}</div>
                    <div>{(e.payload?.event ?? e.type).toString().toUpperCase()}</div>
                    <div>{details}</div>
                  </div>
                )
              })}
              {events.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">No events yet for this track.</div>
              )}
            </div>
          </div>
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


