import { createServerClient } from '@/lib/supabase/server';
import { buildTimelineStats } from './timeline';

export interface EngagementFingerprint {
  version: number;
  n_sessions: number;
  duration_s: number;
  retention_15s: number;
  retention_30s: number;
  retention_60s: number;
  median_listen_seconds: number;
  early_skip_rate_30s: number;
  replay_rate_total: number;
  replay_hotspot_s: number;
  replay_hotspot_intensity: number;
  focus_share_30s: number;
  focus_share_60s: number;
  focus_share_total: number;
  emoji_rate_fire: number;
  emoji_rate_love: number;
  emoji_rate_sleep: number;
  emoji_rate_think: number;
  emoji_peak_s: number;
  emoji_entropy: number;
  skip_hazard_std_0_60s: number;
  momentum_slope_0_30s: number;
}

export async function computeEngagementFingerprint(
  songVersionId: string
): Promise<EngagementFingerprint> {
  const supabase = createServerClient();

  // Get song version duration
  const { data: songVersion, error: versionError } = await supabase
    .from('song_versions')
    .select('duration_ms')
    .eq('id', songVersionId)
    .single();

  if (versionError || !songVersion) {
    throw new Error('Song version not found');
  }

  const duration_s = Math.floor((songVersion as { duration_ms: number }).duration_ms / 1000);

  // Get session count
  const { data: sessions, error: sessionsError } = await supabase
    .from('listening_sessions')
    .select('id')
    .eq('song_version_id', songVersionId);

  if (sessionsError) {
    throw new Error('Failed to fetch sessions');
  }

  const n_sessions = sessions?.length || 0;

  if (n_sessions === 0) {
    // Return empty fingerprint
    return createEmptyFingerprint(duration_s);
  }

  // Build timeline statistics
  const timeline = await buildTimelineStats(songVersionId);

  // Get all events for emoji analysis
  const sessionIds = (sessions || []).map((s: { id: string }) => s.id);
  const { data: events, error: eventsError } = await supabase
    .from('listening_events')
    .select('kind, payload, t_ms')
    .in('session_id', sessionIds);

  if (eventsError) {
    throw new Error('Failed to fetch events');
  }

  // Calculate retention metrics
  const retention_15s = calculateRetention(timeline, 15, n_sessions);
  const retention_30s = calculateRetention(timeline, 30, n_sessions);
  const retention_60s = calculateRetention(timeline, 60, n_sessions);
  const early_skip_rate_30s = 1 - retention_30s;

  // Calculate median listen time
  const median_listen_seconds = calculateMedianListenTime(timeline, n_sessions);

  // Calculate replay metrics
  const totalReplays = Array.from(timeline.values()).reduce(
    (sum, bin) => sum + bin.replays,
    0
  );
  const replay_rate_total = totalReplays / n_sessions;

  const replayHotspot = findHotspot(timeline, 'replays');
  const replay_hotspot_s = replayHotspot.bin_s;
  const replay_hotspot_intensity = replayHotspot.value / n_sessions;

  // Calculate focus metrics
  const focus_share_30s = calculateFocusShare(timeline, 0, 30);
  const focus_share_60s = calculateFocusShare(timeline, 0, 60);
  const focus_share_total = calculateFocusShare(timeline, 0, duration_s);

  // Calculate emoji metrics
  const emojiMetrics = calculateEmojiMetrics(events || [], n_sessions);

  // Calculate volatility metrics
  const skip_hazard_std_0_60s = calculateSkipHazardStd(timeline, 0, 60);
  const momentum_slope_0_30s = calculateMomentumSlope(timeline, 0, 30, n_sessions);

  return {
    version: 1,
    n_sessions,
    duration_s,
    retention_15s,
    retention_30s,
    retention_60s,
    median_listen_seconds,
    early_skip_rate_30s,
    replay_rate_total,
    replay_hotspot_s,
    replay_hotspot_intensity,
    focus_share_30s,
    focus_share_60s,
    focus_share_total,
    ...emojiMetrics,
    skip_hazard_std_0_60s,
    momentum_slope_0_30s,
  };
}

function createEmptyFingerprint(duration_s: number): EngagementFingerprint {
  return {
    version: 1,
    n_sessions: 0,
    duration_s,
    retention_15s: 0,
    retention_30s: 0,
    retention_60s: 0,
    median_listen_seconds: 0,
    early_skip_rate_30s: 0,
    replay_rate_total: 0,
    replay_hotspot_s: 0,
    replay_hotspot_intensity: 0,
    focus_share_30s: 0,
    focus_share_60s: 0,
    focus_share_total: 0,
    emoji_rate_fire: 0,
    emoji_rate_love: 0,
    emoji_rate_sleep: 0,
    emoji_rate_think: 0,
    emoji_peak_s: 0,
    emoji_entropy: 0,
    skip_hazard_std_0_60s: 0,
    momentum_slope_0_30s: 0,
  };
}

function calculateRetention(
  timeline: Map<number, any>,
  targetSeconds: number,
  n_sessions: number
): number {
  const bin0 = timeline.get(0);
  const binTarget = timeline.get(targetSeconds);

  if (!bin0 || bin0.plays_at_risk === 0) return 0;

  const remaining = binTarget?.plays_at_risk || 0;
  return remaining / bin0.plays_at_risk;
}

function calculateMedianListenTime(
  timeline: Map<number, any>,
  n_sessions: number
): number {
  // Approximate by finding the second where plays_at_risk drops to ~50%
  const bin0 = timeline.get(0);
  if (!bin0 || bin0.plays_at_risk === 0) return 0;

  const target = bin0.plays_at_risk * 0.5;

  let closestBin = 0;
  let closestDiff = Infinity;

  for (const [bin_s, data] of timeline.entries()) {
    const diff = Math.abs(data.plays_at_risk - target);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestBin = bin_s;
    }
  }

  return closestBin;
}

function findHotspot(
  timeline: Map<number, any>,
  metric: 'replays' | 'reactions'
): { bin_s: number; value: number } {
  let maxBin = 0;
  let maxValue = 0;

  for (const [bin_s, data] of timeline.entries()) {
    const value = data[metric] || 0;
    if (value > maxValue) {
      maxValue = value;
      maxBin = bin_s;
    }
  }

  return { bin_s: maxBin, value: maxValue };
}

function calculateFocusShare(
  timeline: Map<number, any>,
  start_s: number,
  end_s: number
): number {
  let totalFocusVisible = 0;
  let totalFocusTotal = 0;

  for (let s = start_s; s < end_s; s++) {
    const bin = timeline.get(s);
    if (bin) {
      totalFocusVisible += bin.focus_visible;
      totalFocusTotal += bin.focus_total;
    }
  }

  if (totalFocusTotal === 0) return 0;
  return totalFocusVisible / totalFocusTotal;
}

function calculateEmojiMetrics(
  events: any[],
  n_sessions: number
): {
  emoji_rate_fire: number;
  emoji_rate_love: number;
  emoji_rate_sleep: number;
  emoji_rate_think: number;
  emoji_peak_s: number;
  emoji_entropy: number;
} {
  const reactionEvents = events.filter((e) => e.kind === 'reaction');

  const emojiCounts = {
    '🔥': 0,
    '😍': 0,
    '😴': 0,
    '🤔': 0,
  };

  const emojiByBin = new Map<number, number>();

  for (const event of reactionEvents) {
    const emoji = event.payload?.emoji;
    if (emoji && emoji in emojiCounts) {
      emojiCounts[emoji as keyof typeof emojiCounts]++;

      const bin_s = Math.floor(event.t_ms / 1000);
      emojiByBin.set(bin_s, (emojiByBin.get(bin_s) || 0) + 1);
    }
  }

  // Find peak bin
  let emoji_peak_s = 0;
  let maxEmojis = 0;
  for (const [bin_s, count] of emojiByBin.entries()) {
    if (count > maxEmojis) {
      maxEmojis = count;
      emoji_peak_s = bin_s;
    }
  }

  // Calculate entropy
  const total = Object.values(emojiCounts).reduce((sum, count) => sum + count, 0);
  let entropy = 0;
  if (total > 0) {
    for (const count of Object.values(emojiCounts)) {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    }
  }

  return {
    emoji_rate_fire: emojiCounts['🔥'] / n_sessions,
    emoji_rate_love: emojiCounts['😍'] / n_sessions,
    emoji_rate_sleep: emojiCounts['😴'] / n_sessions,
    emoji_rate_think: emojiCounts['🤔'] / n_sessions,
    emoji_peak_s,
    emoji_entropy: entropy,
  };
}

function calculateSkipHazardStd(
  timeline: Map<number, any>,
  start_s: number,
  end_s: number
): number {
  const skipRates: number[] = [];

  for (let s = start_s; s < end_s; s++) {
    const bin = timeline.get(s);
    if (bin && bin.plays_at_risk > 0) {
      skipRates.push(bin.skips / bin.plays_at_risk);
    }
  }

  if (skipRates.length === 0) return 0;

  const mean = skipRates.reduce((sum, rate) => sum + rate, 0) / skipRates.length;
  const variance =
    skipRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) /
    skipRates.length;

  return Math.sqrt(variance);
}

function calculateMomentumSlope(
  timeline: Map<number, any>,
  start_s: number,
  end_s: number,
  n_sessions: number
): number {
  const retentionPoints: Array<{ x: number; y: number }> = [];

  const bin0 = timeline.get(0);
  if (!bin0 || bin0.plays_at_risk === 0) return 0;

  for (let s = start_s; s < end_s; s++) {
    const bin = timeline.get(s);
    if (bin) {
      retentionPoints.push({
        x: s,
        y: bin.plays_at_risk / bin0.plays_at_risk,
      });
    }
  }

  if (retentionPoints.length < 2) return 0;

  // Simple linear regression
  const n = retentionPoints.length;
  const sumX = retentionPoints.reduce((sum, p) => sum + p.x, 0);
  const sumY = retentionPoints.reduce((sum, p) => sum + p.y, 0);
  const sumXY = retentionPoints.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = retentionPoints.reduce((sum, p) => sum + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  return slope;
}

