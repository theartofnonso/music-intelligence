"use client"

import SimpleWavePlayer from '@/components/player/SimpleWavePlayer'
import { mapRawEventsToReviewEvents } from '@/lib/curves'
import { useEffect, useState } from 'react'

type RawEvent = { type: string; positionMs: number; payload?: any }

export default function ClientPlayerSection({ src, trackId }: { src: string; trackId: string }) {
  const [events, setEvents] = useState<RawEvent[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // TODO: replace with real API when available
        const res = await fetch(`/api/events/track/${trackId}`)
        if (!res.ok) throw new Error('failed to fetch events')
        const json = await res.json()
        if (alive) setEvents(json.events ?? [])
      } catch {
        if (alive) setEvents([])
      }
    })()
    return () => { alive = false }
  }, [trackId])

  const reviewEvents = mapRawEventsToReviewEvents(events as any)
  const markers = reviewEvents.map((e) => ({
    tMs: e.t,
    color: e.type === 'like' ? '#16a34a' : e.type === 'dislike' ? '#ef4444' : e.type === 'replay' ? '#10b981' : '#ef4444',
  }))
  return <SimpleWavePlayer src={src} />
}
