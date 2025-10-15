"use client"

import React from "react"
import { Pause, Play, ThumbsUp, ThumbsDown, RotateCcw, SkipForward } from "lucide-react";

export default function AudioPlayerImproved({
  src,
  currentMs = 0,
  durationMs = 0,
  isPlaying = false,
  onTogglePlay,
  onSwipeLeft,
  onSwipeRight,
  onSeek,
}: {
  src?: string;
  currentMs?: number;
  durationMs?: number;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSeek?: (ms: number) => void;
}) {
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const pct = durationMs > 0 ? clamp((currentMs / durationMs) * 100, 0, 100) : 0;
  const CHUNK_MS = 10_000;
  const segmentsCount = durationMs > 0 ? Math.ceil(durationMs / CHUNK_MS) : 0;
  const currentIndex = segmentsCount > 0 ? Math.min(segmentsCount - 1, Math.floor(currentMs / CHUNK_MS)) : 0;
  const barRef = React.useRef<HTMLDivElement | null>(null);
  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || !barRef.current || durationMs <= 0) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    const ratio = x / rect.width;
    onSeek(Math.round(durationMs * ratio));
  };
  const formatMs = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  const handleReplaySection = () => {
    if (!onSeek || durationMs <= 0) return;
    const startMs = Math.max(0, currentIndex * CHUNK_MS);
    onSeek(startMs);
  };
  const handleSkipSection = () => {
    if (!onSeek || durationMs <= 0) return;
    const endMs = Math.min(durationMs, (currentIndex + 1) * CHUNK_MS);
    onSeek(endMs);
  };

  // Wavesurfer waveform
  const waveRef = React.useRef<HTMLDivElement | null>(null);
  const wsRef = React.useRef<any>(null);
  React.useEffect(() => {
    let ws: any;
    let cancelled = false;
    async function setup() {
      if (!waveRef.current || !src) return;
      const WaveSurfer = (await import('wavesurfer.js')).default;
      if (cancelled) return;
      ws = WaveSurfer.create({
        container: waveRef.current,
        waveColor: '#d4d4d8', // zinc-300
        progressColor: '#000000',
        cursorColor: '#000000',
        barWidth: 2,
        barGap: 10,
        height: 84,
        responsive: true,
        interact: true,
      });
      wsRef.current = ws;
      ws.load(src);
      ws.on('seek', (progress: number) => {
        if (!onSeek || !durationMs) return;
        onSeek(Math.round(durationMs * progress));
      });
    }
    setup();
    return () => {
      cancelled = true;
      try { ws?.destroy(); } catch {}
      wsRef.current = null;
    };
  }, [src]);

  // Sync external playback position to waveform cursor
  React.useEffect(() => {
    const ws = wsRef.current;
    if (!ws || !durationMs || durationMs <= 0) return;
    const ratio = clamp(currentMs / durationMs, 0, 1);
    try { ws.seekTo(ratio); } catch {}
  }, [currentMs, durationMs]);

  return (
    <div className="w-full max-w-[480px] mx-auto rounded-2xl p-6">
      {/* Waveform (Wavesurfer.js) */}
      <div className="relative w-full select-none">
        <div ref={waveRef} className="h-24 w-full" />
      </div>

      {/* Segmented chunk rail (10s) with playhead and click-to-seek */}
      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between text-xs text-zinc-700">
          <span className="font-mono">Section {segmentsCount ? Math.min(currentIndex + 1, segmentsCount) : 0} of {segmentsCount}</span>
          <span>{formatMs(currentMs)}</span>
        </div>
      </div>

      {/* Transport controls (bottom center) */}
      <div className="mt-6 flex items-center justify-center gap-6">
      <button
          className="rounded-full p-3 text-zinc-800 transition hover:bg-zinc-200/70 active:scale-95 cursor-pointer"
          aria-label="Replay section"
          onClick={handleReplaySection}
        >
          <RotateCcw className="h-7 w-7" />
        </button>
        <button
          className="rounded-full p-3 text-zinc-800 transition hover:bg-zinc-200/70 active:scale-95 cursor-pointer"
          aria-label="Previous"
          onClick={onSwipeLeft}
        >
          <ThumbsDown className="h-7 w-7" />
        </button>

        <button
          className="grid h-16 w-16 place-items-center rounded-full bg-zinc-900 text-zinc-50 shadow-sm transition hover:bg-zinc-800 active:scale-95 cursor-pointer"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={onTogglePlay}
        >
          {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
        </button>

        <button
          className="rounded-full p-3 text-zinc-800 transition hover:bg-zinc-200/70 active:scale-95 cursor-pointer"
          aria-label="Next"
          onClick={onSwipeRight}
        >
          <ThumbsUp className="h-7 w-7" />
        </button>
        <button
          className="rounded-full p-3 text-zinc-800 transition hover:bg-zinc-200/70 active:scale-95 cursor-pointer"
          aria-label="Skip section"
          onClick={handleSkipSection}
        >
          <SkipForward className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}