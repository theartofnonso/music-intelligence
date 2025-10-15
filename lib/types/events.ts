// Client event types

export type EventKind =
  | 'play'
  | 'pause'
  | 'seek'
  | 'skip'
  | 'reaction'
  | 'visibility'
  | 'focus'
  | 'heartbeat';

export type EmojiType = '🔥' | '😍' | '😴' | '🤔';

export interface ClientEvent {
  client_event_id: string; // uuid
  t_ms: number; // audio position in milliseconds
  wall_ts: string; // ISO timestamp
  kind: EventKind;
  payload?: {
    // For seek events
    from_ms?: number;
    to_ms?: number;
    // For visibility/focus events
    state?: 'visible' | 'hidden' | 'focus' | 'blur';
    // For reaction events
    emoji?: EmojiType;
    // For play events
    from_ms?: number;
    // For pause/skip events
    at_ms?: number;
    // For heartbeat events
    position_ms?: number;
  };
}

export interface SessionStartResponse {
  sessionId: string;
  audioUrl: string;
  durationMs: number;
}

export interface EventBatch {
  sessionId: string;
  events: ClientEvent[];
}

