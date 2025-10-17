export type SegmentPayload = { t?: number; segmentIndex?: number; segmentStartMs?: number; segmentEndMs?: number }
export type RawEvent = { type: string; positionMs?: number; payload?: SegmentPayload }

export type InsightsResult = {
    badges: Record<number, string[]>
}

export function generateSegmentInsights(events: RawEvent[]): InsightsResult {
    // Canonical categories and deterministic dominance order for tie-breaking
    const CATEGORIES = ['LIKE', 'DISLIKE', 'NEUTRAL'] as const
    type EventCategory = typeof CATEGORIES[number]
    // Positive signals first, then negative, then neutral for insight wording
    const DOMINANCE_ORDER: EventCategory[] = ['LIKE', 'DISLIKE', 'NEUTRAL']

    // group events by segmentIndex
    const bySeg = new Map<number, RawEvent[]>()
    for (const e of events) {
        const idx = (e.payload?.segmentIndex ?? -1) as number
        if (idx < 0) continue
        if (!bySeg.has(idx)) bySeg.set(idx, [])
        bySeg.get(idx)!.push(e)
    }
    // Track counts per segment for overall insights
    const segmentCounts = new Map<number, { LIKE: number; DISLIKE: number; NEUTRAL: number }>()
    
    for (const [idx, segEvents] of bySeg.entries()) {
        // Count event types
        const counts = {
            LIKE: 0,
            DISLIKE: 0,
            NEUTRAL: 0,
        }
        
        for (const event of segEvents) {
            const type = event.type.toUpperCase()
            if (type === 'SUPER_LIKE') {
                // Treat super like as double like without separate surfacing
                counts.LIKE += 2
            } else if (type in counts) {
                counts[type as keyof typeof counts]++
            }
        }
        
        segmentCounts.set(idx, counts)
        
        // keep counts only (no per-segment insight strings)
    }
    
    // Generate badges for segments with most engagement (tie-aware)
    const badges: Record<number, string[]> = {}
    
    if (segmentCounts.size > 0) {
        // Compute maxima per category (first pass)
        let maxLikes = 0, maxDislikes = 0
        for (const counts of segmentCounts.values()) {
            if (counts.LIKE > maxLikes) maxLikes = counts.LIKE
            if (counts.DISLIKE > maxDislikes) maxDislikes = counts.DISLIKE
        }
        // Identify unique leaders (second pass). If tie, no badge for that category.
        const likeLeaders: number[] = []
        const dislikeLeaders: number[] = []
        for (const [idx, counts] of segmentCounts.entries()) {
            if (maxLikes > 0 && counts.LIKE === maxLikes) likeLeaders.push(idx)
            if (maxDislikes > 0 && counts.DISLIKE === maxDislikes) dislikeLeaders.push(idx)
        }
        if (likeLeaders.length === 1) {
            const idx = likeLeaders[0]
            if (!badges[idx]) badges[idx] = []
            badges[idx].push('Most Liked')
        }
        if (dislikeLeaders.length === 1) {
            const idx = dislikeLeaders[0]
            if (!badges[idx]) badges[idx] = []
            badges[idx].push('Most Disliked')
        }
        // No replay-related badges
    }
    
    return { badges }
}


