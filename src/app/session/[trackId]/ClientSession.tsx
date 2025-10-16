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

    const handleReaction = (reaction: -1 | 0 | 1) => {
        const eventName: ReactionType = reaction === 1 ? 'LIKE' : reaction === -1 ? 'DISLIKE' : 'NEUTRAL'
        const weight = reaction === 1 ? 1 : reaction === -1 ? -1 : 0
        const t = Math.max(0, Math.min(durationMs || 0, currentMs))
        localEventsRef.current.push({ type: eventName, payload: { reaction, event: eventName, weight, t } })
    }

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handleReaction(-1)
            if (e.key === 'ArrowRight') handleReaction(1)
        }
        addEventListener('keydown', onKey)
        return () => removeEventListener('keydown', onKey)
    }, [])

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
