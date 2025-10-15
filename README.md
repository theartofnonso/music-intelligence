# Music Intelligence: Engagement Fingerprint Platform

A Next.js-based platform for capturing listener micro-interactions (attention, skips, replays, emoji reactions) on unreleased music tracks and generating deterministic Engagement Fingerprint™ JSON for each song version.

## Features

- 🎵 **Upload & Share**: Upload audio files or paste URLs to create shareable listen links
- 📊 **Micro-Interaction Tracking**: Capture plays, pauses, seeks, skips, heartbeats, focus, visibility, and emoji reactions
- 📈 **Analytics Dashboard**: View retention curves, replay hotspots, and emoji peaks
- 🔍 **Engagement Fingerprints**: Generate deterministic 25-40 feature JSON fingerprints
- 🎯 **Anonymous Listening Sessions**: No authentication required for listeners

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Supabase (Postgres)
- **Storage**: Supabase Storage
- **Charts**: Recharts
- **Deployment**: Vercel-ready

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project

## Setup Instructions

### 1. Clone and Install

```bash
npm install
```

### 2. Configure Supabase

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set Up Database

Run the SQL schema in your Supabase SQL editor:

```bash
# Copy contents of supabase/schema.sql to Supabase SQL Editor and execute
```

This creates 6 tables:
- `songs` - Master song catalog
- `song_versions` - Different versions/mixes of songs
- `listening_sessions` - Individual listening sessions
- `listening_events` - Append-only event stream
- `timeline_stats` - Pre-aggregated per-second statistics
- `engagement_fingerprints` - Computed EF for each version

### 4. Configure Supabase Storage

Create a storage bucket named `audio`:

1. Go to Supabase Dashboard → Storage
2. Create new bucket: `audio`
3. Set bucket to **public** (or configure signed URLs)

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

### Upload a Track

1. Go to home page
2. Enter song title and version label (e.g., "v1", "final-mix")
3. Either upload an audio file OR paste a public audio URL
4. Click "Upload & Create Listen Link"
5. Copy the listen link to share with listeners

### Listen Page

- Visit `/listen/[songVersionId]`
- Play/pause the track
- React with emojis (🔥😍😴🤔) at any moment
- Skip to end early
- All interactions are captured anonymously

### Analytics Dashboard

1. Go to `/admin`
2. Select a song version
3. View:
   - Total sessions
   - Retention curve (listeners over time)
   - Replay and emoji hotspots
   - Timeline with vertical markers
4. Click "Compute Fingerprint" to generate EF JSON

## Engagement Fingerprint v1

The EF computes 25+ features capturing:

### Retention Metrics
- `retention_15s`, `retention_30s`, `retention_60s`
- `median_listen_seconds`
- `early_skip_rate_30s`

### Replay Affinity
- `replay_rate_total`
- `replay_hotspot_s` (peak replay second)
- `replay_hotspot_intensity`

### Focus Quality
- `focus_share_30s`, `focus_share_60s`, `focus_share_total`

### Emotion (Emoji Density)
- `emoji_rate_fire`, `emoji_rate_love`, `emoji_rate_sleep`, `emoji_rate_think`
- `emoji_peak_s`
- `emoji_entropy` (variety across emojis)

### Volatility / Momentum
- `skip_hazard_std_0_60s` (standard deviation of skip propensity)
- `momentum_slope_0_30s` (linear slope of retention 0→30s)

### Meta
- `n_sessions`, `duration_s`, `version`

## Event Taxonomy

### Playback Events
- `play` - Audio started playing
- `pause` - Audio paused
- `seek` - User jumped to different position
- `skip` - User clicked skip button
- `heartbeat` - Emitted every 5s while playing

### Attention Proxies
- `visibility` - Page visible/hidden (Page Visibility API)
- `focus` - Window focus/blur

### Emotion
- `reaction` - Emoji button clicked

## Architecture

```
app/
├── page.tsx                    # Upload page
├── listen/[id]/page.tsx        # Listen page
├── admin/page.tsx              # Analytics dashboard
└── api/
    ├── sessions/
    │   ├── start/route.ts      # POST - Create session
    │   └── complete/route.ts   # POST - Complete session
    ├── events/route.ts         # POST - Batch ingest events
    └── fingerprint/[id]/route.ts # GET - Compute EF

lib/
├── supabase/
│   ├── client.ts               # Browser client
│   └── server.ts               # Server client
├── aggregation/
│   ├── timeline.ts             # Build per-second bins
│   └── fingerprint.ts          # Compute EF features
├── hooks/
│   └── useEventTracker.ts      # Client-side tracking
└── types/
    ├── database.ts             # Supabase types
    └── events.ts               # Event types

components/
└── Player.tsx                  # Audio player with tracking
```

## Key Design Decisions

### Idempotency
- Events use `client_event_id` (UUID) for deduplication
- Database enforces `UNIQUE (session_id, client_event_id)`
- Retries are safe

### Reliability
- Auto-flush events every 1s or at 50 events
- Retry with exponential backoff on failure
- `navigator.sendBeacon` on page unload

### Determinism
- Same input events → same EF output
- Stable aggregation logic
- Versioned fingerprint schema (v1)

## API Endpoints

### `POST /api/sessions/start`
```json
Request: { "songVersionId": "uuid" }
Response: { "sessionId": "uuid", "audioUrl": "string", "durationMs": number }
```

### `POST /api/sessions/complete`
```json
Request: { "sessionId": "uuid" }
Response: { "ok": true }
```

### `POST /api/events`
```json
Request: {
  "sessionId": "uuid",
  "events": [
    {
      "client_event_id": "uuid",
      "t_ms": 1234,
      "wall_ts": "2025-10-15T10:30:00Z",
      "kind": "play|pause|seek|skip|reaction|visibility|focus|heartbeat",
      "payload": {}
    }
  ]
}
Response: { "ok": true }
```

### `GET /api/fingerprint/[songVersionId]`
```json
Response: {
  "version": 1,
  "n_sessions": 42,
  "duration_s": 184,
  "retention_15s": 0.86,
  "retention_30s": 0.78,
  "retention_60s": 0.65,
  // ... 25+ more features
}
```

## Future Enhancements

- Replace public URLs with signed URLs
- Add section markers (verse/chorus/hook) for section-aware features
- Switch EF storage to pgvector for similarity search
- Add end-card micro-survey
- Real-time dashboard updates
- Batch EF computation via cron

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Deployment

### Vercel

1. Push to GitHub
2. Import to Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

The app will automatically deploy to Vercel with optimal settings for Next.js.

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
