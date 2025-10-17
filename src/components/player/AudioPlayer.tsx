"use client"

import React from "react"
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button"

export default function AudioPlayerImproved({
  src,
  currentMs = 0,
  durationMs = 0,
  isPlaying = false,
  onTogglePlay,
  disabledControls = false,
  stepMs,
}: {
  src?: string;
  currentMs?: number;
  durationMs?: number;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  disabledControls?: boolean;
  stepMs: number;
}) {

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const formatMs = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Wavesurfer waveform
  const waveRef = React.useRef<HTMLDivElement | null>(null);
  type WaveHandle = {
    load: (src: string) => void
    on: (event: string, cb: (arg: number) => void) => void
    destroy?: () => void
    seekTo?: (ratio: number) => void
  }
  const wsRef = React.useRef<WaveHandle | null>(null);
  const durationRef = React.useRef<number>(durationMs)
  React.useEffect(() => { durationRef.current = durationMs }, [durationMs])
  React.useEffect(() => {
    let ws: WaveHandle | null = null;
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
        interact: false,
      }) as WaveHandle;
      wsRef.current = ws;
      ws.load(src);
    }
    setup();
    return () => {
      cancelled = true;
      try { ws?.destroy?.(); } catch { }
      wsRef.current = null;
    };
  }, [src]);

  // Sync external playback position to waveform cursor
  React.useEffect(() => {
    const ws = wsRef.current;
    if (!ws || !durationMs || durationMs <= 0) return;
    const ratio = clamp(currentMs / durationMs, 0, 1);
    try { if (ws && typeof ws.seekTo === 'function') ws.seekTo(ratio); } catch { }
  }, [currentMs, durationMs]);

  // Transient pressed state for visual feedback
  const [pressed, setPressed] = React.useState<{ like: boolean }>({ like: false });
  const flashPressed = (key: keyof typeof pressed, ms = 180) => {
    setPressed((p) => ({ ...p, [key]: true }));
    window.setTimeout(() => setPressed((p) => ({ ...p, [key]: false })), ms);
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
          disabled={disabledControls}
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </Button>
        <div className="relative w-full select-none flex items-center">
          <div ref={waveRef} className="h-12 w-full" />
          {disabledControls && (
            <div className="absolute inset-0 z-10 cursor-not-allowed" aria-hidden="true" />
          )}
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