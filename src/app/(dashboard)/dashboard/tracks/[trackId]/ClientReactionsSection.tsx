"use client"

import TrackReactionsSummary from '@/components/track/TrackReactionsSummary'

export default function ClientReactionsSection({ trackId }: { trackId: string }) {
  return <TrackReactionsSummary trackId={trackId} />
}


