"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import AudioPlayer from '@/components/player/AudioPlayer'
import { getOrCreateSessionId } from '@/lib/session'
import { enqueue, attachLifecycleFlush } from '@/lib/eventBuffer'

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

export function ClientArcade({ trackId, src, title }: { trackId: string; src: string; title: string }) {
    // Main player: uninterrupted full-song playback
    const mainRef = useRef<HTMLAudioElement | null>(null)
    // Analyzer: muted, steps through sections to handle timeouts/advance
    const analyzeRef = useRef<HTMLAudioElement | null>(null)
    const [durationMs, setDurationMs] = useState<number>(0)
    const [currentMs, setCurrentMs] = useState<number>(0)
    const [idx, setIdx] = useState(0)
    const [voted, setVoted] = useState<Record<number, -1 | 0 | 1>>({})
    const sessionId = getOrCreateSessionId()

    const [isPlaying, setIsPlaying] = useState(false)


    useEffect(() => attachLifecycleFlush(), [])

    const sections = useMemo(() => buildUniformSections(durationMs, CHUNK_MS), [durationMs])

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
                // if no explicit vote, record neutral (0)
                if (voted[idx] === undefined) recordVoteOnce(0)
                // advance to next section after boundary
                setIdx((i) => Math.min(i + 1, Math.max(0, sections.length - 1)))
            }
        }
        el.addEventListener('timeupdate', onTime)
        return () => el.removeEventListener('timeupdate', onTime)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx, sections.length])

    function recordVoteOnce(swipe: -1 | 0 | 1) {
        if (!sections[idx]) return
        // do not advance or pause; just capture once
        if (voted[idx] !== undefined) return
        const { start_ms, end_ms } = sections[idx]
        setVoted((v) => ({ ...v, [idx]: swipe }))
        enqueue({
            sessionId,
            trackId,
            type: 'arcade_swipe',
            positionMs: Math.floor((start_ms + end_ms) / 2),
            clientTs: Date.now(),
            payload: { sectionIndex: idx, startMs: start_ms, endMs: end_ms, swipe },
        } as any)
    }

    function submitVote(swipe: -1 | 0 | 1) {
        recordVoteOnce(swipe)
        // no advance here; allow audio to play to section end
    }

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') submitVote(-1)
            if (e.key === 'ArrowRight') submitVote(1)
        }
        addEventListener('keydown', onKey)
        return () => removeEventListener('keydown', onKey)
    }, [])

    const overallPct = durationMs > 0 ? Math.max(0, Math.min(100, (currentMs / durationMs) * 100)) : 0

    return (
        <div className="min-h-screen w-full flex items-center justify-center">
            <div className="space-y-3 w-full max-w-[560px] px-4">
                <div className="rounded bg-accent/30 p-4 text-center">
                    <AudioPlayer
                        src={src}
                        currentMs={currentMs}
                        durationMs={durationMs}
                        onSeek={(ms) => { const el = mainRef.current; if (!el) return; el.currentTime = Math.max(0, Math.min((durationMs / 1000) || 0, ms / 1000)) }}
                        onSwipeLeft={() => submitVote(-1)}
                        onSwipeRight={() => submitVote(1)}
                        isPlaying={isPlaying}
                        onTogglePlay={async () => { const el = mainRef.current; if (!el) return; if (el.paused) { try { await el.play() } catch { } } else { el.pause() } }}
                    />
                    {/* Hidden players */}
                    <audio ref={mainRef} src={src} className="hidden" />
                    <audio ref={analyzeRef} src={src} muted className="hidden" />
                </div>
            </div>
        </div>
    )
}
// end of file
