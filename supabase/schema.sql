-- Music Intelligence: Engagement Fingerprint Platform
-- Database Schema v1

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Songs table
create table songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz default now()
);

-- Song versions (each song can have multiple versions)
create table song_versions (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references songs(id) on delete cascade,
  label text not null,                 -- e.g., 'v1', 'v2', 'final-mix'
  audio_url text not null,             -- public or signed URL from Supabase Storage
  duration_ms int not null,
  created_at timestamptz default now()
);

-- Listening sessions (anonymous is fine for now)
create table listening_sessions (
  id uuid primary key default gen_random_uuid(),
  song_version_id uuid not null references song_versions(id) on delete cascade,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Append-only listening events (idempotent via client_event_id)
create table listening_events (
  id bigserial primary key,
  session_id uuid not null references listening_sessions(id) on delete cascade,
  t_ms int not null,                   -- audio time in milliseconds (rounded)
  wall_ts timestamptz not null,        -- client clock timestamp
  kind text not null,                  -- event type: play, pause, seek, skip, reaction, visibility, focus, heartbeat
  payload jsonb,                       -- additional data (emoji, from_ms, to_ms, state, etc.)
  client_event_id text,                -- uuid from client for idempotency
  created_at timestamptz default now(),
  unique (session_id, client_event_id)
);

-- Pre-binned timeline statistics (computed per second)
create table timeline_stats (
  song_version_id uuid not null references song_versions(id) on delete cascade,
  bin_s int not null,                  -- second bin (0-based)
  plays_at_risk int not null default 0,
  skips int not null default 0,
  replays int not null default 0,
  reactions int not null default 0,
  focus_visible int not null default 0,
  focus_total int not null default 0,
  primary key (song_version_id, bin_s)
);

-- Engagement Fingerprints (Layer 1 output)
create table engagement_fingerprints (
  song_version_id uuid primary key references song_versions(id) on delete cascade,
  version int default 1,               -- fingerprint schema version
  features jsonb not null,             -- flat numeric map of all EF features
  computed_at timestamptz default now()
);

-- Performance indexes
create index idx_listening_events_session_time on listening_events(session_id, t_ms);
create index idx_listening_events_session on listening_events(session_id);
create index idx_timeline_stats_version_bin on timeline_stats(song_version_id, bin_s);
create index idx_listening_sessions_version on listening_sessions(song_version_id);
create index idx_song_versions_song on song_versions(song_id);

-- Comments for clarity
comment on table songs is 'Master song catalog';
comment on table song_versions is 'Different versions/mixes of songs with unique audio URLs';
comment on table listening_sessions is 'Individual listening sessions (one per listener per play)';
comment on table listening_events is 'Append-only event stream capturing all micro-interactions';
comment on table timeline_stats is 'Pre-aggregated per-second statistics for quick retrieval';
comment on table engagement_fingerprints is 'Computed engagement fingerprints (EF) for each song version';

