-- Tables
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

create unique index if not exists event_session_seq_idx on public.event(session_id, seq);
create index if not exists event_track_pos_idx on public.event(track_id, position_ms);
create index if not exists event_track_time_idx on public.event(track_id, server_ts);

-- RPCs (requires postgres function creation)
create or replace function public.agg_skip_seconds(p_track_id uuid)
returns table(second int, count bigint)
language sql stable as $$
	select floor(position_ms/1000)::int as second, count(*)::bigint
	from public.event
	where track_id = p_track_id and event_type = 'skip_forward'
	group by 1 order by 1
$$;

create or replace function public.agg_replay_seconds(p_track_id uuid)
returns table(second int, count bigint)
language sql stable as $$
	select floor(position_ms/1000)::int as second, count(*)::bigint
	from public.event
	where track_id = p_track_id and event_type in ('skip_backward')
	group by 1 order by 1
$$;

create or replace function public.agg_sentiment_seconds(p_track_id uuid)
returns table(second int, slider_avg float8)
language sql stable as $$
	select floor(position_ms/1000)::int as second,
		avg((payload->>'value')::float8) as slider_avg
	from public.event
	where track_id = p_track_id and event_type = 'sentiment_slider'
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
