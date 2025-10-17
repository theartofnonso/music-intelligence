"use client"

import { useMemo, useState } from 'react'
import { SegmentWaveCard } from '@/components/player/SegmentWaveCard'

type SegmentPayload = { t?: number; segmentIndex?: number; segmentStartMs?: number; segmentEndMs?: number }
type RawEvent = { type: string; positionMs?: number; payload?: SegmentPayload }

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
      const isReactionType = (t: string): t is 'LIKE' | 'DISLIKE' | 'NEUTRAL' => t === 'LIKE' || t === 'DISLIKE' || t === 'NEUTRAL'
      if (isReactionType(e.type)) {
        seg.reactionsCount += 1
        // Use latest by time 't' as lastReaction
        const prevT = (events.findLast?.((x: RawEvent) => (x.payload?.segmentIndex ?? -1) === idx && isReactionType(x.type))?.payload?.t) ?? seg.startMs
        if (typeof e.payload?.t === 'number' && e.payload.t >= prevT) seg.lastReaction = e.type
      }
      if (e.type === 'SKIP') seg.skipsInto += 1
      if (e.type === 'REPLAY') seg.replaysInto += 1
    }
    return Array.from(map.values()).sort((a, b) => a.idx - b.idx)
  }, [events])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Reaction Analysis</h2>
      </div>

      {/* Segment players (lite waveform + play only) */}
      <section className="space-y-2">
        {segments.map((seg) => (
          <SegmentWaveCard
            key={`segcard-${seg.idx}`}
            src={src}
            startMs={seg.startMs}
            endMs={seg.endMs}
            title={`Segment ${seg.idx + 1}`}
            subtitle={`${fmtMs(seg.startMs)}–${fmtMs(seg.endMs)}`}
            aggregates={{ lastReaction: seg.lastReaction, reactions: seg.reactionsCount, skips: seg.skipsInto, replays: seg.replaysInto }}
          />
        ))}
        {segments.length === 0 && (
          <div className="rounded-md border p-4 text-xs text-muted-foreground">
            No analysis available.
          </div>
        )}
      </section>      
    </div>
  )
}

