"use client"

import React from "react"
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button"

export default function AudioPlayerImproved({
  src,
  currentMs = 0,
  durationMs = 0,
  isPlaying = false,
  onTogglePlay,
  onSeek,
  disabledControls = false,
}: {
  src?: string;
  currentMs?: number;
  durationMs?: number;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onSeek?: (ms: number) => void;
  disabledControls?: boolean;
}) {

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const CHUNK_MS = 10_000;
  // Assumption: step size changed per requirement to 5 seconds (5_000 ms)
  const STEP_MS = 5_000;

  const formatMs = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  const handleReplaySection = () => {
    if (!onSeek || durationMs <= 0) return;
    // Prevent when controls are disabled
    if (disabledControls) return;
    flashPressed('replay');
    const toMs = Math.max(0, (currentMs || 0) - STEP_MS);
    onSeek(toMs);
  };
  const handleSkipSection = () => {
    if (!onSeek || durationMs <= 0) return;
    if (disabledControls) return;
    flashPressed('skip');
    const toMs = Math.min(durationMs, (currentMs || 0) + STEP_MS);
    onSeek(toMs);
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
        normalize: true,
        height: 54,
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
      try { ws?.destroy(); } catch { }
      wsRef.current = null;
    };
  }, [src]);

  // Sync external playback position to waveform cursor
  React.useEffect(() => {
    const ws = wsRef.current;
    if (!ws || !durationMs || durationMs <= 0) return;
    const ratio = clamp(currentMs / durationMs, 0, 1);
    try { ws.seekTo(ratio); } catch { }
  }, [currentMs, durationMs]);

  // Transient pressed state for visual feedback
  const [pressed, setPressed] = React.useState<{ replay: boolean; dislike: boolean; like: boolean; skip: boolean }>({ replay: false, dislike: false, like: false, skip: false });
  const flashPressed = (key: keyof typeof pressed, ms = 180) => {
    setPressed((p) => ({ ...p, [key]: true }));
    window.setTimeout(() => setPressed((p) => ({ ...p, [key]: false })), ms);
  };

  return (
    <div className="w-full max-w-[480px] mx-auto rounded-2xl p-6">
      {/* Waveform (Wavesurfer.js) */}
      <div className="relative w-full select-none">
        <div ref={waveRef} className="h-24 w-full" />
        {disabledControls && (
          <div className="absolute inset-0 z-10 cursor-not-allowed" aria-hidden="true" />
        )}
      </div>

      {/* Time readout */}
        <div className="flex items-center justify-between text-xs text-zinc-700">
          <span className="font-mono">{formatMs(currentMs)}</span>
          <span className="font-mono">{formatMs(durationMs)}</span>
        </div>

      {/* Transport controls (bottom center) */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          aria-label="Replay 10 seconds"
          onClick={handleReplaySection}
          aria-pressed={pressed.replay}
          className={`rounded-full active:scale-95 ${pressed.replay ? 'bg-red-500 text-white' : ''}`}
          disabled={disabledControls}
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
        <Button
          variant="default"
          size="icon-lg"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={onTogglePlay}
          className="rounded-full active:scale-95"
          disabled={disabledControls}
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Skip forward 10 seconds"
          onClick={handleSkipSection}
          aria-pressed={pressed.skip}
          className={`rounded-full active:scale-95 ${pressed.skip ? 'bg-emerald-500 text-white' : ''}`}
          disabled={disabledControls}
        >
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}