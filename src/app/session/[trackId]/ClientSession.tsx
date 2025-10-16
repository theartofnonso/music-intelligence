"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import AudioPlayer from '@/components/player/AudioPlayer'
import { sendSessionPayloadAction } from '../actions'

const CHUNK_MS = 10_000

// single-send using server action (no API route)
async function sendSessionPayload(args: { trackId: string; events: unknown[] }) {
    const { trackId, events } = args
    if (!events || (Array.isArray(events) && events.length === 0)) return
    await sendSessionPayloadAction({ trackId, events })
}

function buildUniformSections(durationMs: number, chunkMs = CHUNK_MS) {
    const out: { start_ms: number; end_ms: number }[] = []
    if (!Number.isFinite(durationMs) || durationMs <= 0) return out
    for (let start = 0; start < durationMs; start += chunkMs) {
        const end = Math.min(durationMs, start + chunkMs)
        out.push({ start_ms: start, end_ms: end })
    }
    return out
}

export function ClientSession({ trackId, src }: { trackId: string; src: string }) {
    // Main player: uninterrupted full-song playback
    const mainRef = useRef<HTMLAudioElement | null>(null)
    const [durationMs, setDurationMs] = useState<number>(0)
    const [currentMs, setCurrentMs] = useState<number>(0)
    const localEventsRef = useRef<any[]>([])
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

    // Removed analyzer loop; reactions are written immediately and overwrite previous ones for the section

    function recordReaction(reaction: -1 | 0 | 1) {
        if (sections.length === 0) return
        const sectionIndex = getSectionIndex(currentMs)
        const section = sections[sectionIndex]
        if (!section) return
        const { start_ms, end_ms } = section
        const eventName = reaction === 1 ? 'LIKE' : reaction === -1 ? 'DISLIKE' : 'NEUTRAL'
        const weight = reaction === 1 ? 1 : reaction === -1 ? -1 : 0
        const midpoint = Math.floor((start_ms + end_ms) / 2)
        // Overwrite: remove existing reaction for this section, then push the new one
        const arr = localEventsRef.current
        const lastIdx = [...arr].reverse().findIndex((e) => (e.type === 'LIKE' || e.type === 'DISLIKE' || e.type === 'NEUTRAL') && e.payload?.sectionIndex === sectionIndex)
        if (lastIdx !== -1) {
            const idxToReplace = arr.length - 1 - lastIdx
            arr[idxToReplace] = { trackId, type: eventName, payload: { sectionIndex, startMs: start_ms, endMs: end_ms, reaction, event: eventName, weight, t: midpoint } }
        } else {
            arr.push({ trackId, type: eventName, payload: { sectionIndex, startMs: start_ms, endMs: end_ms, reaction, event: eventName, weight, t: midpoint } })
        }
    }

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') recordReaction(-1)
            if (e.key === 'ArrowRight') recordReaction(1)
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
                            const fromSectionIndex = getSectionIndex(fromMs)
                            const toSectionIndex = getSectionIndex(toMs)
                            if (toMs > fromMs) {
                                // Skip forward: capture latency position
                                localEventsRef.current.push({
                                    trackId,
                                    type: 'SKIP',
                                    payload: { fromMs, toMs, deltaMs: toMs - fromMs, fromSectionIndex, toSectionIndex, event: 'SKIP', weight: -1, t: fromMs },
                                })
                            } else if (toMs < fromMs) {
                                // Replay/backward seek
                                localEventsRef.current.push({
                                    trackId,
                                    type: 'REPLAY',
                                    payload: { fromMs, toMs, deltaMs: toMs - fromMs, fromSectionIndex, toSectionIndex, event: 'REPLAY', weight: 1, t: toMs },
                                })
                            }
                            el.currentTime = Math.max(0, Math.min((durationMs / 1000) || 0, toMs / 1000))
                        }}
                        onDislike={() => recordReaction(-1)}
                        onLike={() => recordReaction(1)}
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
