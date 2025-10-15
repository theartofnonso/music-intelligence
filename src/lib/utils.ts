import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(input: string | number | Date | undefined): string | undefined {
  if (!input) return undefined
  const ts = typeof input === 'string' || typeof input === 'number' ? new Date(input).getTime() : input.getTime()
  if (Number.isNaN(ts)) return undefined
  const ms = Date.now() - ts
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`
  const wk = Math.floor(day / 7)
  return `${wk} week${wk === 1 ? '' : 's'} ago`
}

export function buildUniformSections(durationMs: number, chunkMs = 10_000) {
  const out: { start_ms: number; end_ms: number }[] = []
  if (!Number.isFinite(durationMs) || durationMs <= 0) return out
  for (let start = 0; start < durationMs; start += chunkMs) {
    const end = Math.min(durationMs, start + chunkMs)
    out.push({ start_ms: start, end_ms: end })
  }
  return out
}

export function curvesFromSwipes(
  sections: { id?: string; start_ms: number; end_ms: number }[],
  swipes: Record<string, -1 | 0 | 1>,
  trackMs: number,
) {
  const bins = Math.ceil(trackMs / 1000)
  const V = new Array(bins).fill(0)
  const A = new Array(bins).fill(0)
  const K = (dt: number, sigma = 2500) => Math.exp(-(dt * dt) / (2 * sigma * sigma))
  for (const s of sections) {
    const key = s.id ?? `${s.start_ms}-${s.end_ms}`
    const swipe = swipes[key] ?? 0
    if (swipe === 0) continue
    const tau = (s.start_ms + s.end_ms) / 2
    const b0 = Math.floor(s.start_ms / 1000)
    const b1 = Math.floor(s.end_ms / 1000)
    for (let b = b0; b <= b1; b++) {
      const t = b * 1000
      const k = K(t - tau)
      V[b] += swipe * k
      A[b] += Math.abs(swipe) * k
    }
  }
  const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x))
  return { V: V.map((v) => clamp(v, -1, 1)), A: A.map((a) => clamp(a, 0, 1)) }
}
