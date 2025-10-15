import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { ClientEvent } from '@/lib/types/events';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, events } = await request.json();

    if (!sessionId || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'sessionId and events array are required' },
        { status: 400 }
      );
    }

    // Validate event structure
    for (const event of events) {
      if (
        !event.client_event_id ||
        typeof event.t_ms !== 'number' ||
        !event.wall_ts ||
        !event.kind
      ) {
        return NextResponse.json(
          { error: 'Invalid event structure' },
          { status: 400 }
        );
      }
    }

    const supabase = createServerClient();

    // Transform events for insertion
    const dbEvents = events.map((event: ClientEvent) => ({
      session_id: sessionId,
      t_ms: Math.round(event.t_ms),
      wall_ts: event.wall_ts,
      kind: event.kind,
      payload: event.payload || null,
      client_event_id: event.client_event_id,
    }));

    // Batch insert with ON CONFLICT DO NOTHING for idempotency
    const { error } = await supabase
      .from('listening_events')
      .upsert(dbEvents, {
        onConflict: 'session_id,client_event_id',
        ignoreDuplicates: true,
      });

    if (error) {
      console.error('Event insert error:', error);
      return NextResponse.json(
        { error: 'Failed to insert events' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

