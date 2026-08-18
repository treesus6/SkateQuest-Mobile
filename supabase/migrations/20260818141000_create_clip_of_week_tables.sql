-- Clip of the Week is a distinct community contest from challenge clip submissions
-- and Trick of the Week. Give it dedicated tables so schemas do not drift together.

create table if not exists public.clip_of_week_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete cascade,
  week_number integer not null check (week_number between 1 and 53),
  year integer not null check (year >= 2020),
  trick_name text,
  votes integer not null default 0,
  created_at timestamptz not null default now(),
  unique (media_id)
);

create index if not exists idx_clip_of_week_week
  on public.clip_of_week_submissions(year desc, week_number desc, votes desc, created_at asc);

alter table public.clip_of_week_submissions enable row level security;

drop policy if exists "clip_of_week_view" on public.clip_of_week_submissions;
create policy "clip_of_week_view"
on public.clip_of_week_submissions
for select
to authenticated
using (true);

drop policy if exists "clip_of_week_insert_own" on public.clip_of_week_submissions;
create policy "clip_of_week_insert_own"
on public.clip_of_week_submissions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.media m
    where m.id = media_id
      and m.user_id = auth.uid()
      and m.type = 'video'
  )
);

drop policy if exists "clip_of_week_delete_own" on public.clip_of_week_submissions;
create policy "clip_of_week_delete_own"
on public.clip_of_week_submissions
for delete
to authenticated
using (user_id = auth.uid());

create table if not exists public.clip_of_week_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid not null references public.clip_of_week_submissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, submission_id)
);

create index if not exists idx_clip_of_week_votes_submission
  on public.clip_of_week_votes(submission_id);

alter table public.clip_of_week_votes enable row level security;

drop policy if exists "clip_of_week_votes_view_own" on public.clip_of_week_votes;
create policy "clip_of_week_votes_view_own"
on public.clip_of_week_votes
for select
to authenticated
using (user_id = auth.uid());

-- Writes go through the RPC below so the cached vote count is always synchronized.

create or replace function public.set_clip_of_week_vote(
  p_submission_id uuid,
  p_voted boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_vote_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1 from public.clip_of_week_submissions s where s.id = p_submission_id
  ) then
    raise exception 'submission not found';
  end if;

  if p_voted then
    insert into public.clip_of_week_votes (user_id, submission_id)
    values (v_user_id, p_submission_id)
    on conflict (user_id, submission_id) do nothing;
  else
    delete from public.clip_of_week_votes
    where user_id = v_user_id
      and submission_id = p_submission_id;
  end if;

  select count(*)::integer
    into v_vote_count
  from public.clip_of_week_votes
  where submission_id = p_submission_id;

  update public.clip_of_week_submissions
  set votes = v_vote_count
  where id = p_submission_id;

  return jsonb_build_object(
    'success', true,
    'submission_id', p_submission_id,
    'voted', p_voted,
    'votes', v_vote_count
  );
end;
$$;

revoke all on function public.set_clip_of_week_vote(uuid, boolean) from public;
revoke all on function public.set_clip_of_week_vote(uuid, boolean) from anon;
grant execute on function public.set_clip_of_week_vote(uuid, boolean) to authenticated;
