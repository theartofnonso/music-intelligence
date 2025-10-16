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
	id uuid primary key default gen_random_uuid(),
	title text,
	artist text,
	duration_ms int,
	storage_path text,
	created_at timestamptz default now()
);

create table if not exists public.session (
	id uuid primary key default gen_random_uuid(),
	track_id uuid not null references public.track(id) on delete cascade,
	payload jsonb not null,
	created_at timestamptz default now()
);

-- =====================
-- Indexes & constraints
-- =====================
create index if not exists session_track_time_idx on public.session(track_id, created_at);

-- =====================
-- Row Level Security & Grants
-- =====================
-- Enable RLS
alter table public.track enable row level security;
alter table public.session enable row level security;

-- Base grants so roles can access schema
grant usage on schema public to anon, authenticated;

-- Track table: only authenticated can CRUD
grant select, insert, update, delete on public.track to authenticated;
revoke all on public.track from anon;

-- Session table: open (read + insert for everyone)
grant select, insert on public.session to anon, authenticated;
revoke update, delete on public.session from anon, authenticated;

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

-- session policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'session' AND policyname = 'session_select_all'
  ) THEN
    CREATE POLICY session_select_all ON public.session
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'session' AND policyname = 'session_insert_all'
  ) THEN
    CREATE POLICY session_insert_all ON public.session
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;