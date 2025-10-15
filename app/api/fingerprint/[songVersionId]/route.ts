import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { computeEngagementFingerprint } from '@/lib/aggregation/fingerprint';

export async function GET(
  request: NextRequest,
  { params }: { params: { songVersionId: string } }
) {
  try {
    const { songVersionId } = params;

    if (!songVersionId) {
      return NextResponse.json(
        { error: 'songVersionId is required' },
        { status: 400 }
      );
    }

    // Compute the engagement fingerprint
    const fingerprint = await computeEngagementFingerprint(songVersionId);

    // Upsert to database
    const supabase = createServerClient();
    const { error } = await supabase
      .from('engagement_fingerprints')
      .upsert({
        song_version_id: songVersionId,
        version: fingerprint.version,
        features: fingerprint as any,
        computed_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to save fingerprint:', error);
      // Continue and return the computed fingerprint anyway
    }

    return NextResponse.json(fingerprint);
  } catch (error) {
    console.error('Fingerprint computation error:', error);
    return NextResponse.json(
      { error: 'Failed to compute fingerprint' },
      { status: 500 }
    );
  }
}

