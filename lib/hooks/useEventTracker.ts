'use client';

import { useEffect, useRef, useState } from 'react';
import type { ClientEvent, EventKind, EmojiType } from '@/lib/types/events';

interface UseEventTrackerOptions {
  songVersionId: string;
  audioRef: React.RefObject<HTMLAudioElement>;
}

export function useEventTracker({ songVersionId, audioRef }: UseEventTrackerOptions) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const eventQueue = useRef<ClientEvent[]>([]);
  const flushTimer = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Initialize session
  useEffect(() => {
    async function initSession() {
      try {
        const response = await fetch('/api/sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songVersionId }),
        });

        if (!response.ok) {
          throw new Error('Failed to start session');
        }

        const data = await response.json();
        setSessionId(data.sessionId);
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize session:', error);
      }
    }

    initSession();

    // Cleanup on unmount
    return () => {
      if (sessionId) {
        completeSession();
      }
    };
  }, [songVersionId]);

  // Set up auto-flush timer
  useEffect(() => {
    if (!isReady) return;

    flushTimer.current = setInterval(() => {
      flushEvents();
    }, 1000); // Flush every 1 second

    return () => {
      if (flushTimer.current) {
        clearInterval(flushTimer.current);
      }
    };
  }, [isReady, sessionId]);

  // Set up beacon flush on page unload
  useEffect(() => {
    if (!isReady || !sessionId) return;

    const handleBeforeUnload = () => {
      flushEventsBeacon();
      completeSessionBeacon();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isReady, sessionId]);

  const createEvent = (kind: EventKind, payload?: ClientEvent['payload']): ClientEvent => {
    const audio = audioRef.current;
    return {
      client_event_id: crypto.randomUUID(),
      t_ms: Math.round((audio?.currentTime || 0) * 1000),
      wall_ts: new Date().toISOString(),
      kind,
      payload,
    };
  };

  const queueEvent = (event: ClientEvent) => {
    eventQueue.current.push(event);

    // Flush if queue reaches 50 events
    if (eventQueue.current.length >= 50) {
      flushEvents();
    }
  };

  const flushEvents = async () => {
    if (!sessionId || eventQueue.current.length === 0) return;

    const events = [...eventQueue.current];
    eventQueue.current = [];

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, events }),
      });

      if (!response.ok) {
        throw new Error('Failed to send events');
      }

      retryCount.current = 0;
    } catch (error) {
      console.error('Failed to flush events:', error);

      // Retry with exponential backoff
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        const backoff = Math.pow(2, retryCount.current) * 1000;
        setTimeout(() => {
          eventQueue.current.unshift(...events);
          flushEvents();
        }, backoff);
      }
    }
  };

  const flushEventsBeacon = () => {
    if (!sessionId || eventQueue.current.length === 0) return;

    const events = [...eventQueue.current];
    eventQueue.current = [];

    const blob = new Blob(
      [JSON.stringify({ sessionId, events })],
      { type: 'application/json' }
    );

    navigator.sendBeacon('/api/events', blob);
  };

  const completeSession = async () => {
    if (!sessionId) return;

    try {
      await fetch('/api/sessions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  };

  const completeSessionBeacon = () => {
    if (!sessionId) return;

    const blob = new Blob(
      [JSON.stringify({ sessionId })],
      { type: 'application/json' }
    );

    navigator.sendBeacon('/api/sessions/complete', blob);
  };

  // Event tracking methods
  const trackPlay = (from_ms?: number) => {
    const event = createEvent('play', { from_ms });
    queueEvent(event);

    // Start heartbeat
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
    }
    heartbeatTimer.current = setInterval(() => {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        const event = createEvent('heartbeat', {
          position_ms: Math.round(audio.currentTime * 1000),
        });
        queueEvent(event);
      }
    }, 5000); // Every 5 seconds
  };

  const trackPause = (at_ms?: number) => {
    const event = createEvent('pause', { at_ms });
    queueEvent(event);

    // Stop heartbeat
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  };

  const trackSeek = (from_ms: number, to_ms: number) => {
    const event = createEvent('seek', { from_ms, to_ms });
    queueEvent(event);
  };

  const trackSkip = () => {
    const audio = audioRef.current;
    const event = createEvent('skip', { at_ms: Math.round((audio?.currentTime || 0) * 1000) });
    queueEvent(event);
  };

  const trackReaction = (emoji: EmojiType) => {
    const event = createEvent('reaction', { emoji });
    queueEvent(event);
  };

  const trackVisibility = (state: 'visible' | 'hidden') => {
    const event = createEvent('visibility', { state });
    queueEvent(event);
  };

  const trackFocus = (state: 'focus' | 'blur') => {
    const event = createEvent('focus', { state });
    queueEvent(event);
  };

  // Set up visibility and focus tracking
  useEffect(() => {
    if (!isReady) return;

    const handleVisibilityChange = () => {
      trackVisibility(document.hidden ? 'hidden' : 'visible');
    };

    const handleFocus = () => trackFocus('focus');
    const handleBlur = () => trackFocus('blur');

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isReady]);

  return {
    isReady,
    sessionId,
    trackPlay,
    trackPause,
    trackSeek,
    trackSkip,
    trackReaction,
  };
}

