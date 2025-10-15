'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEventTracker } from '@/lib/hooks/useEventTracker';
import { Play, Pause, SkipForward } from 'lucide-react';
import type { EmojiType } from '@/lib/types/events';

interface PlayerProps {
  songVersionId: string;
  audioUrl: string;
  durationMs: number;
}

export function Player({ songVersionId, audioUrl, durationMs }: PlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekingFrom, setSeekingFrom] = useState<number | null>(null);

  const {
    isReady,
    trackPlay,
    trackPause,
    trackSeek,
    trackSkip,
    trackReaction,
  } = useEventTracker({
    songVersionId,
    audioRef,
  });

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isReady) return;

    const handlePlay = () => {
      setIsPlaying(true);
      trackPlay(Math.round(audio.currentTime * 1000));
    };

    const handlePause = () => {
      setIsPlaying(false);
      trackPause(Math.round(audio.currentTime * 1000));
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleSeeking = () => {
      setSeekingFrom(audio.currentTime);
    };

    const handleSeeked = () => {
      if (seekingFrom !== null) {
        trackSeek(
          Math.round(seekingFrom * 1000),
          Math.round(audio.currentTime * 1000)
        );
        setSeekingFrom(null);
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('seeking', handleSeeking);
    audio.addEventListener('seeked', handleSeeked);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('seeking', handleSeeking);
      audio.removeEventListener('seeked', handleSeeked);
    };
  }, [isReady, seekingFrom, trackPlay, trackPause, trackSeek]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  const handleSkip = () => {
    trackSkip();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleEmojiClick = (emoji: EmojiType) => {
    trackReaction(emoji);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const emojis: EmojiType[] = ['🔥', '😍', '😴', '🤔'];

  return (
    <Card className="p-6">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="space-y-6">
        {/* Time Display */}
        <div className="text-center text-sm text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(durationMs / 1000)}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            size="lg"
            variant="default"
            onClick={togglePlayPause}
            disabled={!isReady}
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={handleSkip}
            disabled={!isReady}
          >
            <SkipForward className="h-5 w-5" />
            <span className="ml-2">Skip</span>
          </Button>
        </div>

        {/* Emoji Reactions */}
        <div className="flex items-center justify-center gap-3">
          {emojis.map((emoji) => (
            <Button
              key={emoji}
              size="lg"
              variant="ghost"
              className="text-3xl hover:scale-110 transition-transform"
              onClick={() => handleEmojiClick(emoji)}
              disabled={!isReady}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}

