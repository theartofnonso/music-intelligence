-- ====================================================================
-- music-intelligence schema (idempotent, no DROP statements)
-- Tables, indexes, RLS, grants, storage policies, and RPCs
-- ====================================================================

-- Extensions
create extension if not exists pgcrypto;

-- =====================
-- Supabase Storage: bucket & policies
-- =====================
-- Create the public bucket (idempotent)
insert into storage.buckets (id, name, public)
select 'audio-public', 'audio-public', true
where not exists (select 1 from storage.buckets where id = 'audio-public');

-- Storage policies (guarded via DO blocks, since CREATE POLICY lacks IF NOT EXISTS)
-- Public read
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read audio-public'
  ) THEN
    CREATE POLICY "Public read audio-public" ON storage.objects
    FOR SELECT USING (bucket_id = 'audio-public');
  END IF;
END $$;

-- Anonymous upload
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anon upload audio-public'
  ) THEN
    CREATE POLICY "Anon upload audio-public" ON storage.objects
    FOR INSERT TO anon WITH CHECK (bucket_id = 'audio-public');
  END IF;
END $$;

-- Authenticated upload
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Auth upload audio-public'
  ) THEN
    CREATE POLICY "Auth upload audio-public" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'audio-public');
  END IF;
END $$;

-- =====================
-- Tables
-- =====================
create table if not exists public.track (
	track_id uuid primary key default gen_random_uuid(),
	title text,
	artist text,
	duration_ms int,
	storage_path text,
	created_at timestamptz default now()
);

create table if not exists public.event (
	event_id uuid primary key default gen_random_uuid(),
	session_id uuid not null,
	track_id uuid not null references public.track(track_id) on delete cascade,
	event_type text not null,
	position_ms int not null,
	payload jsonb,
	client_ts timestamptz,
	server_ts timestamptz default now(),
	seq int not null
);

-- =====================
-- Indexes & constraints
-- =====================
create unique index if not exists event_session_seq_idx on public.event(session_id, seq);
create index if not exists event_track_pos_idx on public.event(track_id, position_ms);
create index if not exists event_track_time_idx on public.event(track_id, server_ts);

-- =====================
-- Row Level Security & Grants
-- =====================
-- Enable RLS
alter table public.track enable row level security;
alter table public.event enable row level security;

-- Base grants so roles can access schema
grant usage on schema public to anon, authenticated;

-- Track table: only authenticated can CRUD
grant select, insert, update, delete on public.track to authenticated;
revoke all on public.track from anon;

-- Event table: open (read + insert for everyone)
grant select, insert on public.event to anon, authenticated;
revoke update, delete on public.event from anon, authenticated;

-- Policies (guarded)
-- track policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'track' AND policyname = 'track_select_auth'
  ) THEN
    CREATE POLICY track_select_auth ON public.track
      FOR SELECT TO authenticated
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'track' AND policyname = 'track_insert_auth'
  ) THEN
    CREATE POLICY track_insert_auth ON public.track
      FOR INSERT TO authenticated
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'track' AND policyname = 'track_update_auth'
  ) THEN
    CREATE POLICY track_update_auth ON public.track
      FOR UPDATE TO authenticated
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'track' AND policyname = 'track_delete_auth'
  ) THEN
    CREATE POLICY track_delete_auth ON public.track
      FOR DELETE TO authenticated
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- event policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'event' AND policyname = 'event_select_all'
  ) THEN
    CREATE POLICY event_select_all ON public.event
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'event' AND policyname = 'event_insert_all'
  ) THEN
    CREATE POLICY event_insert_all ON public.event
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- =====================
-- RPCs (aggregations)
-- =====================
create or replace function public.agg_skip_seconds(p_track_id uuid)
returns table(second int, count bigint)
language sql stable as $$
	select floor(position_ms/1000)::int as second, count(*)::bigint
	from public.event
	where track_id = p_track_id and event_type = 'arcade_skip'
	group by 1 order by 1
$$;

create or replace function public.agg_replay_seconds(p_track_id uuid)
returns table(second int, count bigint)
language sql stable as $$
	select floor(position_ms/1000)::int as second, count(*)::bigint
	from public.event
	where track_id = p_track_id and event_type = 'arcade_replay'
	group by 1 order by 1
$$;

create or replace function public.agg_sentiment_seconds(p_track_id uuid)
returns table(second int, slider_avg float8)
language sql stable as $$
	select floor(position_ms/1000)::int as second,
		avg(coalesce((payload->>'weight')::float8, 0)) as slider_avg
	from public.event
	where track_id = p_track_id and event_type = 'arcade_reaction'
	group by 1 order by 1
$$;

create or replace function public.agg_attention_seconds(p_track_id uuid)
returns table(second int, ticks bigint)
language sql stable as $$
	select floor(position_ms/1000)::int as second, count(*)::bigint as ticks
	from public.event
	where track_id = p_track_id and event_type = 'timeupdate_tick'
	group by 1 order by 1
$$;
