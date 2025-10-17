export type SegmentPayload = { t?: number; segmentIndex?: number; segmentStartMs?: number; segmentEndMs?: number }
export type RawEvent = { type: string; positionMs?: number; payload?: SegmentPayload }

export async function generateSegmentInsights(events: RawEvent[]): Promise<Record<number, string[]>> {
    // group events by segmentIndex
    const bySeg = new Map<number, RawEvent[]>()
    for (const e of events) {
        const idx = (e.payload?.segmentIndex ?? -1) as number
        if (idx < 0) continue
        if (!bySeg.has(idx)) bySeg.set(idx, [])
        bySeg.get(idx)!.push(e)
    }
    const result: Record<number, string[]> = {}
    const key = process.env.OPENAI_API_KEY
    if (!key) return result
    const { generateText } = await import('ai')
    const { createOpenAI } = await import('@ai-sdk/openai')
    const openai = createOpenAI({ apiKey: key })
    for (const [idx, segEvents] of bySeg.entries()) {
        try {
            const summary = JSON.stringify(segEvents.slice(-100))
            const { text } = await generateText({
                model: openai('gpt-4o-mini'),
                prompt: `You are a music engagement analyst.

Your task: Write ONE concise, neutral sentence describing how listeners engaged, based ONLY on LIKE, DISLIKE, SKIP, REPLAY, and NEUTRAL events.

Requirements:
- Refer to “listeners,” never “users.”
- Describe aggregate patterns only; do NOT imply order or intent. Avoid: “followed by”, “then”, “decided”, “shifted”, “after”, “before”.
- Do NOT mention timestamps, durations, song length, or exact counts.
- Keep it objective and specific, under 18 words.

Input (events JSON):
${summary}

Output only the single sentence — no preface, no list, no explanation.`,
                temperature: 0.0,
            })
            const lines = text.split('\n').map((l: string) => l.replace(/^[-•\s]+/, '').trim()).filter(Boolean)
            result[idx] = lines.length ? [lines[0]] : []
        } catch {
            result[idx] = []
        }
    }
    return result
}


