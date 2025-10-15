import { createServerClient } from '@/lib/supabase/server';

interface PlaySegment {
  start_ms: number;
  end_ms: number;
}

interface SessionData {
  session_id: string;
  events: Array<{
    t_ms: number;
    wall_ts: string;
    kind: string;
    payload: any;
  }>;
}

interface TimelineBin {
  plays_at_risk: number;
  skips: number;
  replays: number;
  reactions: number;
  focus_visible: number;
  focus_total: number;
}

export async function buildTimelineStats(songVersionId: string): Promise<Map<number, TimelineBin>> {
  const supabase = createServerClient();

  // Fetch all sessions for this song version
  const { data: sessions, error: sessionsError } = await supabase
    .from('listening_sessions')
    .select('id')
    .eq('song_version_id', songVersionId);

  if (sessionsError || !sessions) {
    throw new Error('Failed to fetch sessions');
  }

  const sessionIds = sessions.map((s) => s.id);

  if (sessionIds.length === 0) {
    return new Map();
  }

  // Fetch all events for these sessions
  const { data: events, error: eventsError } = await supabase
    .from('listening_events')
    .select('session_id, t_ms, wall_ts, kind, payload')
    .in('session_id', sessionIds)
    .order('session_id', { ascending: true })
    .order('t_ms', { ascending: true });

  if (eventsError || !events) {
    throw new Error('Failed to fetch events');
  }

  // Group events by session
  const sessionMap = new Map<string, SessionData>();
  for (const event of events) {
    if (!sessionMap.has(event.session_id)) {
      sessionMap.set(event.session_id, {
        session_id: event.session_id,
        events: [],
      });
    }
    sessionMap.get(event.session_id)!.events.push(event);
  }

  // Initialize timeline bins
  const timeline = new Map<number, TimelineBin>();

  // Process each session
  for (const sessionData of sessionMap.values()) {
    processSession(sessionData, timeline);
  }

  return timeline;
}

function processSession(sessionData: SessionData, timeline: Map<number, TimelineBin>) {
  const { events } = sessionData;

  // Build play segments
  const playSegments = buildPlaySegments(events);

  // Track skip status
  let hasSkipped = false;

  // Track focus/visibility state
  let isFocused = true;
  let isVisible = true;

  // Process each event
  for (const event of events) {
    const bin_s = Math.floor(event.t_ms / 1000);

    // Ensure bin exists
    if (!timeline.has(bin_s)) {
      timeline.set(bin_s, {
        plays_at_risk: 0,
        skips: 0,
        replays: 0,
        reactions: 0,
        focus_visible: 0,
        focus_total: 0,
      });
    }

    const bin = timeline.get(bin_s)!;

    // Track skip events
    if (event.kind === 'skip') {
      bin.skips++;
      hasSkipped = true;
    }

    // Track reactions
    if (event.kind === 'reaction') {
      bin.reactions++;
    }

    // Update focus/visibility state
    if (event.kind === 'focus') {
      isFocused = event.payload?.state === 'focus';
    }
    if (event.kind === 'visibility') {
      isVisible = event.payload?.state === 'visible';
    }

    // Detect replays (backward seeks >= 2000ms)
    if (event.kind === 'seek') {
      const from_ms = event.payload?.from_ms || 0;
      const to_ms = event.payload?.to_ms || 0;
      if (from_ms - to_ms >= 2000) {
        const replay_bin_s = Math.floor(to_ms / 1000);
        if (!timeline.has(replay_bin_s)) {
          timeline.set(replay_bin_s, {
            plays_at_risk: 0,
            skips: 0,
            replays: 0,
            reactions: 0,
            focus_visible: 0,
            focus_total: 0,
          });
        }
        timeline.get(replay_bin_s)!.replays++;
      }
    }
  }

  // Mark bins as at-risk if session was active and hadn't skipped
  for (const segment of playSegments) {
    const start_s = Math.floor(segment.start_ms / 1000);
    const end_s = Math.floor(segment.end_ms / 1000);

    for (let s = start_s; s <= end_s; s++) {
      if (!timeline.has(s)) {
        timeline.set(s, {
          plays_at_risk: 0,
          skips: 0,
          replays: 0,
          reactions: 0,
          focus_visible: 0,
          focus_total: 0,
        });
      }

      const bin = timeline.get(s)!;
      bin.plays_at_risk++;
      bin.focus_total++;

      // Check if focused and visible at this time
      // For simplicity, we'll look at the state during this segment
      const binEvents = events.filter((e) => Math.floor(e.t_ms / 1000) === s);
      let segmentFocused = true;
      let segmentVisible = true;

      for (const e of binEvents) {
        if (e.kind === 'focus' && e.payload?.state === 'blur') {
          segmentFocused = false;
        }
        if (e.kind === 'visibility' && e.payload?.state === 'hidden') {
          segmentVisible = false;
        }
      }

      if (segmentFocused && segmentVisible) {
        bin.focus_visible++;
      }
    }
  }
}

function buildPlaySegments(events: any[]): PlaySegment[] {
  const segments: PlaySegment[] = [];
  let currentStart: number | null = null;
  let lastPosition = 0;

  for (const event of events) {
    if (event.kind === 'play') {
      currentStart = event.payload?.from_ms || event.t_ms || 0;
      lastPosition = currentStart;
    } else if (event.kind === 'pause' && currentStart !== null) {
      segments.push({
        start_ms: currentStart,
        end_ms: event.payload?.at_ms || event.t_ms || lastPosition,
      });
      currentStart = null;
    } else if (event.kind === 'seek') {
      if (currentStart !== null) {
        // End current segment
        segments.push({
          start_ms: currentStart,
          end_ms: event.payload?.from_ms || lastPosition,
        });
      }
      // Start new segment at seek destination
      currentStart = event.payload?.to_ms || event.t_ms || 0;
      lastPosition = currentStart;
    } else if (event.kind === 'skip') {
      if (currentStart !== null) {
        segments.push({
          start_ms: currentStart,
          end_ms: event.payload?.at_ms || event.t_ms || lastPosition,
        });
      }
      currentStart = null;
    } else if (event.kind === 'heartbeat') {
      lastPosition = event.payload?.position_ms || event.t_ms || lastPosition;
    }
  }

  // If still playing at the end, close the segment
  if (currentStart !== null) {
    segments.push({
      start_ms: currentStart,
      end_ms: lastPosition,
    });
  }

  return segments;
}

