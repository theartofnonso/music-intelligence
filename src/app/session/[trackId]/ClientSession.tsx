"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import AudioPlayer from '@/components/player/AudioPlayer'
import { sendSessionPayloadAction } from '../actions'

type ReactionType = 'LIKE' | 'DISLIKE' | 'NEUTRAL'
type ActionType = ReactionType | 'SKIP' | 'REPLAY'
type SegmentAttribution = {
    event: ActionType
    t: number
    segmentIndex: number
    segmentStartMs: number
    segmentEndMs: number
    toMs?: number
}
type SessionEvent = { type: ActionType; payload: SegmentAttribution }

// single-send using server action (no API route)
async function sendSessionPayload(args: { trackId: string; events: SessionEvent[] }) {
    const { trackId, events } = args
    if (!events || (Array.isArray(events) && events.length === 0)) return
    await sendSessionPayloadAction({ trackId, events })
}

export const ClientSession = ({ trackId, src }: { trackId: string; src: string }) => {
    // Main player: uninterrupted full-song playback
    const mainRef = useRef<HTMLAudioElement | null>(null)
    const [durationMs, setDurationMs] = useState<number>(0)
    const [currentMs, setCurrentMs] = useState<number>(0)
    const localEventsRef = useRef<SessionEvent[]>([])
    // Structural segment markers no longer needed (gating enforces reactions)
    const sentRef = useRef(false)
    const [isPlaying, setIsPlaying] = useState(false)

	// Gating and prompting state
    const [gateIntervalMs, setGateIntervalMs] = useState<number>(30_000)
    const [nudgeVisible, setNudgeVisible] = useState(false)
    const [gateActive, setGateActive] = useState(false)
    const lastPromptBoundaryRef = useRef<number>(-1)
    const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const isFadingRef = useRef(false)
    // Nudge-targeted segment (previous completed segment)
    const lastCompletedSegmentRef = useRef<number>(-1)
    const currentNudgeSegmentIdxRef = useRef<number | null>(null)
    const nudgeBoundaryDelayMs = 500
    const segmentsReactedRef = useRef<Set<number>>(new Set())
    const pendingFinalSendRef = useRef(false)

    const fadeOutAndPause = (durMs = 400) => {
        const el = mainRef.current
        if (!el) return
        if (isFadingRef.current) return
        isFadingRef.current = true
        const startVol = Math.max(0, Math.min(1, el.volume || 1))
        const steps = Math.max(1, Math.floor(durMs / 40))
        let i = 0
        if (fadeTimerRef.current) { clearInterval(fadeTimerRef.current); fadeTimerRef.current = null }
        fadeTimerRef.current = setInterval(() => {
            i += 1
            const ratio = Math.max(0, Math.min(1, 1 - i / steps))
            try { el.volume = startVol * ratio } catch { }
            if (i >= steps) {
                if (fadeTimerRef.current) { clearInterval(fadeTimerRef.current); fadeTimerRef.current = null }
                try { el.pause() } catch { }
                // restore volume immediately for next resume
                try { el.volume = startVol } catch { }
                isFadingRef.current = false
            }
        }, 40)
    }

    // Segment boundary helpers (based on gateIntervalMs)
    const getSegmentForMs = useCallback((ms: number) => {
        const idx = Math.max(0, Math.floor(ms / gateIntervalMs))
        const startMs = idx * gateIntervalMs
        const endMs = Math.min((idx + 1) * gateIntervalMs, durationMs || Number.POSITIVE_INFINITY)
        return { idx, startMs, endMs }
    }, [gateIntervalMs, durationMs])

    // Segment markers removed: we rely on reactions per segment enforced by gating

    // Single-send model: we accumulate locally and send once on ended
    useEffect(() => {
        const handleEarlyExit = async () => {
            if (sentRef.current) return
            sentRef.current = true
            const events = [...localEventsRef.current]
            localEventsRef.current = []
            await sendSessionPayload({ trackId, events })
        }
        addEventListener('pagehide', handleEarlyExit)
        addEventListener('beforeunload', handleEarlyExit)
        return () => {
            removeEventListener('pagehide', handleEarlyExit)
            removeEventListener('beforeunload', handleEarlyExit)
        }
    }, [trackId])

    useEffect(() => {
        const el = mainRef.current
        if (!el) return
        const onMeta = () => {
            const ms = Math.floor((el.duration || 0) * 1000)
            setDurationMs(ms)
            // Dynamically adjust segment size based on total duration
            // Target about 6 segments, clamp to a reasonable window (10s–40s)
            const targetSegments = 6
            const approx = Math.max(1, Math.round(ms / targetSegments))
            const rounded = Math.max(10_000, Math.min(40_000, Math.round(approx / 1000) * 1000))
            setGateIntervalMs(rounded)
            // Ensure the first nudge occurs after the first gate interval (not immediately)
            lastPromptBoundaryRef.current = 0
            if (nudgeTimerRef.current) { clearTimeout(nudgeTimerRef.current); nudgeTimerRef.current = null }
            setNudgeVisible(false)
            setGateActive(false)
            // reset any pending timers
            lastCompletedSegmentRef.current = -1
            currentNudgeSegmentIdxRef.current = null
        }
        const onTimeMain = () => setCurrentMs(Math.floor((el.currentTime || 0) * 1000))
        const onPlayMain = () => setIsPlaying(true)
        const onPauseMain = () => setIsPlaying(false)
        el.addEventListener('loadedmetadata', onMeta)
        el.addEventListener('timeupdate', onTimeMain)
        el.addEventListener('play', onPlayMain)
        el.addEventListener('pause', onPauseMain)

        // Autoplay removed to avoid racing with nudge/pause flow

        const onEndedMain = async () => {
            const msTotal = Math.max(0, Math.floor((el.duration || 0) * 1000))
            const lastSeg = getSegmentForMs(Math.max(0, msTotal - 1))
            lastCompletedSegmentRef.current = lastSeg.idx
            if (!segmentsReactedRef.current.has(lastSeg.idx)) {
                currentNudgeSegmentIdxRef.current = lastSeg.idx
                pendingFinalSendRef.current = true
                setNudgeVisible(true)
                setGateActive(true)
                return
            }
            const events = [...localEventsRef.current]
            localEventsRef.current = []
            if (!sentRef.current) {
                sentRef.current = true
                await sendSessionPayload({ trackId, events })
            }
        }
        el.addEventListener('ended', onEndedMain)

        return () => {
            el.removeEventListener('loadedmetadata', onMeta)
            el.removeEventListener('timeupdate', onTimeMain)
            el.removeEventListener('play', onPlayMain)
            el.removeEventListener('pause', onPauseMain)
            el.removeEventListener('ended', onEndedMain)
        }
    }, [trackId])

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (nudgeTimerRef.current) { clearTimeout(nudgeTimerRef.current); nudgeTimerRef.current = null }
        }
    }, [])

    // Boundary-based immediate nudge and pause (nudge previous segment)
    useEffect(() => {
        if (!durationMs || durationMs <= 0) return
        const boundaryIndex = Math.floor(currentMs / gateIntervalMs)
        if (boundaryIndex !== lastPromptBoundaryRef.current) {
            lastPromptBoundaryRef.current = boundaryIndex
            // Marker emission removed
            // Update last completed segment; boundaryIndex marks the start of the new segment
            const prevIdx = Math.max(0, boundaryIndex - 1)
            if (boundaryIndex > 0) lastCompletedSegmentRef.current = prevIdx
            // Show nudge for previous segment, after a short delay to ensure new segment starts playing
            if (boundaryIndex > 0) {
                // Do not retarget a new segment if a nudge is already pending/visible
                if (currentNudgeSegmentIdxRef.current != null) {
                    return
                }
                if (nudgeTimerRef.current) { clearTimeout(nudgeTimerRef.current); nudgeTimerRef.current = null }
                nudgeTimerRef.current = setTimeout(() => {
                    currentNudgeSegmentIdxRef.current = lastCompletedSegmentRef.current
                    setNudgeVisible(true)
                    setGateActive(true)
                    fadeOutAndPause(400)
                }, nudgeBoundaryDelayMs)
            }
        }
    }, [currentMs, durationMs, gateIntervalMs, getSegmentForMs])

    const handleReaction = useCallback((reaction: -1 | 0 | 1) => {
        const eventName: ReactionType = reaction === 1 ? 'LIKE' : reaction === -1 ? 'DISLIKE' : 'NEUTRAL'
        const t = Math.max(0, Math.min(durationMs || 0, currentMs))
        // Attribute reaction to the previous completed segment if available
        const targetIdx = currentNudgeSegmentIdxRef.current ?? lastCompletedSegmentRef.current
        const seg = targetIdx != null && targetIdx >= 0
            ? { idx: targetIdx, startMs: targetIdx * gateIntervalMs, endMs: Math.min((targetIdx + 1) * gateIntervalMs, durationMs || Number.POSITIVE_INFINITY) }
            : getSegmentForMs(t)
        localEventsRef.current.push({
            type: eventName,
            payload: {
                event: eventName,
                t,
                segmentIndex: seg.idx,
                segmentStartMs: seg.startMs,
                segmentEndMs: seg.endMs,
            },
        })
        segmentsReactedRef.current.add(seg.idx)
        // Update gating state
        setNudgeVisible(false)
        setGateActive(false)
        currentNudgeSegmentIdxRef.current = null
        if (nudgeTimerRef.current) { clearTimeout(nudgeTimerRef.current); nudgeTimerRef.current = null }
        // Resume playback if we paused for gating, but do NOT resume after final segment reaction
        if (!pendingFinalSendRef.current && mainRef.current) {
            const el = mainRef.current
            if (el.paused && !el.ended) { try { void el.play() } catch { } }
        }
        if (pendingFinalSendRef.current && !sentRef.current) {
            pendingFinalSendRef.current = false
            sentRef.current = true
            const events = [...localEventsRef.current]
            localEventsRef.current = []
            void sendSessionPayload({ trackId, events })
        }
    }, [currentMs, durationMs, gateIntervalMs])

    // no-op

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handleReaction(-1)
            if (e.key === 'ArrowRight') handleReaction(1)
            if (e.key === 'ArrowDown') handleReaction(0)
        }
        addEventListener('keydown', onKey)
        return () => removeEventListener('keydown', onKey)
    }, [handleReaction])

    return (
        <div className="min-h-screen w-full flex items-center justify-center">
            <div className="space-y-3 w-full max-w-[560px] px-4">
                {/* Reaction overlay: blur background and focus the prompt */}
                {(nudgeVisible || gateActive) && (
                    <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm" role="dialog" aria-modal="true">
                        <div className="absolute inset-0 grid place-items-center p-4">
                            <div className="w-full max-w-md rounded-md border bg-background p-4 shadow-lg">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-xs text-muted-foreground">Share a quick reaction</p>
                                    <div className="flex w-full gap-2 sm:w-auto">
                                        <button
                                            className="flex-1 rounded-md border px-3 py-2 text-xs sm:flex-none cursor-pointer hover:bg-accent"
                                            onClick={() => handleReaction(-1)}
                                            aria-label="Dislike"
                                        >Dislike</button>
                                        <button
                                            className="flex-1 rounded-md border px-3 py-2 text-xs sm:flex-none cursor-pointer hover:bg-accent"
                                            onClick={() => handleReaction(0)}
                                            aria-label="Neutral"
                                        >Neutral</button>
                                        <button
                                            className="flex-1 rounded-md border px-3 py-2 text-xs sm:flex-none cursor-pointer hover:bg-accent"
                                            onClick={() => handleReaction(1)}
                                            aria-label="Like"
                                        >Like</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="rounded p-4 text-center">
                    <AudioPlayer
                        src={src}
                        currentMs={currentMs}
                        durationMs={durationMs}
                        disabledControls={nudgeVisible || gateActive}
                        stepMs={gateIntervalMs}
                        onSeek={(ms) => {
                            const el = mainRef.current; if (!el) return;
                            const fromMs = currentMs
                            const reqMs = Math.max(0, Math.min(durationMs || 0, ms))
                            const curSeg = getSegmentForMs(fromMs)
                            let toMs = reqMs
                            if (reqMs > fromMs) {
                                // Snap to next segment start
                                const nextIdx = curSeg.idx + 1
                                const nextStart = Math.min(nextIdx * gateIntervalMs, Math.max(0, (durationMs || 1) - 1))
                                toMs = nextStart
                                const seg = getSegmentForMs(toMs)
                                localEventsRef.current.push({
                                    type: 'SKIP',
                                    payload: {
                                        toMs,
                                        event: 'SKIP',
                                        t: fromMs,
                                        segmentIndex: seg.idx,
                                        segmentStartMs: seg.startMs,
                                        segmentEndMs: seg.endMs,
                                    },
                                })
                            } else if (reqMs < fromMs) {
                                // Snap to previous segment start and defer replay capture until end is reached
                                const prevIdx = Math.max(0, curSeg.idx - 1)
                                const prevStart = prevIdx * gateIntervalMs
                                toMs = prevStart
                                const seg = getSegmentForMs(toMs)
                                const targetEnd = seg.endMs
                                const onTick = () => {
                                    const now = Math.floor((el.currentTime || 0) * 1000)
                                    if (now >= targetEnd - 50) {
                                        el.removeEventListener('timeupdate', onTick)
                                        localEventsRef.current.push({
                                            type: 'REPLAY',
                                            payload: {
                                                toMs,
                                                event: 'REPLAY',
                                                t: toMs,
                                                segmentIndex: seg.idx,
                                                segmentStartMs: seg.startMs,
                                                segmentEndMs: seg.endMs,
                                            },
                                        })
                                    }
                                }
                                el.addEventListener('timeupdate', onTick)
                            }
                            el.currentTime = Math.max(0, Math.min((durationMs / 1000) || 0, toMs / 1000))
                            // Auto-play after seek even when nudge is visible
                            try { void el.play() } catch { }
                        }}
                        isPlaying={isPlaying}
                        onTogglePlay={async () => {
                            const el = mainRef.current; if (!el) return;
                            // Prevent resuming playback while gating is active
                            if (el.paused && (gateActive || nudgeVisible)) {
                                setNudgeVisible(true); setGateActive(true); return;
                            }
                            if (el.paused) { try { await el.play() } catch { } } else { el.pause() }
                        }}
                    />
                    {/* Hidden player */}
                    <audio ref={mainRef} src={src} className="hidden" />
                </div>
            </div>
        </div>
    )
}
// end of file
