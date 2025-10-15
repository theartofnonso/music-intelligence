# Engagement Fingerprint™ v1 Specification

Complete specification of the Engagement Fingerprint feature set.

## Overview

The Engagement Fingerprint (EF) is a deterministic, flat JSON representation of listener behavior for a song version. It captures 25+ numerical features that quantify engagement patterns.

**Key Properties:**
- **Deterministic**: Same inputs always produce the same output
- **Versioned**: Schema version tracked (currently v1)
- **Flat**: No nested objects, all features at top level
- **Numerical**: All values are numbers (for ML compatibility)
- **Stable**: Feature names and calculation methods are fixed

## Feature Categories

### 1. Retention Metrics (5 features)

Measures how many listeners stay engaged over time.

#### `retention_15s` (float, 0-1)
- Percentage of listeners still active at 15 seconds
- Calculation: `plays_at_risk(15s) / plays_at_risk(0s)`
- Interpretation: Higher = better early retention

#### `retention_30s` (float, 0-1)
- Percentage of listeners still active at 30 seconds
- Critical metric: Many listeners drop off before 30s
- Interpretation: >0.7 is excellent, <0.5 is concerning

#### `retention_60s` (float, 0-1)
- Percentage of listeners still active at 60 seconds (1 minute)
- Strong indicator of overall engagement
- Interpretation: >0.5 is very good

#### `median_listen_seconds` (integer)
- The second where 50% of listeners have dropped off
- Approximation using retention curve
- Interpretation: Higher = listeners stay longer

#### `early_skip_rate_30s` (float, 0-1)
- Inverse of retention_30s: `1 - retention_30s`
- Percentage who left before 30 seconds
- Interpretation: Lower = better (less early abandonment)

### 2. Replay Affinity (3 features)

Captures moments listeners want to hear again.

#### `replay_rate_total` (float, ≥0)
- Average number of replays per session
- Calculation: `total_replays / n_sessions`
- Definition: Replay = backward seek ≥ 2000ms
- Interpretation: >0.3 indicates strong replay behavior

#### `replay_hotspot_s` (integer, seconds)
- The second with the most replays
- Identifies the most "replayable" moment
- Interpretation: Likely a hook, drop, or memorable section

#### `replay_hotspot_intensity` (float, ≥0)
- Replay rate at the hotspot
- Calculation: `replays_at_hotspot / n_sessions`
- Interpretation: How strong is the replay attraction

### 3. Focus Quality (3 features)

Measures active attention vs passive listening.

#### `focus_share_30s` (float, 0-1)
- Percentage of first 30s where listeners were focused & visible
- Calculation: `sum(focus_visible) / sum(focus_total)` for bins 0-30
- Interpretation: Higher = more active attention

#### `focus_share_60s` (float, 0-1)
- Same as above but for first 60 seconds
- Usually lower than focus_share_30s

#### `focus_share_total` (float, 0-1)
- Focus share across entire track
- Tends to decrease as track progresses
- Interpretation: >0.7 indicates engaged listening

### 4. Emotion Metrics (6 features)

Captures emotional reactions via emojis.

#### `emoji_rate_fire` (float, ≥0)
- Average 🔥 reactions per session
- Calculation: `count(🔥) / n_sessions`
- Interpretation: Excitement, hype, energy

#### `emoji_rate_love` (float, ≥0)
- Average 😍 reactions per session
- Interpretation: Affection, beauty, appeal

#### `emoji_rate_sleep` (float, ≥0)
- Average 😴 reactions per session
- Interpretation: Boredom, low energy (negative signal)

#### `emoji_rate_think` (float, ≥0)
- Average 🤔 reactions per session
- Interpretation: Curiosity, interesting choices

#### `emoji_peak_s` (integer, seconds)
- The second with the most emoji reactions (any type)
- Identifies the most emotionally resonant moment
- Interpretation: Likely a climax, surprise, or standout element

#### `emoji_entropy` (float, 0-2)
- Shannon entropy of emoji distribution
- Measures variety in emotional reactions
- Calculation: `-Σ p(emoji) * log2(p(emoji))`
- Interpretation:
  - 0 = all one emoji (homogeneous)
  - 2 = perfectly balanced across 4 emojis
  - >1.5 = diverse emotional responses

### 5. Volatility / Momentum (2 features)

Captures dynamic behavior patterns.

#### `skip_hazard_std_0_60s` (float, ≥0)
- Standard deviation of per-second skip propensity (0-60s)
- Measures consistency of skip risk
- Calculation: `std(skips/plays_at_risk)` per bin
- Interpretation:
  - Low = steady risk throughout
  - High = volatile, specific drop-off moments

#### `momentum_slope_0_30s` (float)
- Linear regression slope of retention curve (0-30s)
- Negative = losing listeners
- Interpretation:
  - -0.01 or less = steep decline
  - -0.005 to -0.001 = moderate decline
  - Near 0 = stable retention

### 6. Meta (3 features)

Context about the fingerprint.

#### `n_sessions` (integer, ≥0)
- Total number of listening sessions
- Sample size for all metrics
- Interpretation: >20 for reliable metrics, >100 for strong confidence

#### `duration_s` (integer, seconds)
- Total duration of the track
- Used to normalize time-based metrics

#### `version` (integer)
- EF schema version
- Currently always 1
- Will increment if feature set changes

## Example Fingerprint

```json
{
  "version": 1,
  "n_sessions": 42,
  "duration_s": 184,
  "retention_15s": 0.86,
  "retention_30s": 0.78,
  "retention_60s": 0.65,
  "median_listen_seconds": 97,
  "early_skip_rate_30s": 0.22,
  "replay_rate_total": 0.31,
  "replay_hotspot_s": 41,
  "replay_hotspot_intensity": 0.19,
  "focus_share_30s": 0.88,
  "focus_share_60s": 0.81,
  "focus_share_total": 0.76,
  "emoji_rate_fire": 0.12,
  "emoji_rate_love": 0.09,
  "emoji_rate_sleep": 0.03,
  "emoji_rate_think": 0.05,
  "emoji_peak_s": 102,
  "emoji_entropy": 1.23,
  "skip_hazard_std_0_60s": 0.041,
  "momentum_slope_0_30s": -0.004
}
```

## Interpretation Guide

### High Engagement Profile
- retention_30s > 0.75
- retention_60s > 0.60
- focus_share_total > 0.70
- emoji_rate_fire > 0.10
- early_skip_rate_30s < 0.25

### Drop-Off Profile
- retention_30s < 0.50
- early_skip_rate_30s > 0.50
- median_listen_seconds < 30
- focus_share_30s < 0.60
- emoji_rate_sleep > emoji_rate_fire

### Replay Hook Profile
- replay_rate_total > 0.40
- replay_hotspot_intensity > 0.20
- emoji_peak_s ≈ replay_hotspot_s (±10s)
- High emoji_rate_fire or emoji_rate_love

### Passive Listening Profile
- retention_60s > 0.60 (people stay)
- focus_share_total < 0.50 (but not focused)
- Low emoji rates (<0.05 each)
- skip_hazard_std_0_60s < 0.03 (steady)

## Use Cases

### A/B Testing Song Versions

Compare two versions of the same song:

```javascript
// Version A (original mix)
{
  "retention_30s": 0.68,
  "replay_rate_total": 0.22,
  "emoji_rate_fire": 0.08
}

// Version B (new mix with stronger hook)
{
  "retention_30s": 0.79,  // +16% retention
  "replay_rate_total": 0.41,  // +86% replays
  "emoji_rate_fire": 0.15  // +88% excitement
}
```

**Conclusion**: Version B performs significantly better.

### Finding the Hook

Look at:
- `replay_hotspot_s`: 58
- `emoji_peak_s`: 61

The hook is around 58-61 seconds. Consider:
- Starting with this section in future versions
- Building the intro to lead into this moment
- Strengthening the transition into this section

### Identifying Problem Areas

If `momentum_slope_0_30s = -0.015` (very negative):
- First 30s is losing listeners rapidly
- Check intro energy, clarity, hook placement
- Consider shortening intro or moving hook earlier

If `emoji_rate_sleep > 0.10`:
- Track may be too slow, boring, or long
- Consider increasing energy or shortening

### Similarity Search (Future)

Once you have many EFs, you can:
1. Store in pgvector
2. Find similar songs using cosine similarity
3. Cluster songs by engagement patterns
4. Recommend "if you liked X, try Y"

## Determinism Guarantee

The EF is **deterministic** because:

1. **Event ordering**: Events sorted by (session_id, t_ms)
2. **Aggregation logic**: Mathematical operations are deterministic
3. **No randomness**: No sampling, no random seeds
4. **Fixed precision**: All calculations use consistent float precision
5. **Stable features**: Feature list and calculations won't change in v1

**Test**: Run computation twice on same data → identical JSON

## Future Enhancements (v2)

Potential additions (would increment version to 2):
- Section-aware features (verse/chorus/bridge metrics)
- Comparative features (vs. other tracks in catalog)
- Time-of-day patterns
- Device/platform breakdowns
- Engagement velocity (change over time as more sessions come in)
- Sentiment analysis from optional text feedback

## Technical Implementation

See `lib/aggregation/fingerprint.ts` for full implementation.

**Key functions:**
- `computeEngagementFingerprint(songVersionId)`: Main entry point
- `buildTimelineStats(songVersionId)`: Aggregates events into per-second bins
- `calculateRetention()`: Computes retention metrics
- `calculateEmojiMetrics()`: Processes reaction events
- `calculateSkipHazardStd()`: Volatility metric
- `calculateMomentumSlope()`: Linear regression on retention

## API Access

```bash
GET /api/fingerprint/{songVersionId}
```

Response: Complete EF JSON (shown above)

The endpoint also upserts the fingerprint to `engagement_fingerprints` table.

## Database Storage

```sql
create table engagement_fingerprints (
  song_version_id uuid primary key,
  version int default 1,
  features jsonb not null,  -- Complete EF JSON
  computed_at timestamptz default now()
);
```

Query example:
```sql
SELECT features->>'retention_30s' as retention_30s,
       features->>'emoji_rate_fire' as emoji_rate_fire
FROM engagement_fingerprints
WHERE song_version_id = 'your-id'
```

## References

- Main spec in original requirements
- Implementation: `lib/aggregation/fingerprint.ts`
- API endpoint: `app/api/fingerprint/[songVersionId]/route.ts`
- Database schema: `supabase/schema.sql`

