-- Streaks are derived from server-verified activity. Users may not tap a button
-- to create a streak day or invent XP-at-risk history.

revoke insert, update, delete on public.streaks from authenticated;
revoke insert, update, delete on public.streak_history from authenticated;

drop policy if exists "Streak owners can insert" on public.streaks;
drop policy if exists "Streak owners can update" on public.streaks;
drop policy if exists "Streak owners can insert history" on public.streak_history;

update public.streaks set xp_at_risk = 0;
delete from public.streak_history where xp_lost > 0;

create or replace function public.get_verified_activity_streak()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
with activity_dates as (
  select distinct created_at::date as activity_date
  from public.xp_reward_ledger
  where user_id = auth.uid()

  union
  select distinct approved_at::date
  from public.challenge_submissions
  where user_id = auth.uid() and status = 'APPROVED' and approved_at is not null

  union
  select distinct approved_at::date
  from public.bounty_submissions
  where user_id = auth.uid() and status = 'APPROVED' and approved_at is not null

  union
  select distinct reviewed_at::date
  from public.spot_claim_submissions
  where user_id = auth.uid() and status = 'APPROVED' and reviewed_at is not null

  union
  select distinct reviewed_at::date
  from public.bingo_cell_submissions
  where user_id = auth.uid() and status = 'APPROVED' and reviewed_at is not null
),
numbered as (
  select activity_date,
         activity_date - (row_number() over (order by activity_date))::integer as streak_group
  from activity_dates
),
groups as (
  select streak_group,
         min(activity_date) as start_date,
         max(activity_date) as end_date,
         count(*)::integer as streak_length
  from numbered
  group by streak_group
),
summary as (
  select
    coalesce(max(streak_length), 0)::integer as longest_streak,
    coalesce(
      max(streak_length) filter (
        where end_date = (select max(activity_date) from activity_dates)
          and end_date >= current_date - 1
      ),
      0
    )::integer as current_streak,
    (select max(activity_date) from activity_dates) as last_active_date
  from groups
),
recent as (
  select coalesce(jsonb_agg(activity_date order by activity_date), '[]'::jsonb) as active_dates
  from activity_dates
  where activity_date >= current_date - 6
)
select jsonb_build_object(
  'current_streak', summary.current_streak,
  'longest_streak', summary.longest_streak,
  'last_active_date', summary.last_active_date,
  'active_dates', recent.active_dates,
  'logged_today', exists(select 1 from activity_dates where activity_date = current_date)
)
from summary cross join recent;
$$;

revoke all on function public.get_verified_activity_streak() from public, anon;
grant execute on function public.get_verified_activity_streak() to authenticated;
