"use client"

import { useMemo, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'

type RawEvent = { type: string; positionMs?: number; payload?: any }

function fmtMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

type SegmentInfo = {
  idx: number
  startMs: number
  endMs: number
  lastReaction: 'LIKE' | 'DISLIKE' | 'NEUTRAL' | null
  reactionsCount: number
  skipsInto: number
  replaysInto: number
}

export default function ClientEventsBreakdown({ src, events: initialEvents }: { src: string; events: RawEvent[] }) {
  const [events] = useState<RawEvent[]>(initialEvents)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const segments: SegmentInfo[] = useMemo(() => {
    const map = new Map<number, SegmentInfo>()
    for (const e of events) {
      const idx = (e.payload?.segmentIndex ?? -1) as number
      const startMs = (e.payload?.segmentStartMs ?? -1) as number
      const endMs = (e.payload?.segmentEndMs ?? -1) as number
      if (idx < 0 || startMs < 0 || endMs < 0) continue
      if (!map.has(idx)) {
        map.set(idx, { idx, startMs, endMs, lastReaction: null, reactionsCount: 0, skipsInto: 0, replaysInto: 0 })
      }
      const seg = map.get(idx)!
      if (e.type === 'LIKE' || e.type === 'DISLIKE' || e.type === 'NEUTRAL') {
        seg.reactionsCount += 1
        // Use latest by time 't' as lastReaction
        const prevT = (events.findLast?.((x: any) => (x.payload?.segmentIndex ?? -1) === idx && (x.type === 'LIKE' || x.type === 'DISLIKE' || x.type === 'NEUTRAL'))?.payload?.t) ?? seg.startMs
        if (typeof e.payload?.t === 'number' && e.payload.t >= prevT) seg.lastReaction = e.type as any
      }
      if (e.type === 'SKIP') seg.skipsInto += 1
      if (e.type === 'REPLAY') seg.replaysInto += 1
    }
    return Array.from(map.values()).sort((a, b) => a.idx - b.idx)
  }, [events])

  const onPreview = (startMs: number, endMs: number, key: string) => {
    const el = audioRef.current
    if (!el) return
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null }
    try { el.pause() } catch { }
    el.currentTime = Math.max(0, startMs / 1000)
    void el.play()
    setPlayingKey(key)
    setIsPlaying(true)
    const dur = Math.max(600, Math.min(4000, (endMs - startMs) || 2000))
    stopTimerRef.current = setTimeout(() => { try { el.pause() } catch { } }, dur)
    window.dispatchEvent(new CustomEvent('play-snippet', { detail: { ms: startMs, durMs: dur } }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Reaction Analysis</h2>
      </div>

      {/* Segment timeline */}
      <section className="rounded border p-3">
        <h3 className="mb-2 text-xs font-medium text-muted-foreground">Timeline</h3>
        <div className="w-full overflow-x-auto">
          <div className="flex min-w-[560px] gap-2">
            {segments.map((seg) => {
              const color = seg.lastReaction === 'LIKE' ? 'bg-emerald-500' : seg.lastReaction === 'DISLIKE' ? 'bg-destructive' : seg.lastReaction === 'NEUTRAL' ? 'bg-secondary' : 'bg-muted'
              const key = `seg-${seg.idx}`
              return (
                <button
                  key={key}
                  className={`flex min-w-[88px] flex-col items-start justify-center rounded-md border px-2 py-2 text-left ${color} ${seg.lastReaction ? 'text-white' : ''}`}
                  onClick={() => onPreview(seg.startMs, seg.endMs, key)}
                  aria-label={`Preview segment ${seg.idx + 1}`}
                >
                  <span className="text-[10px] opacity-90">Seg {seg.idx + 1}</span>
                  <span className="text-[11px] font-medium">{fmtMs(seg.startMs)}–{fmtMs(seg.endMs)}</span>
                  <span className="mt-1 text-[10px] opacity-90">{seg.lastReaction ?? 'No reaction'}</span>
                </button>
              )
            })}
            {segments.length === 0 && (
              <div className="text-xs text-muted-foreground">No segments yet.</div>
            )}
          </div>
        </div>
      </section>

      {/* Segment summary table */}
      <section className="rounded border p-3">
        <h3 className="mb-2 text-xs font-medium text-muted-foreground">Summary</h3>
        <div className="w-full overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-5 border-b px-3 py-2 text-xs font-semibold">
              <div>Segment</div>
              <div>Window</div>
              <div>Last</div>
              <div>Reactions</div>
              <div>Skip/Replay</div>
            </div>
            <div className="divide-y text-xs">
              {segments.map((seg) => (
                <div key={`row-${seg.idx}`} className="grid grid-cols-5 items-center px-3 py-2">
                  <div>#{seg.idx + 1}</div>
                  <div>{fmtMs(seg.startMs)}–{fmtMs(seg.endMs)}</div>
                  <div>{seg.lastReaction ?? '—'}</div>
                  <div>{seg.reactionsCount}</div>
                  <div>{seg.skipsInto}/{seg.replaysInto}</div>
                </div>
              ))}
              {segments.length === 0 && (
                <div className="px-3 py-4 text-xs text-muted-foreground">No data to summarize.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Hidden audio element for snippets */}
      <audio
        ref={audioRef}
        src={src}
        className="hidden"
        onPlay={() => setIsPlaying(true)}
        onPause={() => { setIsPlaying(false); setPlayingKey(null); if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null } }}
        onEnded={() => { setIsPlaying(false); setPlayingKey(null); if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null } }}
      />
    </div>
  )
}

