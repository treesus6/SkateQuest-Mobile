-- Runtime backend repair for RPCs/tables referenced by the current app.
-- Idempotent and preserves existing claim/proof data.

alter table if exists public.spot_claims
  add column if not exists claim_strength integer not null default 1,
  add column if not exists expires_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.spot_claim_history (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.skate_spots(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  claim_strength integer not null default 1,
  claimed_at timestamptz not null default now()
);

create table if not exists public.media_hype (
  media_id uuid primary key references public.media(id) on delete cascade,
  hype_count integer not null default 0 check (hype_count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  report_type text not null,
  reason text,
  context text,
  context_id text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.suspicious_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.api_rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  ip_address inet,
  endpoint text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1,
  unique(user_id, ip_address, endpoint, window_started_at)
);

alter table public.spot_claim_history enable row level security;
alter table public.media_hype enable row level security;
alter table public.user_reports enable row level security;
alter table public.suspicious_locations enable row level security;
alter table public.api_rate_limits enable row level security;

drop policy if exists "claim history readable" on public.spot_claim_history;
create policy "claim history readable" on public.spot_claim_history
  for select to authenticated using (true);

drop policy if exists "media hype readable" on public.media_hype;
create policy "media hype readable" on public.media_hype
  for select to authenticated using (true);

drop policy if exists "users can create reports" on public.user_reports;
create policy "users can create reports" on public.user_reports
  for insert to authenticated with check ((select auth.uid()) = reporter_id);

drop policy if exists "users can read own reports" on public.user_reports;
create policy "users can read own reports" on public.user_reports
  for select to authenticated using ((select auth.uid()) = reporter_id);

drop policy if exists "users can flag own location" on public.suspicious_locations;
create policy "users can flag own location" on public.suspicious_locations
  for insert to authenticated with check ((select auth.uid()) = user_id);

create or replace function public.claim_spot(p_spot_id uuid, p_user_id uuid)
returns public.spot_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.spot_claims;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;

  insert into public.spot_claims (spot_id, user_id, claim_strength, claimed_at, expires_at, updated_at)
  values (p_spot_id, p_user_id, 1, now(), now() + interval '24 hours', now())
  on conflict (spot_id, user_id) do update
    set claim_strength = public.spot_claims.claim_strength + 1,
        claimed_at = now(),
        expires_at = now() + interval '24 hours',
        updated_at = now()
  returning * into result;

  insert into public.spot_claim_history (spot_id, user_id, claim_strength, claimed_at)
  values (result.spot_id, result.user_id, result.claim_strength, now());

  return result;
end;
$$;

create or replace function public.get_spot_claim_info(p_spot_id uuid)
returns table(user_id uuid, claim_strength integer, claimed_at timestamptz, expires_at timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select sc.user_id, sc.claim_strength, sc.claimed_at, sc.expires_at
  from public.spot_claims sc
  where sc.spot_id = p_spot_id
    and (sc.expires_at is null or sc.expires_at > now())
  order by sc.claim_strength desc, sc.claimed_at desc;
$$;

create or replace function public.get_user_claimed_spots(p_user_id uuid)
returns setof public.spot_claims
language sql
stable
security invoker
set search_path = public
as $$
  select * from public.spot_claims
  where user_id = p_user_id
    and (expires_at is null or expires_at > now())
  order by claim_strength desc, claimed_at desc;
$$;

create or replace function public.get_spot_claims_leaderboard(p_limit integer default 25)
returns table(user_id uuid, total_claim_strength bigint, spots_claimed bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select sc.user_id,
         sum(sc.claim_strength)::bigint,
         count(distinct sc.spot_id)::bigint
  from public.spot_claims sc
  where sc.expires_at is null or sc.expires_at > now()
  group by sc.user_id
  order by sum(sc.claim_strength) desc
  limit greatest(coalesce(p_limit, 25), 1);
$$;

create or replace function public.increment_media_hype(p_media_id uuid, p_increment integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  if auth.uid() is null then raise exception 'not authorized'; end if;
  select count(*)::integer into new_total
  from public.media_hype_users
  where media_id = p_media_id;

  insert into public.media_hype(media_id, hype_count, updated_at)
  values (p_media_id, new_total, now())
  on conflict (media_id) do update
    set hype_count = excluded.hype_count,
        updated_at = now()
  returning hype_count into new_total;
  return new_total;
end;
$$;

create or replace function public.increment_clip_votes(submission_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'not authorized'; end if;
  select count(*)::integer into n from public.clip_votes where submission_id = increment_clip_votes.submission_id;
  update public.clip_submissions set votes = n where id = submission_id;
  return n;
end;
$$;

create or replace function public.decrement_clip_votes(submission_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'not authorized'; end if;
  select count(*)::integer into n from public.clip_votes where submission_id = decrement_clip_votes.submission_id;
  update public.clip_submissions set votes = n where id = submission_id;
  return n;
end;
$$;

create or replace function public.report_user(
  p_reporter_id uuid,
  p_reported_user_id uuid,
  p_report_type text,
  p_reason text,
  p_context text,
  p_context_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare report_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_reporter_id then raise exception 'not authorized'; end if;
  insert into public.user_reports(reporter_id, reported_user_id, report_type, reason, context, context_id)
  values (p_reporter_id, p_reported_user_id, p_report_type, p_reason, p_context, p_context_id)
  returning id into report_id;
  return report_id;
end;
$$;

create or replace function public.flag_suspicious_location(
  p_user_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_address text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare row_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'not authorized'; end if;
  insert into public.suspicious_locations(user_id, latitude, longitude, address)
  values (p_user_id, p_latitude, p_longitude, p_address)
  returning id into row_id;
  return row_id;
end;
$$;

create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_ip_address inet,
  p_endpoint text,
  p_limit integer,
  p_window_minutes integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  if p_user_id is not null and auth.uid() is not null and auth.uid() <> p_user_id then
    return false;
  end if;
  select count(*)::integer into n
  from public.api_rate_limits
  where endpoint = p_endpoint
    and coalesce(user_id::text, '') = coalesce(p_user_id::text, '')
    and coalesce(ip_address::text, '') = coalesce(p_ip_address::text, '')
    and window_started_at >= now() - make_interval(mins => greatest(p_window_minutes, 1));
  if n >= greatest(p_limit, 1) then return false; end if;
  insert into public.api_rate_limits(user_id, ip_address, endpoint)
  values (p_user_id, p_ip_address, p_endpoint);
  return true;
end;
$$;

create or replace function public.check_and_unlock_achievements(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare unlocked integer := 0;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'not authorized'; end if;
  insert into public.user_achievements(user_id, achievement_id, unlocked_at)
  select p_user_id, a.id, now()
  from public.achievements a
  where a.requirement_type = 'streak_days'
    and a.requirement_value <= coalesce((select current_streak from public.streaks where user_id = p_user_id), 0)
  on conflict (user_id, achievement_id) do nothing;
  get diagnostics unlocked = row_count;
  return unlocked;
end;
$$;

revoke all on function public.claim_spot(uuid, uuid) from public, anon;
revoke all on function public.increment_media_hype(uuid, integer) from public, anon;
revoke all on function public.increment_clip_votes(uuid) from public, anon;
revoke all on function public.decrement_clip_votes(uuid) from public, anon;
revoke all on function public.report_user(uuid, uuid, text, text, text, text) from public, anon;
revoke all on function public.flag_suspicious_location(uuid, double precision, double precision, text) from public, anon;
revoke all on function public.check_and_unlock_achievements(uuid) from public, anon;

grant execute on function public.claim_spot(uuid, uuid) to authenticated;
grant execute on function public.get_spot_claim_info(uuid) to authenticated;
grant execute on function public.get_user_claimed_spots(uuid) to authenticated;
grant execute on function public.get_spot_claims_leaderboard(integer) to authenticated;
grant execute on function public.increment_media_hype(uuid, integer) to authenticated;
grant execute on function public.increment_clip_votes(uuid) to authenticated;
grant execute on function public.decrement_clip_votes(uuid) to authenticated;
grant execute on function public.report_user(uuid, uuid, text, text, text, text) to authenticated;
grant execute on function public.flag_suspicious_location(uuid, double precision, double precision, text) to authenticated;
grant execute on function public.check_and_unlock_achievements(uuid) to authenticated;
grant execute on function public.check_rate_limit(uuid, inet, text, integer, integer) to anon, authenticated;
