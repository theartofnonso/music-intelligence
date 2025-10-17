"use client"

import { useEffect, useMemo, useState } from 'react'
import { generatePerSegmentInsightsAction } from '../actions'
import { SegmentWaveCard } from '@/components/player/SegmentWaveCard'

type SegmentPayload = { t?: number; segmentIndex?: number; segmentStartMs?: number; segmentEndMs?: number }
type RawEvent = { type: string; positionMs?: number; payload?: SegmentPayload }
type Props = { src: string; events: RawEvent[] }

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
  reactionsCount: number
  likesCount: number
  neutralCount: number
  dislikesCount: number
  skipsInto: number
  replaysInto: number
}

export default function ClientEventsBreakdown({ src, events: initialEvents }: Props) {
  const [events] = useState<RawEvent[]>(initialEvents)
  const [segComments, setSegComments] = useState<Record<number, string[]> | null>(null)
  const [loadingSegComments, setLoadingSegComments] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoadingSegComments(true)
        const perSeg = await generatePerSegmentInsightsAction(events)
        if (!cancelled) setSegComments(perSeg ?? {})
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingSegComments(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [events])

  const segments: SegmentInfo[] = useMemo(() => {
    const map = new Map<number, SegmentInfo>()
    for (const e of events) {
      const idx = (e.payload?.segmentIndex ?? -1) as number
      const startMs = (e.payload?.segmentStartMs ?? -1) as number
      const endMs = (e.payload?.segmentEndMs ?? -1) as number
      if (idx < 0 || startMs < 0 || endMs < 0) continue
      if (!map.has(idx)) {
        map.set(idx, { idx, startMs, endMs, reactionsCount: 0, likesCount: 0, neutralCount: 0, dislikesCount: 0, skipsInto: 0, replaysInto: 0 })
      }
      const seg = map.get(idx)!
      const isReactionType = (t: string): t is 'LIKE' | 'DISLIKE' | 'NEUTRAL' => t === 'LIKE' || t === 'DISLIKE' || t === 'NEUTRAL'
      if (isReactionType(e.type)) {
        seg.reactionsCount += 1
        if (e.type === 'LIKE') seg.likesCount += 1
        if (e.type === 'NEUTRAL') seg.neutralCount += 1
        if (e.type === 'DISLIKE') seg.dislikesCount += 1
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
          <div key={`segwrap-${seg.idx}`} className="space-y-1">
            <SegmentWaveCard
              key={`segcard-${seg.idx}`}
              src={src}
              startMs={seg.startMs}
              endMs={seg.endMs}
              title={`Segment ${seg.idx + 1}`}
              subtitle={`${fmtMs(seg.startMs)}–${fmtMs(seg.endMs)}`}
              aggregates={{ reactions: seg.reactionsCount, skips: seg.skipsInto, replays: seg.replaysInto, likes: seg.likesCount, neutral: seg.neutralCount, dislikes: seg.dislikesCount }}
            />
            {loadingSegComments && (
              <div className="ml-2 rounded-md border p-2 text-[11px] text-muted-foreground">Generating insights…</div>
            )}
            {!!segComments?.[seg.idx]?.length && !loadingSegComments && (
              <div className="ml-2 rounded-md border p-2 text-[11px] text-muted-foreground">
                <ul className="list-disc pl-4 space-y-0.5">
                  {segComments[seg.idx].map((c, i) => (
                    <li key={`segc-${seg.idx}-${i}`}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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

