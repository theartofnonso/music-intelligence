export type Section = { start: number; end: number } // ms

export type SessionEvent =
  | { type: 'like'; t: number }
  | { type: 'dislike'; t: number }
  | { type: 'skip'; t: number }
  | { type: 'replay'; t: number }

export const SESSION_WEIGHTS = {
  like:    { v: +1.0, a: +0.6 },
  dislike: { v: -1.0, a: +0.4 },
  skip:    { v: -0.8, a: -0.3 },
  replay:  { v: +0.8, a: +0.7 },
} as const

export function gaussianKernel(dtMs: number, sigmaMs = 2500): number {
  const x = dtMs / sigmaMs
  return Math.exp(-0.5 * x * x)
}

function findSectionIndexByTime(sections: Section[], tMs: number): number {
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]
    if (tMs >= s.start && tMs < s.end) return i
  }
  // Edge case: if t is exactly the last end, attribute to last section
  if (sections.length && tMs >= sections[sections.length - 1].end) return sections.length - 1
  return Math.max(0, Math.min(sections.length - 1, 0))
}

function splitAtBoundary(tLikeMs: number, boundaryMs: number, preSeconds = 2.0) {
  const dSec = (tLikeMs - boundaryMs) / 1000
  if (dSec < 0 || dSec > preSeconds) return { wPrev: 0, wCurr: 1 }
  const wPrev = 1 - (dSec / preSeconds)
  return { wPrev, wCurr: 1 - wPrev }
}

export function curvesFromEvents(
  sections: Section[],
  events: SessionEvent[],
  durationMs: number,
  opts?: { sigmaMs?: number; fps?: number; bleedMs?: number; capBeforeClamp?: number }
) {
  const sigmaMs = opts?.sigmaMs ?? 2500
  const fps = opts?.fps ?? 1
  const bleedMs = opts?.bleedMs ?? 1500
  const cap = opts?.capBeforeClamp ?? 1.5

  const step = 1000 / fps
  const bins = Math.ceil(durationMs / step)
  const valence = new Array<number>(bins).fill(0)
  const arousal = new Array<number>(bins).fill(0)

  const K = (dt: number, s = sigmaMs) => gaussianKernel(dt, s)

  // Precompute replay points for optional boost
  const replayTimes = events.filter(e => e.type === 'replay').map(e => e.t)

  for (const event of events) {
    const w = SESSION_WEIGHTS[event.type]
    if (!w) continue
    const { v, a } = w

    if (event.type === 'like' || event.type === 'dislike') {
      const idx = findSectionIndexByTime(sections, event.t)
      const curr = sections[idx]
      if (!curr) continue
      const prev = sections[idx - 1]

      // Boundary-split weights around boundary B = curr.start
      const boundary = curr.start
      let { wPrev, wCurr } = splitAtBoundary(event.t, boundary, 2.0)

      // Early-in-section guard: if very early and no prior interaction in current section, push to prev
      const veryEarly = (event.t - boundary) < 400
      if (veryEarly) {
        const hasPriorInCurr = events.some(ev => (ev.type === 'like' || ev.type === 'dislike') && ev !== event && ev.t < event.t && findSectionIndexByTime(sections, ev.t) === idx)
        if (!hasPriorInCurr) { wPrev = 1; wCurr = 0 }
      }

      // Replay boost within 5s of like time
      if (prev) {
        const hasNearbyReplay = replayTimes.some(rt => Math.abs(rt - event.t) <= 5000)
        if (hasNearbyReplay) { wPrev = Math.min(1, wPrev * 1.35); wCurr = Math.max(0, 1 - wPrev) }
      }

      // Apply to previous section bins
      if (prev && wPrev > 0) {
        const p0 = Math.floor(prev.start / step), p1 = Math.floor(prev.end / step)
        for (let b = p0; b <= p1; b++) {
          const t = b * step
          const kw = K(t - event.t, sigmaMs)
          valence[b] += v * wPrev * kw
          arousal[b] += a * wPrev * kw
        }
      }
      // Apply to current section bins
      if (wCurr > 0) {
        const c0 = Math.floor(curr.start / step), c1 = Math.floor(curr.end / step)
        for (let b = c0; b <= c1; b++) {
          const t = b * step
          const kw = K(t - event.t, sigmaMs)
          valence[b] += v * wCurr * kw
          arousal[b] += a * wCurr * kw
        }
      }
    }

    if (event.type === 'skip') {
      const idx = findSectionIndexByTime(sections, event.t)
      const s = sections[idx]
      if (!s) continue
      const b0 = Math.floor(Math.max(event.t, s.start) / step), b1 = Math.floor(s.end / step)
      for (let b = b0; b <= b1; b++) {
        const t = b * step
        const kw = K(t - event.t, 2000)
        valence[b] += v * kw; arousal[b] += a * kw
      }
      const next = sections[idx + 1]
      if (next) {
        const n0 = Math.floor(next.start / step)
        const n1 = Math.floor(Math.min(next.start + bleedMs, next.end) / step)
        for (let b = n0; b <= n1; b++) {
          const t = b * step
          const kw = 0.2 * K(t - event.t, Math.min(bleedMs, 1200))
          valence[b] += v * kw; arousal[b] += a * kw
        }
      }
    }

    if (event.type === 'replay') {
      const idx = findSectionIndexByTime(sections, event.t)
      const s = sections[idx]
      if (!s) continue
      const b0 = Math.floor(s.start / step), b1 = Math.floor(Math.min(event.t, s.end) / step)
      for (let b = b0; b <= b1; b++) {
        const t = b * step
        const kw = K(t - event.t, 2000)
        valence[b] += v * kw; arousal[b] += a * kw
      }
      const prev = sections[idx - 1]
      if (prev) {
        const p0 = Math.floor(Math.max(prev.end - bleedMs, prev.start) / step)
        const p1 = Math.floor(prev.end / step)
        for (let b = p0; b <= p1; b++) {
          const t = b * step
          const kw = 0.2 * K(t - event.t, Math.min(bleedMs, 1200))
          valence[b] += v * kw; arousal[b] += a * kw
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
  const Vsm = ema(valence), Asm = ema(arousal)

  // Cap before clamp
  const cappedV = Vsm.map(v => Math.max(-cap, Math.min(cap, v)))

  const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))
  return {
    valence: cappedV.map(v => clamp(v, -1, 1)),
    arousal: Asm.map(a => clamp(a, 0, 1)),
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
export type RawSessionEvent = {
  type: string
  payload?: any
}

export function processSessionEvents(raw: RawSessionEvent[]): SessionEvent[] {
  const out: SessionEvent[] = []
  for (const e of raw) {
    // Simplified types only (no back-compat)
    if (e.type === 'LIKE') {
      const t = e.payload?.t ?? 0
      out.push({ type: 'like', t })
      continue
    }
    if (e.type === 'DISLIKE') {
      const t = e.payload?.t ?? 0
      out.push({ type: 'dislike', t })
      continue
    }
    if (e.type === 'NEUTRAL') {
      continue
    }
    if (e.type === 'SKIP') {
      const fromMs = (e.payload?.fromMs ?? e.payload?.t ?? 0) as number
      out.push({ type: 'skip', t: fromMs })
      continue
    }
    if (e.type === 'REPLAY') {
      const toMs = (e.payload?.toMs ?? e.payload?.t ?? 0) as number
      out.push({ type: 'replay', t: toMs })
      continue
    }
  }
  return out
}


