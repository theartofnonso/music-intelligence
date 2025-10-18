"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown, Flame, Meh, ArrowUp, Heart } from 'lucide-react'
import AudioPlayer, { AudioPlayerHandle } from '@/components/player/AudioPlayer'
import { sendSessionPayloadAction } from '../actions'
import { WavyBackground } from '@/components/ui/wavy-background'

type ReactionType = 'LIKE' | 'DISLIKE' | 'NEUTRAL' | 'LOVE' | 'FIRE'
type EventType = ReactionType | 'COMMENT' | 'SEEK'

type ReactionPayload = {
    event: ReactionType
    t: number
    comment?: string
}
type CommentPayload = {
    t: number
    text: string
}
type SeekPayload = {
    fromMs: number
    toMs: number
}
type SessionEvent = { type: EventType; payload: ReactionPayload | CommentPayload | SeekPayload }

// single-send using server action (no API route)
async function sendSessionPayload(args: { trackId: string; events: SessionEvent[] }) {
    const { trackId, events } = args
    if (!events || (Array.isArray(events) && events.length === 0)) return
    await sendSessionPayloadAction({ trackId, events })
}

export const ClientSession = ({ trackId, src }: { trackId: string; src: string }) => {
    // Wavesurfer-driven playback (no hidden audio element)
    const [durationMs, setDurationMs] = useState<number>(0)
    const [currentMs, setCurrentMs] = useState<number>(0)
    const localEventsRef = useRef<SessionEvent[]>([])
    // Single timeline; users can seek freely
    const sentRef = useRef(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const audioRef = useRef<AudioPlayerHandle | null>(null)
    const ignoreNextSeekRef = useRef(false)

    const [note, setNote] = useState<string>('')
    // removed unused seekStepMs
    const noteRef = useRef<HTMLTextAreaElement | null>(null)
    const [pressedReaction, setPressedReaction] = useState<-1 | 0 | 1 | 2 | 3 | null>(null)

    const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
        if (!el) return
        el.style.height = '0px'
        const next = Math.min(200, el.scrollHeight)
        el.style.height = `${next}px`
    }, [])

    const flashReaction = useCallback((r: -1 | 0 | 1 | 2 | 3, ms = 200) => {
        setPressedReaction(r)
        window.setTimeout(() => setPressedReaction(null), ms)
    }, [])

    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

    const seekToMs = useCallback((toMs: number) => {
        if (!durationMs) return
        const fromMs = currentMs
        const clamped = clamp(toMs, 0, durationMs)
        // Command the underlying wavesurfer to seek, source of truth
        try {
            ignoreNextSeekRef.current = true
            audioRef.current?.seekToMs(clamped)
        } catch { }
        // Local state will be kept in sync via onTimeUpdate/onSeek events
        localEventsRef.current.push({ type: 'SEEK', payload: { fromMs, toMs: clamped } })
    }, [durationMs, currentMs])

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

    // Remove hidden audio element integration; duration/currentMs handled by AudioPlayer callbacks

    // No nudge or segment boundaries

    const handleReaction = useCallback((reaction: -1 | 0 | 1 | 2 | 3) => {
        const eventName: ReactionType = reaction === 3 ? 'LOVE' : reaction === 2 ? 'FIRE' : reaction === 1 ? 'LIKE' : reaction === -1 ? 'DISLIKE' : 'NEUTRAL'
        const t = Math.max(0, Math.min(durationMs || 0, currentMs))
        const trimmed = (note || '').trim()
        localEventsRef.current.push({
            type: eventName,
            payload: { event: eventName, t, ...(trimmed ? { comment: trimmed } : {}) },
        })
        setNote('')
    }, [currentMs, durationMs, note])

    const handleAddNote = useCallback(() => {
        const text = (note || '').trim()
        if (!text) return
        const t = Math.max(0, Math.min(durationMs || 0, currentMs))
        localEventsRef.current.push({ type: 'COMMENT', payload: { t, text } })
        setNote('')
    }, [note, currentMs, durationMs])

    // UI

    return (
        <>
            {/* Fixed, transparent background layer */}
            <div className="pointer-events-none fixed inset-0 -z-10">
                <WavyBackground
                    backgroundFill="transparent"
                    colors={["#38bdf8", "#818cf8", "#c084fc", "#e879f9"]}
                    waveWidth={50}
                    blur={10}
                    speed="fast"
                    waveOpacity={0.35}
                    containerClassName="w-full h-full"
                />
            </div>

            <div className="min-h-screen w-full flex items-center justify-center">
                <div className="space-y-3 w-full max-w-[560px] px-4">
                    <div className="rounded p-4 text-center">
                        <AudioPlayer
                            ref={audioRef}
                            src={src}
                            currentMs={currentMs}
                            durationMs={durationMs}
                            isPlaying={isPlaying}
                            onTogglePlay={() => setIsPlaying((p) => !p)}
                            // Log user-initiated seeks; ignore one programmatic seek echo
                            onSeekToMs={useCallback((ms: number) => {
                                const nextMs = clamp(ms, 0, durationMs || 0)
                                if (ignoreNextSeekRef.current) {
                                    ignoreNextSeekRef.current = false
                                    setCurrentMs(nextMs)
                                    return
                                }
                                const fromMs = currentMs
                                setCurrentMs(nextMs)
                                localEventsRef.current.push({ type: 'SEEK', payload: { fromMs, toMs: nextMs } })
                            }, [currentMs, durationMs])}
                            onTimeUpdate={(ms) => setCurrentMs(ms)}
                            onReady={(durMs) => setDurationMs(durMs)}
                            onPlayingChange={(playing) => setIsPlaying(playing)}
                            onEnded={async () => {
                                if (sentRef.current) return
                                sentRef.current = true
                                const events = [...localEventsRef.current]
                                localEventsRef.current = []
                                await sendSessionPayload({ trackId, events })
                            }}
                        />
                        {/* No hidden audio element */}
                    </div>
                </div>
            </div>
            {/* Bottom input bar: full-width with reactions (left) and send (right) */}
            <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="px-4 py-3">
                    <div className="mb-2 flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className={`rounded-full ${pressedReaction === -1 ? 'bg-red-100 border-red-300 dark:bg-red-900/40 dark:border-red-700' : ''}`}
                            onClick={() => { flashReaction(-1); handleReaction(-1) }}
                            aria-label="Dislike"
                            aria-pressed={pressedReaction === -1}
                        >
                            <ThumbsDown className={`h-4 w-4 transition-transform duration-200 ease-out will-change-transform ${pressedReaction === -1 ? 'scale-125 -translate-y-0.5' : 'scale-100'}`} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className={`rounded-full ${pressedReaction === 0 ? 'bg-zinc-100 border-zinc-300 dark:bg-zinc-800/60 dark:border-zinc-700' : ''}`}
                            onClick={() => { flashReaction(0); handleReaction(0) }}
                            aria-label="Neutral"
                            aria-pressed={pressedReaction === 0}
                        >
                            <Meh className={`h-4 w-4 transition-transform duration-200 ease-out will-change-transform ${pressedReaction === 0 ? 'scale-125 -translate-y-0.5' : 'scale-100'}`} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className={`rounded-full ${pressedReaction === 2 ? 'bg-orange-100 border-orange-300 dark:bg-orange-900/40 dark:border-orange-700' : ''}`}
                            onClick={() => { flashReaction(2); handleReaction(2) }}
                            aria-label="Super like"
                            aria-pressed={pressedReaction === 2}
                        >
                            <Flame className={`h-4 w-4 transition-transform duration-200 ease-out will-change-transform ${pressedReaction === 2 ? 'scale-125 -translate-y-0.5' : 'scale-100'}`} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className={`rounded-full ${pressedReaction === 1 ? 'bg-green-100 border-green-300 dark:bg-green-900/40 dark:border-green-700' : ''}`}
                            onClick={() => { flashReaction(1); handleReaction(1) }}
                            aria-label="Like"
                            aria-pressed={pressedReaction === 1}
                        >
                            <ThumbsUp className={`h-4 w-4 transition-transform duration-200 ease-out will-change-transform ${pressedReaction === 1 ? 'scale-125 -translate-y-0.5' : 'scale-100'}`} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className={`rounded-full ${pressedReaction === 3 ? 'bg-rose-100 border-rose-300 dark:bg-rose-900/40 dark:border-rose-700' : ''}`}
                            onClick={() => { flashReaction(3); handleReaction(3) }}
                            aria-label="Love"
                            aria-pressed={pressedReaction === 3}
                        >
                            <Heart className={`h-4 w-4 transition-transform duration-200 ease-out will-change-transform ${pressedReaction === 3 ? 'scale-125 -translate-y-0.5' : 'scale-100'}`} />
                        </Button>
                    </div>
                    <div className="relative">
                        <textarea
                            id="note"
                            ref={noteRef}
                            value={note}
                            onChange={(e) => { setNote(e.currentTarget.value); autoResize(e.currentTarget) }}
                            onInput={(e) => autoResize(e.currentTarget as HTMLTextAreaElement)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote() } }}
                            placeholder="Add a short note (optional)"
                            aria-label="Optional note"
                            rows={1}
                            className="font-mono w-full min-h-12 max-h-40 rounded-2xl pl-4 pr-14 py-3 resize-none bg-background border-0 focus:border-0 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0"
                        />
                        <Button
                            variant="default"
                            size="icon"
                            className="absolute right-2 bottom-2 rounded-full"
                            onClick={handleAddNote}
                            aria-label="Send note"
                        >
                            <ArrowUp className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </>
    )
}
// end of file
