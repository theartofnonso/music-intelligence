-- ====================================================================
-- music-intelligence schema (idempotent)
-- Tables, indexes, RLS, grants, and RPCs
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

-- Allow public reads from the bucket
create policy "Public read audio-public" on storage.objects
for select using (bucket_id = 'audio-public');

-- Allow uploads for anyone (anon + authenticated)
create policy "Anon upload audio-public" on storage.objects
for insert to anon with check (bucket_id = 'audio-public');
create policy "Auth upload audio-public" on storage.objects
for insert to authenticated with check (bucket_id = 'audio-public');

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
	event_id bigserial primary key,
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

-- Policy definitions

-- Policies: track (authenticated only)
create policy track_select_auth on public.track
	for select
	to authenticated
	using (auth.role() = 'authenticated');

create policy track_insert_auth on public.track
	for insert
	to authenticated
	with check (auth.role() = 'authenticated');

create policy track_update_auth on public.track
	for update
	to authenticated
	using (auth.role() = 'authenticated');

create policy track_delete_auth on public.track
	for delete
	to authenticated
	using (auth.role() = 'authenticated');

-- Policies: event (open to all for read & insert)
create policy event_select_all on public.event
	for select
	using (true);

create policy event_insert_all on public.event
	for insert
	with check (true);

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
