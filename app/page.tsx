'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase/client';
import { Upload, Link as LinkIcon, Music } from 'lucide-react';
import Link from 'next/link';

interface SongVersion {
  id: string;
  label: string;
  audio_url: string;
  duration_ms: number;
  created_at: string;
  song_id: string;
  songs: {
    title: string;
  };
}

export default function HomePage() {
  const [songTitle, setSongTitle] = useState('');
  const [versionLabel, setVersionLabel] = useState('v1');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedVersions, setUploadedVersions] = useState<SongVersion[]>([]);
  const [uploadMessage, setUploadMessage] = useState('');

  useEffect(() => {
    fetchSongVersions();
  }, []);

  const fetchSongVersions = async () => {
    const { data, error } = await supabase
      .from('song_versions')
      .select(`
        id,
        label,
        audio_url,
        duration_ms,
        created_at,
        song_id,
        songs (
          title
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUploadedVersions(data as any);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioUrl(''); // Clear URL input when file is selected
    }
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(Math.round(audio.duration * 1000));
      });
      audio.src = URL.createObjectURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadMessage('');

    try {
      let finalAudioUrl = audioUrl;
      let durationMs = 0;

      // Upload file to Supabase Storage if file is provided
      if (audioFile) {
        const fileName = `${Date.now()}-${audioFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audio')
          .upload(fileName, audioFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error('Failed to upload audio file');
        }

        const { data: urlData } = supabase.storage
          .from('audio')
          .getPublicUrl(uploadData.path);

        finalAudioUrl = urlData.publicUrl;
        durationMs = await getAudioDuration(audioFile);
      } else if (audioUrl) {
        // For URL input, we'll estimate duration or set a default
        // In production, you might want to fetch and analyze the audio
        durationMs = 180000; // Default 3 minutes
      } else {
        throw new Error('Please provide either a file or URL');
      }

      // Create song
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .insert({ title: songTitle })
        .select()
        .single();

      if (songError || !songData) {
        throw new Error('Failed to create song');
      }

      // Create song version
      const { data: versionData, error: versionError } = await supabase
        .from('song_versions')
        .insert({
          song_id: songData.id,
          label: versionLabel,
          audio_url: finalAudioUrl,
          duration_ms: durationMs,
        })
        .select()
        .single();

      if (versionError || !versionData) {
        throw new Error('Failed to create song version');
      }

      setUploadMessage(`Success! Song uploaded: ${songTitle} (${versionLabel})`);
      setSongTitle('');
      setVersionLabel('v1');
      setAudioUrl('');
      setAudioFile(null);
      fetchSongVersions();
    } catch (error: any) {
      setUploadMessage(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Music Intelligence</h1>
          <p className="text-muted-foreground">
            Upload unreleased tracks and capture listener engagement
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Upload Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Track
              </CardTitle>
              <CardDescription>
                Upload an audio file or provide a URL to create a shareable listen link
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Song Title</Label>
                  <Input
                    id="title"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    placeholder="Enter song title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="version">Version Label</Label>
                  <Input
                    id="version"
                    value={versionLabel}
                    onChange={(e) => setVersionLabel(e.target.value)}
                    placeholder="e.g., v1, v2, final-mix"
                    required
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="file">Upload Audio File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="text-center text-sm text-muted-foreground">OR</div>

                <div className="space-y-2">
                  <Label htmlFor="url">Audio URL</Label>
                  <Input
                    id="url"
                    type="url"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    placeholder="https://example.com/audio.mp3"
                    disabled={!!audioFile}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isUploading}>
                  {isUploading ? 'Uploading...' : 'Upload & Create Listen Link'}
                </Button>

                {uploadMessage && (
                  <p
                    className={`text-sm ${
                      uploadMessage.startsWith('Success') ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {uploadMessage}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Uploaded Songs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Uploaded Tracks
              </CardTitle>
              <CardDescription>
                Previously uploaded songs with listen links
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadedVersions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No tracks uploaded yet
                  </p>
                ) : (
                  uploadedVersions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{version.songs.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{version.label}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(version.duration_ms / 1000)}s
                          </span>
                        </div>
                      </div>
                      <Link href={`/listen/${version.id}`}>
                        <Button size="sm" variant="outline">
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Listen
                        </Button>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Link */}
        <div className="text-center">
          <Link href="/admin">
            <Button variant="outline">
              View Analytics Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
