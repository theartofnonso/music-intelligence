"use client"

import React from "react"
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button"
import { useWavesurfer } from "@wavesurfer/react"

export default function AudioPlayer({
  src,
  currentMs = 0,
  durationMs = 0,
  isPlaying = false,
  onTogglePlay,
  onSeekToMs,
  onTimeUpdate,
  onReady,
  onEnded,
}: {
  src?: string;
  currentMs?: number;
  durationMs?: number;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onSeekToMs?: (ms: number) => void;
  onTimeUpdate?: (ms: number) => void;
  onReady?: (durationMs: number) => void;
  onEnded?: () => void;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    height: 54,
    waveColor: '#d4d4d8',
    progressColor: '#000000',
    cursorColor: '#000000',
    url: src,
  })

  // Events
  React.useEffect(() => {
    const ws = wavesurfer as any
    if (!ws) return
    const onSeek = (ratio: number) => {
      const dur = Math.max(0, Math.round((ws.getDuration?.() || 0) * 1000))
      const ms = Math.max(0, Math.min(dur, Math.round((ratio || 0) * dur)))
      if (typeof onSeekToMs === 'function') onSeekToMs(ms)
    }
    const onTime = (t: number) => { if (typeof onTimeUpdate === 'function') onTimeUpdate(Math.max(0, Math.round((t || 0) * 1000))) }
    const onReadyCb = () => {
      const dur = Math.max(0, Math.round((ws.getDuration?.() || 0) * 1000))
      if (typeof onReady === 'function') onReady(dur)
    }
    const onFinish = () => { if (typeof onEnded === 'function') onEnded() }
    try {
      ws.on('seek', onSeek)
      ws.on('timeupdate', onTime)
      ws.on('ready', onReadyCb)
      ws.on('finish', onFinish)
      ws.on('click', () => { try { ws.play?.() } catch { } })
    } catch { }
    return () => {
      try {
        ws.un('seek', onSeek)
        ws.un('timeupdate', onTime)
        ws.un('ready', onReadyCb)
        ws.un('finish', onFinish)
      } catch { }
    }
  }, [wavesurfer, onSeekToMs, onTimeUpdate, onReady, onEnded])

  // external play/pause
  React.useEffect(() => {
    const ws = wavesurfer as any
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
}