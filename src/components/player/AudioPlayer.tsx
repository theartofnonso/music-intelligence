"use client"

import React from "react"
import { Pause, Play, ThumbsUp, ThumbsDown } from "lucide-react";

export default function AudioPlayerImproved({
  currentMs = 0,
  durationMs = 0,
  isPlaying = false,
  onTogglePlay,
  onSwipeLeft,
  onSwipeRight,
  onSeek,
}: {
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

  return (
    <div className="w-full max-w-[480px] mx-auto rounded-2xl bg-zinc-100 p-6 shadow-sm ring-1 ring-zinc-200">
      {/* Record Graphic */}
      <div className="relative aspect-square w-full select-none">
        {/* Disc */}
        <div className="absolute inset-0 rounded-full bg-indigo-600/90" />
        {/* Center hole */}
        <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-100 shadow-inner" />
        {/* Notches */}
        <div className="absolute left-1/2 top-[26%] h-8 w-2 -translate-x-1/2 rotate-25 rounded-sm bg-zinc-100/90" />
        <div className="absolute left-1/2 bottom-[26%] h-8 w-2 -translate-x-1/2 -rotate-25 rounded-sm bg-zinc-100/90" />
        {/* Inner ring */}
        <div className="absolute inset-5 rounded-full ring-1 ring-indigo-700/40" />
      </div>
      {/* Segmented chunk rail (10s) with playhead and click-to-seek */}
      <div className="mt-6 space-y-2">
        <div
          ref={barRef}
          onClick={handleSeekClick}
          className="relative w-full select-none cursor-pointer"
          role={onSeek ? "slider" : undefined}
          aria-label="Seek by segment"
        >
          <div className="flex w-full gap-[2px]">
            {Array.from({ length: segmentsCount }).map((_, i) => {
              const isCurrent = i === currentIndex;
              return (
                <div key={`seg-${i}`} className={`h-2 flex-1 bg-zinc-300 ${isCurrent ? 'ring-1 ring-foreground/60' : ''}`} />
              );
            })}
          </div>
          <div className="pointer-events-none absolute left-0 top-[-3px] h-[14px] w-full">
            <div className="absolute top-0 h-full w-[2px] bg-foreground" style={{ left: `${pct}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-700">
          <span>Chunk {segmentsCount ? Math.min(currentIndex + 1, segmentsCount) : 0} / {segmentsCount}</span>
          <span>{CHUNK_MS / 1000}s segments</span>
        </div>
      </div>

      {/* Transport controls (bottom center) */}
      <div className="mt-6 flex items-center justify-center gap-6">
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
      </div>
    </div>
  );
}