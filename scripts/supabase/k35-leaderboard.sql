-- =============================================================================
-- Lotophagoi — K35 "Beş yeter" online speedrun leaderboard
-- =============================================================================
-- Authority for the design rules: docs/design/gdd-lotus-island-run.md §10
-- Architecture record: Paca LOT-56 (@axiom · Technical Director)
-- Client that talks to this: src/net/leaderboard.ts
--
-- HOW TO RUN THIS (sahip): scripts/supabase/README.md, step 2. Short version —
-- Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- It is idempotent: running it twice is safe and does not wipe existing scores.
--
-- WHAT THIS IS NOT: anti-cheat. A static client cannot be trusted about its own
-- run time. Everything below raises the bar (floor/ceiling on the time, a
-- server-stamped timestamp, an IP-hashed rate limit, an upsert that can only
-- ever improve a row, a nick allow-list). None of it closes the hole. The real
-- remedy is looking at the table and deleting nonsense by hand. See GDD §10.6.
-- =============================================================================

-- ------------------------------------------------------------------ 1. tables

-- The board itself. One row per nick, holding that nick's BEST time (GDD §10.1
-- H4). "One row per nick" is a database invariant here, not a client promise —
-- nick_key is the primary key, so no client can create a second row for a nick.
create table if not exists public.k35_leaderboard (
  -- lower(nick): case-insensitive identity. Sahip's ruling (H6) is that nick
  -- squatting is accepted — first writer takes the key, later writers with the
  -- same nick share the row. No claim token, deliberately.
  nick_key    text        primary key,
  nick        text        not null,
  time_ms     integer     not null,
  -- Counts accepted improvements, not attempts (the upsert below only fires on
  -- a better time). Kept as a cheap "is this nick suspiciously active" signal.
  submissions integer     not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Board ordering. Ties break by who reached the time first (GDD §10.1 H4),
-- which is why updated_at is in the index and not just time_ms.
create index if not exists k35_leaderboard_rank_idx
  on public.k35_leaderboard (time_ms asc, updated_at asc);

-- Forensic trail + rate-limit source. Never readable by the client.
-- Stores a SALTED SHA-256 of the caller IP, never the raw address.
create table if not exists public.k35_submit_log (
  id         bigserial   primary key,
  ip_hash    text        not null,
  nick_key   text        not null,
  time_ms    integer     not null,
  created_at timestamptz not null default now()
);

create index if not exists k35_submit_log_ip_time_idx
  on public.k35_submit_log (ip_hash, created_at desc);

-- Salt for the IP hash. Lives in its own table (not inline in the function)
-- because pg_catalog is world-readable: a salt baked into the function body
-- could be read back out with pg_get_functiondef and the hashes reversed by
-- brute force over the IPv4 space.
create table if not exists public.k35_secret (
  id   integer primary key default 1,
  salt text    not null,
  constraint k35_secret_single_row check (id = 1)
);

insert into public.k35_secret (id, salt)
values (1, gen_random_uuid()::text || gen_random_uuid()::text)
on conflict (id) do nothing;

-- --------------------------------------------------------------------- 2. RLS

alter table public.k35_leaderboard enable row level security;
alter table public.k35_submit_log  enable row level security;
alter table public.k35_secret      enable row level security;

-- Read-only board. There is deliberately NO insert/update/delete policy:
-- RLS enabled + no policy = every write from anon is denied. The only write
-- path is the security definer function in section 3.
drop policy if exists k35_leaderboard_read on public.k35_leaderboard;
create policy k35_leaderboard_read
  on public.k35_leaderboard
  for select
  using (true);

-- k35_submit_log and k35_secret get NO policy at all -> anon cannot read or
-- write them in any way. This is intentional; do not add one "for debugging".

grant usage on schema public to anon, authenticated;
grant select on public.k35_leaderboard to anon, authenticated;
revoke all on public.k35_submit_log from anon, authenticated;
revoke all on public.k35_secret      from anon, authenticated;

-- ---------------------------------------------------------------- 3. write path

-- The ONLY way a score enters the table.
--
-- security definer: runs as the function owner, which owns the tables and is
-- therefore not subject to their RLS — that is how a client with zero write
-- policies can still record a score.
--
-- set search_path: mandatory, not decoration. Without it a security definer
-- function is a genuine privilege-escalation surface (a caller-controlled
-- search_path can shadow the functions this body calls) and Supabase's own
-- linter flags it.
create or replace function public.submit_k35_score(p_nick text, p_time_ms integer)
returns json
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  -- Mirrors of NET.leaderboard in src/constants.ts. THIS COPY IS THE AUTHORITY;
  -- the client copy is an early-warning check only (GDD §10.4).
  c_nick_min   constant integer := 2;
  c_nick_max   constant integer := 16;
  -- PLACEHOLDER, NOT A MEASUREMENT — see tuning.md §11.6 / GDD §10.5. QA must
  -- raise this to ~60% of a real measured speedrun AND update constants.ts in
  -- the same pass, or the two sides will disagree.
  c_min_time   constant integer := 45000;
  c_max_time   constant integer := 7200000;
  -- Rate limit: submissions allowed per IP hash per window.
  c_rate_max   constant integer := 6;
  c_rate_window constant interval := interval '1 minute';

  v_nick    text;
  v_key     text;
  v_salt    text;
  v_ip      text;
  v_ip_hash text;
  v_recent  integer;
  v_best    integer;
  v_outcome text;
begin
  -- --- nick: same rule as src/net/leaderboard.ts, and this side wins ---------
  v_nick := btrim(regexp_replace(coalesce(p_nick, ''), '\s+', ' ', 'g'));
  if char_length(v_nick) < c_nick_min
     or char_length(v_nick) > c_nick_max
     or v_nick !~ '^[[:alnum:]][[:alnum:] ._-]*[[:alnum:]]$'
  then
    -- The client matches on this exact token; SQLSTATE 22023 makes PostgREST
    -- answer 400. Do not reword these three messages.
    raise exception 'nick_invalid' using errcode = '22023';
  end if;

  -- --- time floor/ceiling ---------------------------------------------------
  if p_time_ms is null or p_time_ms < c_min_time or p_time_ms > c_max_time then
    raise exception 'time_invalid' using errcode = '22023';
  end if;

  v_key := lower(v_nick);

  -- --- rate limit on a salted IP hash --------------------------------------
  select salt into v_salt from public.k35_secret where id = 1;
  v_ip := coalesce(
    nullif(
      btrim(split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1)),
      ''
    ),
    'unknown'
  );
  v_ip_hash := encode(sha256(convert_to(coalesce(v_salt, '') || v_ip, 'utf8')), 'hex');

  select count(*) into v_recent
    from public.k35_submit_log
   where ip_hash = v_ip_hash
     and created_at > now() - c_rate_window;

  if v_recent >= c_rate_max then
    raise exception 'rate_limited' using errcode = '22023';
  end if;

  insert into public.k35_submit_log (ip_hash, nick_key, time_ms)
  values (v_ip_hash, v_key, p_time_ms);

  -- --- the board write ------------------------------------------------------
  -- ONE statement on purpose. A read-then-write from the client (or from here)
  -- has a TOCTOU window in which two concurrent submits can let a worse time
  -- overwrite a better one. Postgres locks the conflicting row for the duration
  -- of this statement, so "a worse time can never be stored" is a database
  -- guarantee rather than a client convention.
  --
  -- created_at is stamped by the server (default now()), never by the client.
  insert into public.k35_leaderboard as l (nick_key, nick, time_ms, submissions)
  values (v_key, v_nick, p_time_ms, 1)
  on conflict (nick_key) do update
     set time_ms     = excluded.time_ms,
         nick        = excluded.nick,
         submissions = l.submissions + 1,
         updated_at  = now()
   where excluded.time_ms < l.time_ms
  returning l.time_ms into v_best;

  if v_best is null then
    -- The WHERE above rejected the update: an existing personal best is faster.
    -- This is a SUCCESS ("kept"), not an error — the UI says so distinctly.
    v_outcome := 'kept';
    select time_ms into v_best from public.k35_leaderboard where nick_key = v_key;
  else
    v_outcome := 'recorded';
  end if;

  return json_build_object(
    'outcome', v_outcome,
    'nick',    v_nick,
    'time_ms', p_time_ms,
    'best_ms', v_best
  );
end;
$$;

-- Only the RPC is callable; nobody gets a blanket EXECUTE.
revoke all on function public.submit_k35_score(text, integer) from public;
grant execute on function public.submit_k35_score(text, integer) to anon, authenticated;

-- ------------------------------------------------------------- 4. moderation

-- Kept as comments on purpose — these are the manual remedies from GDD §10.6.
-- Run them by hand in the SQL Editor when a row is obviously fake.
--
--   delete from public.k35_leaderboard where nick_key = lower('şüpheli-ad');
--
--   -- who has been hammering the endpoint, last 24 h
--   select ip_hash, count(*) as n, min(time_ms) as fastest
--     from public.k35_submit_log
--    where created_at > now() - interval '24 hours'
--    group by ip_hash
--    order by n desc
--    limit 20;
--
--   -- keep the log from growing forever
--   delete from public.k35_submit_log where created_at < now() - interval '30 days';
