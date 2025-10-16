export type Section = { start: number; end: number } // ms

export type ReviewEvent =
  | { type: 'like'; t: number; sectionIdx: number }
  | { type: 'dislike'; t: number; sectionIdx: number }
  | { type: 'skip'; t: number; sectionIdx: number }      // from sectionIdx -> sectionIdx+1
  | { type: 'replay'; t: number; sectionIdx: number }     // from sectionIdx -> sectionIdx-1

export const DEFAULT_WEIGHTS = {
  like:    { v: +1.0, a: +0.6 },
  dislike: { v: -1.0, a: +0.4 },
  skip:    { v: -0.8, a: -0.3 },
  replay:  { v: +0.8, a: +0.7 },
} as const

export function gaussianKernel(dtMs: number, sigmaMs = 2500): number {
  const x = dtMs / sigmaMs
  return Math.exp(-0.5 * x * x)
}

export function curvesFromEvents(
  sections: Section[],
  events: ReviewEvent[],
  durationMs: number,
  opts?: { sigmaMs?: number; fps?: number; bleedMs?: number; capBeforeClamp?: number }
) {
  const sigmaMs = opts?.sigmaMs ?? 2500
  const fps = opts?.fps ?? 1
  const bleedMs = opts?.bleedMs ?? 1500
  const cap = opts?.capBeforeClamp ?? 1.5

  const step = 1000 / fps
  const bins = Math.ceil(durationMs / step)
  const V = new Array<number>(bins).fill(0)
  const A = new Array<number>(bins).fill(0)

  const K = (dt: number, s = sigmaMs) => gaussianKernel(dt, s)

  for (const e of events) {
    const w = DEFAULT_WEIGHTS[e.type]
    if (!w) continue
    const { v, a } = w

    if (e.type === 'like' || e.type === 'dislike') {
      const s = sections[e.sectionIdx]
      if (!s) continue
      const b0 = Math.floor(s.start / step), b1 = Math.floor(s.end / step)
      for (let b = b0; b <= b1; b++) {
        const t = b * step
        const kw = K(t - e.t, sigmaMs)
        V[b] += v * kw
        A[b] += a * kw
      }
      const prev = sections[e.sectionIdx - 1], next = sections[e.sectionIdx + 1]
      if (prev) {
        const p0 = Math.floor(Math.max(prev.end - bleedMs, prev.start) / step)
        const p1 = Math.floor(prev.end / step)
        for (let b = p0; b <= p1; b++) {
          const t = b * step
          const kw = 0.3 * K(t - e.t, Math.min(bleedMs, sigmaMs))
          V[b] += v * kw; A[b] += a * kw
        }
      }
      if (next) {
        const n0 = Math.floor(next.start / step)
        const n1 = Math.floor(Math.min(next.start + bleedMs, next.end) / step)
        for (let b = n0; b <= n1; b++) {
          const t = b * step
          const kw = 0.3 * K(t - e.t, Math.min(bleedMs, sigmaMs))
          V[b] += v * kw; A[b] += a * kw
        }
      }
    }

    if (e.type === 'skip') {
      const s = sections[e.sectionIdx]
      if (!s) continue
      const b0 = Math.floor(Math.max(e.t, s.start) / step), b1 = Math.floor(s.end / step)
      for (let b = b0; b <= b1; b++) {
        const t = b * step
        const kw = K(t - e.t, 2000)
        V[b] += v * kw; A[b] += a * kw
      }
      const next = sections[e.sectionIdx + 1]
      if (next) {
        const n0 = Math.floor(next.start / step)
        const n1 = Math.floor(Math.min(next.start + bleedMs, next.end) / step)
        for (let b = n0; b <= n1; b++) {
          const t = b * step
          const kw = 0.2 * K(t - e.t, Math.min(bleedMs, 1200))
          V[b] += v * kw; A[b] += a * kw
        }
      }
    }

    if (e.type === 'replay') {
      const s = sections[e.sectionIdx]
      if (!s) continue
      const b0 = Math.floor(s.start / step), b1 = Math.floor(Math.min(e.t, s.end) / step)
      for (let b = b0; b <= b1; b++) {
        const t = b * step
        const kw = K(t - e.t, 2000)
        V[b] += v * kw; A[b] += a * kw
      }
      const prev = sections[e.sectionIdx - 1]
      if (prev) {
        const p0 = Math.floor(Math.max(prev.end - bleedMs, prev.start) / step)
        const p1 = Math.floor(prev.end / step)
        for (let b = p0; b <= p1; b++) {
          const t = b * step
          const kw = 0.2 * K(t - e.t, Math.min(bleedMs, 1200))
          V[b] += v * kw; A[b] += a * kw
        }
      }
    }
  }

  // Smooth: simple EMA
  const ema = (arr: number[], alpha = 0.2) => {
    let y = 0
    const out = new Array<number>(arr.length)
    for (let i = 0; i < arr.length; i++) { y = alpha * arr[i] + (1 - alpha) * y; out[i] = y }
    return out
  }
  const Vsm = ema(V), Asm = ema(A)

  // Cap before clamp
  const cappedV = Vsm.map(v => Math.max(-cap, Math.min(cap, v)))

  const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))
  return {
    V: cappedV.map(v => clamp(v, -1, 1)),
    A: Asm.map(a => clamp(a, 0, 1)),
  }
}

export function buildUniformSections(durationMs: number, chunkMs = 10_000): Section[] {
  const out: Section[] = []
  if (!Number.isFinite(durationMs) || durationMs <= 0) return out
  for (let start = 0; start < durationMs; start += chunkMs) {
    const end = Math.min(durationMs, start + chunkMs)
    out.push({ start, end })
  }
  return out
}

// Map stored backend events → ReviewEvent[] (ignores NEUTRAL)
export type RawEvent = {
  type: string
  positionMs: number
  payload?: any
}

export function mapRawEventsToReviewEvents(raw: RawEvent[]): ReviewEvent[] {
  const out: ReviewEvent[] = []
  for (const e of raw) {
    if (e.type === 'arcade_reaction' || e.type === 'review_reaction') {
      const label = e.payload?.event as string | undefined
      const sectionIdx = (e.payload?.sectionIndex ?? e.payload?.section_idx ?? -1) as number
      const t = e.positionMs ?? e.payload?.t ?? 0
      if (label === 'LIKE') out.push({ type: 'like', t, sectionIdx })
      else if (label === 'DISLIKE') out.push({ type: 'dislike', t, sectionIdx })
      // NEUTRAL ignored
      continue
    }
    if (e.type === 'arcade_skip' || e.type === 'review_skip') {
      const fromMs = (e.payload?.fromMs ?? e.positionMs ?? 0) as number
      const sectionIdx = (e.payload?.fromSectionIndex ?? e.payload?.sectionIndex ?? -1) as number
      out.push({ type: 'skip', t: fromMs, sectionIdx })
      continue
    }
    if (e.type === 'arcade_replay' || e.type === 'review_replay') {
      const toMs = (e.payload?.toMs ?? e.positionMs ?? 0) as number
      const sectionIdx = (e.payload?.fromSectionIndex ?? e.payload?.sectionIndex ?? -1) as number
      out.push({ type: 'replay', t: toMs, sectionIdx })
      continue
    }
  }
  return out
}


