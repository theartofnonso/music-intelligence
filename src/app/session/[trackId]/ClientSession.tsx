"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import AudioPlayer from '@/components/player/AudioPlayer'
import { getOrCreateSessionId } from '@/lib/session'
import { enqueue, attachLifecycleFlush, setFlushMode, flush } from '@/lib/eventBuffer'

const CHUNK_MS = 10_000

function buildUniformSections(durationMs: number, chunkMs = CHUNK_MS) {
    const out: { start_ms: number; end_ms: number }[] = []
    if (!Number.isFinite(durationMs) || durationMs <= 0) return out
    for (let start = 0; start < durationMs; start += chunkMs) {
        const end = Math.min(durationMs, start + chunkMs)
        out.push({ start_ms: start, end_ms: end })
    }
    return out
}

export function ClientSession({ trackId, src, title }: { trackId: string; src: string; title: string }) {
    // Main player: uninterrupted full-song playback
    const mainRef = useRef<HTMLAudioElement | null>(null)
    // Analyzer: muted, steps through sections to handle timeouts/advance
    const analyzeRef = useRef<HTMLAudioElement | null>(null)
    const [durationMs, setDurationMs] = useState<number>(0)
    const [currentMs, setCurrentMs] = useState<number>(0)
    const [idx, setIdx] = useState(0)
    const [reactions, setReactions] = useState<Record<number, -1 | 0 | 1>>({})
    const sessionId = getOrCreateSessionId()

    const [isPlaying, setIsPlaying] = useState(false)

    useEffect(() => { setFlushMode('end'); attachLifecycleFlush() }, [])

    const sections = useMemo(() => buildUniformSections(durationMs, CHUNK_MS), [durationMs])
    const getSectionIndex = (ms: number) => {
        if (!durationMs || durationMs <= 0) return 0
        const idx = Math.floor(ms / CHUNK_MS)
        return Math.max(0, Math.min(idx, Math.max(0, sections.length - 1)))
    }

    useEffect(() => {
        const el = mainRef.current
        if (!el) return
        const onMeta = () => setDurationMs(Math.floor((el.duration || 0) * 1000))
        const onTimeMain = () => setCurrentMs(Math.floor((el.currentTime || 0) * 1000))
        const onPlayMain = () => setIsPlaying(true)
        const onPauseMain = () => setIsPlaying(false)
        el.addEventListener('loadedmetadata', onMeta)
        el.addEventListener('timeupdate', onTimeMain)
        el.addEventListener('play', onPlayMain)
        el.addEventListener('pause', onPauseMain)
        // Try to start playback (uninterrupted) when metadata is ready
        const tryPlay = async () => { try { await el.play() } catch { } }
        el.addEventListener('loadeddata', tryPlay, { once: true })
        return () => {
            el.removeEventListener('loadedmetadata', onMeta)
            el.removeEventListener('timeupdate', onTimeMain)
            el.removeEventListener('play', onPlayMain)
            el.removeEventListener('pause', onPauseMain)
        }
    }, [])

    useEffect(() => {
        const el = analyzeRef.current
        if (!el || !sections[idx]) return
        const s = sections[idx]
        el.currentTime = s.start_ms / 1000
        void el.play()
        const onTime = () => {
            if (el.currentTime * 1000 >= s.end_ms) {
                el.pause()
                // emit single reaction for this section (last-write-wins; default NEUTRAL)
                emitReactionForSection(idx)
                // advance to next section after boundary
                setIdx((i) => Math.min(i + 1, Math.max(0, sections.length - 1)))
            }
        }
        el.addEventListener('timeupdate', onTime)
        return () => el.removeEventListener('timeupdate', onTime)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx, sections.length])

    function recordReaction(reaction: -1 | 0 | 1) {
        if (!sections[idx]) return
        // last-write-wins: store reaction; emit at section end
        setReactions((v) => ({ ...v, [idx]: reaction }))
    }

    const emittedRef = useRef<Record<number, boolean>>({})

    function emitReactionForSection(sectionIndex: number) {
        const section = sections[sectionIndex]
        if (!section) return
        if (emittedRef.current[sectionIndex]) return
        const { start_ms, end_ms } = section
        const reaction = reactions[sectionIndex] ?? 0
        const eventName = reaction === 1 ? 'LIKE' : reaction === -1 ? 'DISLIKE' : 'NEUTRAL'
        const weight = reaction === 1 ? 1 : reaction === -1 ? -1 : 0
        enqueue({
            sessionId,
            trackId,
            type: 'session_reaction',
            positionMs: Math.floor((start_ms + end_ms) / 2),
            clientTs: Date.now(),
            payload: { sectionIndex, startMs: start_ms, endMs: end_ms, reaction, event: eventName, weight },
        } as any)
        emittedRef.current[sectionIndex] = true
    }

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') recordReaction(-1)
            if (e.key === 'ArrowRight') recordReaction(1)
        }
        addEventListener('keydown', onKey)
        return () => removeEventListener('keydown', onKey)
    }, [])

    const overallPct = durationMs > 0 ? Math.max(0, Math.min(100, (currentMs / durationMs) * 100)) : 0

    return (
        <div className="min-h-screen w-full flex items-center justify-center">
            <div className="space-y-3 w-full max-w-[560px] px-4">
                <div className="rounded p-4 text-center">
                    <AudioPlayer
                        src={src}
                        currentMs={currentMs}
                        durationMs={durationMs}
                        onSeek={(ms) => {
                            const el = mainRef.current; if (!el) return;
                            const fromMs = currentMs
                            const toMs = Math.max(0, Math.min(durationMs || 0, ms))
                            const fromSectionIndex = getSectionIndex(fromMs)
                            const toSectionIndex = getSectionIndex(toMs)
                            // ensure we emit a reaction for the section being exited (if not already)
                            emitReactionForSection(fromSectionIndex)
                            if (toMs > fromMs) {
                                // Skip forward: capture latency position
                            enqueue({
                                    sessionId,
                                    trackId,
                                type: 'session_skip',
                                    positionMs: fromMs,
                                    clientTs: Date.now(),
                                    payload: { fromMs, toMs, deltaMs: toMs - fromMs, fromSectionIndex, toSectionIndex, event: 'SKIP', weight: -1 },
                                } as any)
                            } else if (toMs < fromMs) {
                                // Replay/backward seek
                                enqueue({
                                    sessionId,
                                    trackId,
                                    type: 'session_replay',
                                    positionMs: toMs,
                                    clientTs: Date.now(),
                                    payload: { fromMs, toMs, deltaMs: toMs - fromMs, fromSectionIndex, toSectionIndex, event: 'REPLAY', weight: 1 },
                                } as any)
                            }
                            el.currentTime = Math.max(0, Math.min((durationMs / 1000) || 0, toMs / 1000))
                        }}
                        onDislike={() => recordReaction(-1)}
                        onLike={() => recordReaction(1)}
                        isPlaying={isPlaying}
                        onTogglePlay={async () => { const el = mainRef.current; if (!el) return; if (el.paused) { try { await el.play() } catch { } } else { el.pause() } }}
                    />
                    {/* Hidden players */}
                    <audio ref={mainRef} src={src} className="hidden" />
                    <audio ref={analyzeRef} src={src} muted className="hidden" />
                </div>
                {/* Flush once the last section has been emitted */}
                {idx === sections.length - 1 && (
                    <button className="hidden" aria-hidden onFocusCapture={async () => { await flush(); setFlushMode('auto') }} />
                )}
            </div>
        </div>
    )
}
// end of file
