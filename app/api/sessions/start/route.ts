import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { songVersionId } = await request.json();

    if (!songVersionId) {
      return NextResponse.json(
        { error: 'songVersionId is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch song version details
    const { data: songVersion, error: fetchError } = await supabase
      .from('song_versions')
      .select('id, audio_url, duration_ms')
      .eq('id', songVersionId)
      .single();

    if (fetchError || !songVersion) {
      return NextResponse.json(
        { error: 'Song version not found' },
        { status: 404 }
      );
    }

    // Create listening session
    const { data: session, error: sessionError } = await supabase
      .from('listening_sessions')
      .insert({
        song_version_id: songVersionId,
      })
      .select()
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId: session.id,
      audioUrl: songVersion.audio_url,
      durationMs: songVersion.duration_ms,
    });
  } catch (error) {
    console.error('Session start error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

