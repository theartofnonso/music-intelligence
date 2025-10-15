'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Player } from '@/components/Player';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { Music } from 'lucide-react';

interface SongVersionData {
  id: string;
  label: string;
  audio_url: string;
  duration_ms: number;
  songs: {
    title: string;
  };
}

export default function ListenPage() {
  const params = useParams();
  const songVersionId = params.songVersionId as string;
  const [songVersion, setSongVersion] = useState<SongVersionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchSongVersion() {
      try {
        const { data, error } = await supabase
          .from('song_versions')
          .select(`
            id,
            label,
            audio_url,
            duration_ms,
            songs (
              title
            )
          `)
          .eq('id', songVersionId)
          .single();

        if (error || !data) {
          setError('Song not found');
          return;
        }

        setSongVersion(data as any);
      } catch (err) {
        setError('Failed to load song');
      } finally {
        setLoading(false);
      }
    }

    fetchSongVersion();
  }, [songVersionId]);

  if (loading) {
    return (
      <div className="container mx-auto py-10 max-w-2xl">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (error || !songVersion) {
    return (
      <div className="container mx-auto py-10 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-red-600">{error || 'Song not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <div className="space-y-6">
        {/* Song Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-6 w-6" />
                  {songVersion.songs.title}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant="secondary">{songVersion.label}</Badge>
                  <span>Duration: {Math.round(songVersion.duration_ms / 1000)}s</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Listen to this unreleased track and share your reactions. Your engagement helps us understand what resonates with listeners.
            </p>
          </CardContent>
        </Card>

        {/* Player */}
        <Player
          songVersionId={songVersionId}
          audioUrl={songVersion.audio_url}
          durationMs={songVersion.duration_ms}
        />

        {/* Instructions */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>How to use:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Press Play to start listening</li>
                <li>Click emoji buttons to share your reaction at any moment</li>
                <li>Press Skip if you want to stop listening</li>
                <li>Your interactions are captured anonymously to help improve the music</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

