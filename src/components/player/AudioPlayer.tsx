"use client"

import React from "react"
import { Star, SkipBack, Pause, Play, SkipForward, ThumbsUp, ThumbsDown } from "lucide-react";

/**
 * AudioPlayerImproved — redesigned to match the reference mock.
 * Tailwind + lucide-react only. Accessible, responsive, and prop-driven.
 *
 * Props mirror your original component (plus a few optional display fields):
 * - title?: string
 * - artist?: string
 * - credits?: string
 * - currentMs?: number
 * - durationMs?: number
 * - isPlaying?: boolean
 * - favorite?: boolean
 * - onTogglePlay?: () => void
 * - onPrev?: () => void
 * - onNext?: () => void
 * - onToggleFavorite?: () => void
 * - onSeek?: (ms: number) => void
 */
export default function AudioPlayerImproved({
  title = "So What",
  currentMs = 0,
  durationMs = 0,
  isPlaying = false,
  favorite = false,
  onTogglePlay,
  onSwipeLeft,
  onSwipeRight,
  onToggleFavorite,
  onSeek,
}: {
  title?: string;
  artist?: string;
  credits?: string;
  currentMs?: number;
  durationMs?: number;
  isPlaying?: boolean;
  favorite?: boolean;
  onTogglePlay?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onToggleFavorite?: () => void;
  onSeek?: (ms: number) => void;
}) {
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const pct = durationMs > 0 ? clamp((currentMs / durationMs) * 100, 0, 100) : 0;

  const fmt = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const remainingMs = Math.max(0, durationMs - currentMs);

  // Click-to-seek on progress bar
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

      {/* Progress + tick ruler + times */}
      <div className="mt-6">
        <div
          ref={barRef}
          onClick={handleSeekClick}
          className="relative h-2 w-full cursor-pointer overflow-hidden rounded-full bg-zinc-300"
          role={onSeek ? "slider" : undefined}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label="Seek"
        >
          <div className="absolute inset-y-0 left-0 bg-zinc-900" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-2 flex items-center justify-between text-sm tabular-nums text-zinc-700">
          <span>{fmt(currentMs)}</span>
          <span>-{fmt(remainingMs)}</span>
        </div>
      </div>

      {/* Transport controls (bottom center) */}
      <div className="mt-6 flex items-center justify-center gap-6">
        <button
          className="rounded-full p-3 text-zinc-800 transition hover:bg-zinc-200/70 active:scale-95"
          aria-label="Previous"
          onClick={onSwipeLeft}
        >
          <ThumbsDown className="h-7 w-7" />
        </button>

        <button
          className="grid h-16 w-16 place-items-center rounded-full bg-zinc-900 text-zinc-50 shadow-sm transition hover:bg-zinc-800 active:scale-95"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={onTogglePlay}
        >
          {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
        </button>

        <button
          className="rounded-full p-3 text-zinc-800 transition hover:bg-zinc-200/70 active:scale-95"
          aria-label="Next"
          onClick={onSwipeRight}
        >
          <ThumbsUp className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}

/*
If your Tailwind config doesn't allow arbitrary rotate classes, add this to globals.css:
.rotate-25 { transform: rotate(25deg); }
*/
