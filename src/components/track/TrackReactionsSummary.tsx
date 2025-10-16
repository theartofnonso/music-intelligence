"use client"

import { useEffect, useMemo, useState } from 'react'

type RawEvent = { type: string; positionMs: number; payload?: any }

export default function TrackReactionsSummary({ trackId }: { trackId: string }) {
  const [events, setEvents] = useState<RawEvent[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/events/track/${trackId}`)
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

  const { totalLike, totalDislike, perSection } = useMemo(() => {
    const likes = events.filter((e) => e.type === 'arcade_reaction' && e.payload?.event === 'LIKE')
    const dislikes = events.filter((e) => e.type === 'arcade_reaction' && e.payload?.event === 'DISLIKE')
    const sectionMap = new Map<number, { like: number; dislike: number }>()
    for (const e of likes) {
      const k = Number(e.payload?.sectionIndex ?? -1)
      if (!sectionMap.has(k)) sectionMap.set(k, { like: 0, dislike: 0 })
      sectionMap.get(k)!.like++
    }
    for (const e of dislikes) {
      const k = Number(e.payload?.sectionIndex ?? -1)
      if (!sectionMap.has(k)) sectionMap.set(k, { like: 0, dislike: 0 })
      sectionMap.get(k)!.dislike++
    }
    const perSection = [...sectionMap.entries()].sort((a, b) => a[0] - b[0])
    return { totalLike: likes.length, totalDislike: dislikes.length, perSection }
  }, [events])

  const total = totalLike + totalDislike
  const likePct = total ? Math.round((totalLike / total) * 100) : 0
  const dislikePct = total ? Math.round((totalDislike / total) * 100) : 0

  return (
    <div className="space-y-3">
      {/* Summary chips */}
      <div className="flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-2 py-1 text-emerald-700">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
          <span>Likes</span>
          <span className="font-mono">{totalLike}</span>
          <span className="text-emerald-800/70">({likePct}%)</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-red-600/10 px-2 py-1 text-red-700">
          <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
          <span>Dislikes</span>
          <span className="font-mono">{totalDislike}</span>
          <span className="text-red-800/70">({dislikePct}%)</span>
        </span>
        {loading && <span className="text-muted-foreground">Loading…</span>}
      </div>

      {/* Per-section stack bars */}
      {perSection.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">By section</div>
          <div className="flex w-full items-center gap-2">
            {perSection.map(([idx, v]) => {
              const sTotal = v.like + v.dislike
              const lp = sTotal ? (v.like / sTotal) * 100 : 0
              const dp = 100 - lp
              return (
                <div key={idx} className="min-w-0 flex-1">
                  <div className="h-2 w-full overflow-hidden rounded bg-zinc-200">
                    <div className="h-full bg-emerald-500" style={{ width: `${lp}%` }} />
                    <div className="h-full bg-red-500" style={{ width: `${dp}%`, marginTop: '-0.5rem' }} />
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">S{idx + 1}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}


