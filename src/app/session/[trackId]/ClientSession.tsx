"use client"

import { useEffect, useRef, useState } from 'react'
import AudioPlayer from '@/components/player/AudioPlayer'
import { sendSessionPayloadAction } from '../actions'

type ReactionType = 'LIKE' | 'DISLIKE' | 'NEUTRAL'
type ActionType = ReactionType | 'SKIP' | 'REPLAY'
type SessionEvent = { type: ActionType; payload: any }

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
    const sentRef = useRef(false)
    const [isPlaying, setIsPlaying] = useState(false)

    // Gating and prompting state
    const strictGating = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_STRICT_GATING === '1'
    const gateIntervalMs = 10_000 // approximate phrase/section boundary
    const nudgeTimeoutMs = 2_500 // escalate to hard pause after this delay if ignored
    const quotaTarget = 6
    const [reactionsCount, setReactionsCount] = useState(0)
    const [nudgeVisible, setNudgeVisible] = useState(false)
    const [gateActive, setGateActive] = useState(false)
    const [gateAtNextBoundary, setGateAtNextBoundary] = useState(false)
    const lastPromptBoundaryRef = useRef<number>(-1)
    const lastReactionAtMsRef = useRef<number>(0)
    const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Single-send model: we accumulate locally and send once on ended
    useEffect(() => {
        const handleEarlyExit = async () => {
            if (sentRef.current) return
            sentRef.current = true
            const events = localEventsRef.current.slice()
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
        const onEndedMain = async () => {
            const events = localEventsRef.current.slice()
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
    }, [])

    // Boundary-based soft nudge and hard gate
    useEffect(() => {
        if (!durationMs || durationMs <= 0) return
        if (reactionsCount >= quotaTarget) return
        const boundaryIndex = Math.floor(currentMs / gateIntervalMs)
        if (boundaryIndex !== lastPromptBoundaryRef.current) {
            lastPromptBoundaryRef.current = boundaryIndex
            // Strict gating: pause every boundary until reaction
            if (strictGating) {
                setNudgeVisible(true)
                setGateActive(true)
                try { mainRef.current?.pause() } catch {}
                return
            }
            // Soft nudge first
            setNudgeVisible(true)
            // Clear any previous timers
            if (nudgeTimerRef.current) { clearTimeout(nudgeTimerRef.current); nudgeTimerRef.current = null }
            // Escalate to hard pause at next boundary after timeout
            nudgeTimerRef.current = setTimeout(() => {
                setGateAtNextBoundary(true)
            }, nudgeTimeoutMs)
        }
        // If we planned to gate at next boundary and we just crossed it, pause
        if (gateAtNextBoundary && nudgeVisible) {
            setGateActive(true)
            setGateAtNextBoundary(false)
            try { mainRef.current?.pause() } catch {}
        }
    }, [currentMs, durationMs, strictGating, reactionsCount])

    const handleReaction = (reaction: -1 | 0 | 1) => {
        const eventName: ReactionType = reaction === 1 ? 'LIKE' : reaction === -1 ? 'DISLIKE' : 'NEUTRAL'
        const weight = reaction === 1 ? 1 : reaction === -1 ? -1 : 0
        const t = Math.max(0, Math.min(durationMs || 0, currentMs))
        localEventsRef.current.push({ type: eventName, payload: { reaction, event: eventName, weight, t } })
        // Update gating state
        lastReactionAtMsRef.current = t
        setReactionsCount((c) => c + 1)
        setNudgeVisible(false)
        setGateActive(false)
        setGateAtNextBoundary(false)
        if (nudgeTimerRef.current) { clearTimeout(nudgeTimerRef.current); nudgeTimerRef.current = null }
        // Resume playback if we paused for gating
        if (mainRef.current && mainRef.current.paused) { try { void mainRef.current.play() } catch {} }
    }

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handleReaction(-1)
            if (e.key === 'ArrowRight') handleReaction(1)
            if (e.key === 'ArrowDown') handleReaction(0)
        }
        addEventListener('keydown', onKey)
        return () => removeEventListener('keydown', onKey)
    }, [])

    return (
        <div className="min-h-screen w-full flex items-center justify-center">
            <div className="space-y-3 w-full max-w-[560px] px-4">
                {/* Reaction bar: shown for nudges or active gate until quota is met */}
                {(nudgeVisible || gateActive) && reactionsCount < quotaTarget && (
                    <div className="mb-3 rounded-md border bg-background p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-muted-foreground">Share a quick reaction ({reactionsCount}/{quotaTarget})</p>
                            <div className="flex w-full gap-2 sm:w-auto">
                                <button
                                    className="flex-1 rounded-md border px-3 py-2 text-xs hover:bg-accent sm:flex-none"
                                    onClick={() => handleReaction(-1)}
                                    aria-label="Dislike"
                                >Dislike</button>
                                <button
                                    className="flex-1 rounded-md border px-3 py-2 text-xs hover:bg-accent sm:flex-none"
                                    onClick={() => handleReaction(0)}
                                    aria-label="Neutral"
                                >Neutral</button>
                                <button
                                    className="flex-1 rounded-md border px-3 py-2 text-xs hover:bg-accent sm:flex-none"
                                    onClick={() => handleReaction(1)}
                                    aria-label="Like"
                                >Like</button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="rounded p-4 text-center">
                    <AudioPlayer
                        src={src}
                        currentMs={currentMs}
                        durationMs={durationMs}
                        onSeek={(ms) => {
                            const el = mainRef.current; if (!el) return;
                            const fromMs = currentMs
                            const toMs = Math.max(0, Math.min(durationMs || 0, ms))
                            // Gate skipping forward when a reaction is required (nudge or gate)
                            if (toMs > fromMs && (reactionsCount < quotaTarget) && (nudgeVisible || gateActive || strictGating)) {
                                // Highlight the bar by briefly re-showing it
                                setNudgeVisible(true)
                                setGateActive(true)
                                return
                            }
                            if (toMs > fromMs) {
                                // Skip forward: capture latency position
                                localEventsRef.current.push({
                                    type: 'SKIP',
                                    payload: { fromMs, toMs, deltaMs: toMs - fromMs, event: 'SKIP', weight: -1, t: fromMs },
                                })
                            } else if (toMs < fromMs) {
                                // Replay/backward seek
                                localEventsRef.current.push({
                                    type: 'REPLAY',
                                    payload: { fromMs, toMs, deltaMs: toMs - fromMs, event: 'REPLAY', weight: 1, t: toMs },
                                })
                            }
                            el.currentTime = Math.max(0, Math.min((durationMs / 1000) || 0, toMs / 1000))
                        }}
                        onDislike={() => handleReaction(-1)}
                        onLike={() => handleReaction(1)}
                        isPlaying={isPlaying}
                        onTogglePlay={async () => { const el = mainRef.current; if (!el) return; if (el.paused) { try { await el.play() } catch { } } else { el.pause() } }}
                    />
                    {/* Hidden player */}
                    <audio ref={mainRef} src={src} className="hidden" />
                </div>
            </div>
        </div>
    )
}
// end of file
