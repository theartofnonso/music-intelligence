"use client"

import React from "react"
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button"
import { useWavesurfer } from "@wavesurfer/react"

export type AudioPlayerHandle = {
  seekToMs: (ms: number) => void
}

const AudioPlayer = React.forwardRef<AudioPlayerHandle, {
  src?: string;
  currentMs?: number;
  durationMs?: number;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onSeekToMs?: (ms: number) => void;
  onTimeUpdate?: (ms: number) => void;
  onReady?: (durationMs: number) => void;
  onEnded?: () => void;
  onPlayingChange?: (playing: boolean) => void;
}>(function AudioPlayer(
  {
    src,
    currentMs = 0,
    durationMs = 0,
    isPlaying = false,
    onTogglePlay,
    onSeekToMs,
    onTimeUpdate,
    onReady,
    onEnded,
    onPlayingChange,
  },
  ref
) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  // Keep stable refs to callback props to avoid re-binding WS listeners
  const onSeekToMsRef = React.useRef<((ms: number) => void) | undefined>(onSeekToMs)
  const onTimeUpdateRef = React.useRef<((ms: number) => void) | undefined>(onTimeUpdate)
  const onReadyRef = React.useRef<((durationMs: number) => void) | undefined>(onReady)
  const onEndedRef = React.useRef<(() => void) | undefined>(onEnded)
  const onPlayingChangeRef = React.useRef<((playing: boolean) => void) | undefined>(onPlayingChange)

  React.useEffect(() => { onSeekToMsRef.current = onSeekToMs }, [onSeekToMs])
  React.useEffect(() => { onTimeUpdateRef.current = onTimeUpdate }, [onTimeUpdate])
  React.useEffect(() => { onReadyRef.current = onReady }, [onReady])
  React.useEffect(() => { onEndedRef.current = onEnded }, [onEnded])
  React.useEffect(() => { onPlayingChangeRef.current = onPlayingChange }, [onPlayingChange])
  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    height: 54,
    waveColor: '#d4d4d8',
    progressColor: '#000000',
    cursorColor: '#000000',
    url: src,
  })

  type WSLike = {
    getDuration?: () => number
    on?: (event: string, cb: (...args: unknown[]) => void) => void
    un?: (event: string, cb: (...args: unknown[]) => void) => void
    play?: () => void
    pause?: () => void
    setTime?: (seconds: number) => void
    seekTo?: (progress: number) => void
  }

  // Imperative external seek API
  React.useImperativeHandle(ref, () => ({
    seekToMs: (ms: number) => {
      const ws = wavesurfer as WSLike | null
      if (!ws) return
      try {
        const durationSec = Math.max(0, ws.getDuration?.() || 0)
        const clampedSec = durationSec > 0 ? Math.max(0, Math.min(durationSec, (ms || 0) / 1000)) : 0
        if (typeof ws.setTime === 'function') {
          ws.setTime(clampedSec)
          return
        }
        if (typeof ws.seekTo === 'function') {
          const ratio = durationSec > 0 ? clampedSec / durationSec : 0
          ws.seekTo(ratio)
        }
      } catch { }
    }
  }), [wavesurfer])

  // Events: bind once per wavesurfer instance, delegate to latest refs
  React.useEffect(() => {
    const ws = wavesurfer as WSLike | null
    if (!ws) return
    const onSeekHandler = (...args: unknown[]) => {
      const ratio = typeof args[0] === 'number' ? args[0] : Number(args[0] ?? 0)
      const dur = Math.max(0, Math.round((ws.getDuration?.() || 0) * 1000))
      const ms = Math.max(0, Math.min(dur, Math.round((ratio || 0) * dur)))
      const cb = onSeekToMsRef.current
      if (typeof cb === 'function') cb(ms)
    }
    const onTimeHandler = (...args: unknown[]) => {
      const t = typeof args[0] === 'number' ? args[0] : Number(args[0] ?? 0)
      const cb = onTimeUpdateRef.current
      if (typeof cb === 'function') cb(Math.max(0, Math.round((t || 0) * 1000)))
    }
    const onReadyHandler = () => {
      const dur = Math.max(0, Math.round((ws.getDuration?.() || 0) * 1000))
      const cb = onReadyRef.current
      if (typeof cb === 'function') cb(dur)
    }
    const onFinishHandler = () => {
      const cb = onEndedRef.current
      if (typeof cb === 'function') cb()
      const onPlayCb = onPlayingChangeRef.current
      if (typeof onPlayCb === 'function') onPlayCb(false)
    }
    const onPlayHandler = () => {
      const cb = onPlayingChangeRef.current
      if (typeof cb === 'function') cb(true)
    }
    const onPauseHandler = () => {
      const cb = onPlayingChangeRef.current
      if (typeof cb === 'function') cb(false)
    }
    try {
      ws.on?.('seek', onSeekHandler)
      ws.on?.('timeupdate', onTimeHandler)
      ws.on?.('ready', onReadyHandler)
      ws.on?.('finish', onFinishHandler)
      ws.on?.('play', onPlayHandler)
      ws.on?.('pause', onPauseHandler)
      ws.on?.('click', () => { try { ws.play?.() } catch { } })
    } catch { }
    return () => {
      try {
        ws.un?.('seek', onSeekHandler)
        ws.un?.('timeupdate', onTimeHandler)
        ws.un?.('ready', onReadyHandler)
        ws.un?.('finish', onFinishHandler)
        ws.un?.('play', onPlayHandler)
        ws.un?.('pause', onPauseHandler)
      } catch { }
    }
  }, [wavesurfer])

  // external play/pause
  React.useEffect(() => {
    const ws = wavesurfer as WSLike | null
    if (!ws) return
    try {
      if (isPlaying) { ws.play?.() } else { ws.pause?.() }
    } catch { }
  }, [wavesurfer, isPlaying])

  const formatMs = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-[480px] mx-auto rounded-2xl p-6">
      {/* Waveform (Wavesurfer.js) with play/pause control */}
      <div className="w-full flex items-center justify-center gap-3">
        <Button
          variant="default"
          size="icon-lg"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={onTogglePlay}
          className="rounded-full active:scale-95"
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </Button>
        <div className="relative w-full select-none flex items-center">
          <div ref={containerRef} className="h-12 w-full" />
        </div>
      </div>

      {/* Time readout */}
      <div className="flex items-center justify-between text-xs text-zinc-700 mt-4">
        <span className="font-mono">{formatMs(currentMs)}</span>
        <span className="font-mono">{formatMs(durationMs)}</span>
      </div>

      {/* Transport controls removed; play/pause is beside waveform */}
    </div>
  );
})

export default AudioPlayer