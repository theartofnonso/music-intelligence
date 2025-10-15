'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { BarChart, Music, TrendingDown, Users } from 'lucide-react';
import type { EngagementFingerprint } from '@/lib/aggregation/fingerprint';

interface SongVersion {
  id: string;
  label: string;
  duration_ms: number;
  songs: {
    title: string;
  };
}

interface TimelineData {
  bin_s: number;
  plays_at_risk: number;
  skips: number;
  replays: number;
  reactions: number;
  focus_visible: number;
  focus_total: number;
}

export default function AdminPage() {
  const [songVersions, setSongVersions] = useState<SongVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [fingerprint, setFingerprint] = useState<EngagementFingerprint | null>(null);
  const [isComputingFingerprint, setIsComputingFingerprint] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSongVersions();
  }, []);

  useEffect(() => {
    if (selectedVersion) {
      fetchVersionData(selectedVersion);
    }
  }, [selectedVersion]);

  const fetchSongVersions = async () => {
    const { data, error } = await supabase
      .from('song_versions')
      .select(`
        id,
        label,
        duration_ms,
        songs (
          title
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSongVersions(data as any);
      if (data.length > 0) {
        setSelectedVersion(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchVersionData = async (versionId: string) => {
    // Fetch session count
    const { data: sessions } = await supabase
      .from('listening_sessions')
      .select('id')
      .eq('song_version_id', versionId);

    setSessionCount(sessions?.length || 0);

    // Fetch timeline stats
    const { data: timelineData } = await supabase
      .from('timeline_stats')
      .select('*')
      .eq('song_version_id', versionId)
      .order('bin_s', { ascending: true });

    setTimeline(timelineData || []);

    // Fetch existing fingerprint
    const { data: fpData } = await supabase
      .from('engagement_fingerprints')
      .select('features')
      .eq('song_version_id', versionId)
      .single();

    if (fpData) {
      setFingerprint(fpData.features as any);
    } else {
      setFingerprint(null);
    }
  };

  const computeFingerprint = async () => {
    if (!selectedVersion) return;

    setIsComputingFingerprint(true);
    try {
      const response = await fetch(`/api/fingerprint/${selectedVersion}`);
      if (response.ok) {
        const data = await response.json();
        setFingerprint(data);
      }
    } catch (error) {
      console.error('Failed to compute fingerprint:', error);
    } finally {
      setIsComputingFingerprint(false);
    }
  };

  const selectedSongVersion = songVersions.find((v) => v.id === selectedVersion);

  // Prepare chart data
  const retentionData = timeline.map((t) => ({
    second: t.bin_s,
    retention: t.plays_at_risk,
    skips: t.skips,
    replays: t.replays,
    reactions: t.reactions,
  }));

  // Find hotspots
  const replayHotspot = timeline.reduce(
    (max, t) => (t.replays > max.replays ? t : max),
    { bin_s: 0, replays: 0 }
  );
  const emojiHotspot = timeline.reduce(
    (max, t) => (t.reactions > max.reactions ? t : max),
    { bin_s: 0, reactions: 0 }
  );

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            View engagement metrics and compute Engagement Fingerprints
          </p>
        </div>

        {/* Version Selector */}
        {songVersions.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No songs uploaded yet. Upload a track to start tracking engagement.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Select Song Version</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {songVersions.map((version) => (
                    <Button
                      key={version.id}
                      variant={selectedVersion === version.id ? 'default' : 'outline'}
                      onClick={() => setSelectedVersion(version.id)}
                    >
                      <Music className="h-4 w-4 mr-2" />
                      {version.songs.title} ({version.label})
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedSongVersion && (
              <>
                {/* Stats Overview */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Total Sessions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{sessionCount}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" />
                        Replay Hotspot
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{replayHotspot.bin_s}s</div>
                      <p className="text-xs text-muted-foreground">
                        {replayHotspot.replays} replays
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChart className="h-4 w-4" />
                        Emoji Peak
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{emojiHotspot.bin_s}s</div>
                      <p className="text-xs text-muted-foreground">
                        {emojiHotspot.reactions} reactions
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Retention Curve */}
                {retentionData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Retention Curve</CardTitle>
                      <CardDescription>
                        Number of active listeners over time with replay and emoji hotspots
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={retentionData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="second"
                            label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -5 }}
                          />
                          <YAxis label={{ value: 'Listeners', angle: -90, position: 'insideLeft' }} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="retention"
                            stroke="#8884d8"
                            strokeWidth={2}
                            name="Active Listeners"
                          />
                          <Line
                            type="monotone"
                            dataKey="skips"
                            stroke="#ff4444"
                            strokeWidth={1}
                            name="Skips"
                          />
                          <Line
                            type="monotone"
                            dataKey="replays"
                            stroke="#44ff44"
                            strokeWidth={1}
                            name="Replays"
                          />
                          <Line
                            type="monotone"
                            dataKey="reactions"
                            stroke="#ffaa00"
                            strokeWidth={1}
                            name="Reactions"
                          />
                          {replayHotspot.replays > 0 && (
                            <ReferenceLine
                              x={replayHotspot.bin_s}
                              stroke="#44ff44"
                              strokeDasharray="3 3"
                              label="Replay Peak"
                            />
                          )}
                          {emojiHotspot.reactions > 0 && (
                            <ReferenceLine
                              x={emojiHotspot.bin_s}
                              stroke="#ffaa00"
                              strokeDasharray="3 3"
                              label="Emoji Peak"
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Engagement Fingerprint */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Engagement Fingerprint™</CardTitle>
                        <CardDescription>
                          Computed features capturing listener behavior patterns
                        </CardDescription>
                      </div>
                      <Button
                        onClick={computeFingerprint}
                        disabled={isComputingFingerprint || sessionCount === 0}
                      >
                        {isComputingFingerprint ? 'Computing...' : 'Compute Fingerprint'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {sessionCount === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No sessions yet. Share the listen link to collect data.
                      </p>
                    ) : fingerprint ? (
                      <div className="space-y-4">
                        {/* Key Metrics */}
                        <div className="grid md:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Sessions</p>
                            <p className="text-2xl font-bold">{fingerprint.n_sessions}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">30s Retention</p>
                            <p className="text-2xl font-bold">
                              {(fingerprint.retention_30s * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">60s Retention</p>
                            <p className="text-2xl font-bold">
                              {(fingerprint.retention_60s * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Median Listen</p>
                            <p className="text-2xl font-bold">{fingerprint.median_listen_seconds}s</p>
                          </div>
                        </div>

                        <Separator />

                        {/* Full JSON */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">Complete Fingerprint JSON</p>
                            <Badge>v{fingerprint.version}</Badge>
                          </div>
                          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                            {JSON.stringify(fingerprint, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Click &quot;Compute Fingerprint&quot; to generate the engagement analysis
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

