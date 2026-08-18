-- Source-controlled reconciliation for the verified Judge's Booth backend.
-- This version intentionally does not reuse 20260818152000 because production
-- already used that migration version for a different hardening migration.

create table if not exists public.challenge_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.challenges(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  video_url text not null,
  spot_id uuid references public.skateparks(id) on delete set null,
  stomped_votes integer default 0,
  bail_votes integer default 0,
  status text default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  submitted_at timestamptz default now(),
  approved_at timestamptz,
  unique (challenge_id, user_id)
);

create table if not exists public.submission_votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.challenge_submissions(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  vote text not null check (vote in ('STOMPED','BAIL')),
  voted_at timestamptz default now(),
  unique (submission_id, user_id)
);

create table if not exists public.bounty_submissions (
  id uuid primary key default gen_random_uuid(),
  bounty_id uuid not null references public.bounties(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete cascade,
  video_url text not null,
  trick_name text not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  stomped_votes integer not null default 0,
  bail_votes integer not null default 0,
  submitted_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists public.bounty_submission_votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.bounty_submissions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote text not null check (vote in ('STOMPED','BAIL')),
  voted_at timestamptz not null default now(),
  unique (submission_id, user_id)
);

create index if not exists idx_challenge_submissions_pending
  on public.challenge_submissions(status, submitted_at);
create index if not exists idx_bounty_submissions_pending
  on public.bounty_submissions(status, submitted_at);
create index if not exists idx_submission_votes_user
  on public.submission_votes(user_id, submission_id);
create index if not exists idx_bounty_submission_votes_user
  on public.bounty_submission_votes(user_id, submission_id);

alter table public.challenge_submissions enable row level security;
alter table public.submission_votes enable row level security;
alter table public.bounty_submissions enable row level security;
alter table public.bounty_submission_votes enable row level security;

drop policy if exists "challenge_submissions_read" on public.challenge_submissions;
create policy "challenge_submissions_read"
on public.challenge_submissions for select to authenticated using (true);

drop policy if exists "submission_votes_read_own" on public.submission_votes;
create policy "submission_votes_read_own"
on public.submission_votes for select to authenticated using (user_id = auth.uid());

drop policy if exists "bounty_submissions_read" on public.bounty_submissions;
create policy "bounty_submissions_read"
on public.bounty_submissions for select to authenticated using (true);

drop policy if exists "bounty_submission_votes_read_own" on public.bounty_submission_votes;
create policy "bounty_submission_votes_read_own"
on public.bounty_submission_votes for select to authenticated using (user_id = auth.uid());

create or replace function public.submit_challenge_proof(
  p_challenge_id uuid,
  p_media_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_video_url text;
  v_media_type text;
  v_active boolean;
  v_status text;
  v_challenger_id uuid;
  v_starts_at timestamptz;
  v_expires_at timestamptz;
  v_submission_id uuid;
  v_existing_status text;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  select m.url, m.type into v_video_url, v_media_type
  from public.media m
  where m.id = p_media_id and m.user_id = v_user_id;
  if not found or v_video_url is null then raise exception 'owned media proof not found'; end if;
  if v_media_type is distinct from 'video' then raise exception 'challenge proof must be a video'; end if;

  select active,status,challenger_id,starts_at,expires_at
  into v_active,v_status,v_challenger_id,v_starts_at,v_expires_at
  from public.challenges
  where id=p_challenge_id;
  if not found then raise exception 'challenge not found'; end if;
  if coalesce(v_active,false) is not true or v_status <> 'pending' then
    raise exception 'challenge is not active';
  end if;
  if v_challenger_id is not null and v_challenger_id <> v_user_id then
    raise exception 'this challenge belongs to another skater';
  end if;
  if v_starts_at is not null and v_starts_at > now() then raise exception 'challenge has not started'; end if;
  if v_expires_at is not null and v_expires_at <= now() then raise exception 'challenge has expired'; end if;

  select id,status into v_submission_id,v_existing_status
  from public.challenge_submissions
  where challenge_id=p_challenge_id and user_id=v_user_id
  for update;

  if found then
    if v_existing_status='PENDING' then raise exception 'you already have a pending submission'; end if;
    if v_existing_status='APPROVED' then raise exception 'challenge already approved for this account'; end if;

    delete from public.submission_votes where submission_id=v_submission_id;
    update public.challenge_submissions
    set video_url=v_video_url,
        status='PENDING',
        stomped_votes=0,
        bail_votes=0,
        submitted_at=now(),
        approved_at=null
    where id=v_submission_id;
  else
    insert into public.challenge_submissions(challenge_id,user_id,video_url,status)
    values(p_challenge_id,v_user_id,v_video_url,'PENDING')
    returning id into v_submission_id;
  end if;

  insert into public.challenge_completions(user_id,challenge_id,video_url,completed,verified,updated_at)
  values(v_user_id,p_challenge_id,v_video_url,false,false,now())
  on conflict(user_id,challenge_id) do update
  set video_url=excluded.video_url,
      completed=false,
      completed_at=null,
      verified=false,
      verified_by=null,
      updated_at=now();

  return jsonb_build_object('success',true,'submission_id',v_submission_id,'status','PENDING');
end;
$$;

create or replace function public.submit_bounty_claim(
  p_bounty_id uuid,
  p_media_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_video_url text;
  v_media_type text;
  v_trick_name text;
  v_status text;
  v_claimed_by uuid;
  v_created_by uuid;
  v_expires_at timestamptz;
  v_submission_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  select m.url, m.type into v_video_url, v_media_type
  from public.media m
  where m.id = p_media_id and m.user_id = v_user_id;
  if not found or v_video_url is null then raise exception 'owned media proof not found'; end if;
  if v_media_type is distinct from 'video' then raise exception 'bounty proof must be a video'; end if;

  select b.trick_name,b.status,b.claimed_by,b.created_by,b.expires_at
  into v_trick_name,v_status,v_claimed_by,v_created_by,v_expires_at
  from public.bounties b
  where b.id=p_bounty_id
  for update;

  if not found then raise exception 'bounty not found'; end if;
  if v_status <> 'open' or v_claimed_by is not null then raise exception 'bounty is no longer open'; end if;
  if v_created_by = v_user_id then raise exception 'you cannot claim your own bounty'; end if;
  if v_expires_at is not null and v_expires_at <= now() then
    update public.bounties set status='expired' where id=p_bounty_id;
    raise exception 'bounty has expired';
  end if;
  if exists (
    select 1 from public.bounty_submissions
    where bounty_id=p_bounty_id and user_id=v_user_id and status='PENDING'
  ) then
    raise exception 'you already have a pending submission for this bounty';
  end if;
  if exists (
    select 1 from public.bounty_submissions
    where bounty_id=p_bounty_id and user_id=v_user_id and status='APPROVED'
  ) then
    raise exception 'this bounty is already approved for your account';
  end if;

  insert into public.bounty_submissions(bounty_id,user_id,media_id,video_url,trick_name)
  values(p_bounty_id,v_user_id,p_media_id,v_video_url,v_trick_name)
  returning id into v_submission_id;

  return jsonb_build_object('success',true,'submission_id',v_submission_id,'status','PENDING');
end;
$$;

create or replace function public.judge_challenge_submission(
  p_submission_id uuid,
  p_vote text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_judge_id uuid := auth.uid();
  v_submitter_id uuid;
  v_challenge_id uuid;
  v_video_url text;
  v_status text;
  v_vote text := upper(p_vote);
  v_stomped integer;
  v_bail integer;
  v_new_status text;
  v_judge_vote_count integer;
  v_bonus integer := 0;
  v_judge_xp integer := 10;
  v_challenge_xp integer := 0;
  v_awarded boolean := false;
begin
  if v_judge_id is null then raise exception 'authentication required'; end if;
  if v_vote not in ('STOMPED','BAIL') then raise exception 'invalid vote'; end if;

  select user_id,challenge_id,video_url,status
  into v_submitter_id,v_challenge_id,v_video_url,v_status
  from public.challenge_submissions
  where id=p_submission_id
  for update;

  if not found then raise exception 'submission not found'; end if;
  if v_submitter_id=v_judge_id then raise exception 'cannot vote on your own submission'; end if;
  if v_status <> 'PENDING' then raise exception 'submission is no longer pending'; end if;

  begin
    insert into public.submission_votes(submission_id,user_id,vote)
    values(p_submission_id,v_judge_id,v_vote);
  exception when unique_violation then
    raise exception 'already voted';
  end;

  select
    count(*) filter(where vote='STOMPED')::integer,
    count(*) filter(where vote='BAIL')::integer
  into v_stomped,v_bail
  from public.submission_votes
  where submission_id=p_submission_id;

  v_new_status := case
    when v_stomped >= 10 then 'APPROVED'
    when v_bail >= 3 then 'REJECTED'
    else 'PENDING'
  end;

  if v_new_status='APPROVED' then
    select coalesce(xp_reward,0) into v_challenge_xp
    from public.challenges where id=v_challenge_id;

    update public.challenge_completions
    set completed=true,
        completed_at=now(),
        verified=true,
        verified_by=v_judge_id,
        video_url=coalesce(video_url,v_video_url),
        updated_at=now()
    where user_id=v_submitter_id
      and challenge_id=v_challenge_id
      and coalesce(completed,false)=false;

    if found then
      perform public.increment_user_xp(v_submitter_id,v_challenge_xp);
      v_awarded := true;
      insert into public.activity_feed(user_id,activity_type,title,description,xp_earned)
      select v_submitter_id,'challenge_approved',
             'Challenge approved: ' || coalesce(title,trick),
             'Community judges approved the video proof.',v_challenge_xp
      from public.challenges where id=v_challenge_id;
    end if;
  elsif v_new_status='REJECTED' then
    update public.challenge_completions
    set completed=false,verified=false,verified_by=null,updated_at=now()
    where user_id=v_submitter_id and challenge_id=v_challenge_id;
  end if;

  update public.challenge_submissions
  set stomped_votes=v_stomped,
      bail_votes=v_bail,
      status=v_new_status,
      approved_at=case when v_new_status='APPROVED' then now() else approved_at end
  where id=p_submission_id;

  select count(*)::integer into v_judge_vote_count
  from public.submission_votes where user_id=v_judge_id;
  if v_judge_vote_count % 5=0 then v_bonus:=50; v_judge_xp:=60; end if;
  perform public.increment_user_xp(v_judge_id,v_judge_xp);

  return jsonb_build_object(
    'success',true,'submission_id',p_submission_id,'status',v_new_status,
    'stomped_votes',v_stomped,'bail_votes',v_bail,
    'xp_earned',v_judge_xp,'bonus_xp',v_bonus,
    'challenge_xp_awarded',case when v_awarded then v_challenge_xp else 0 end,
    'judge_vote_count',v_judge_vote_count
  );
end;
$$;

create or replace function public.judge_bounty_submission(
  p_submission_id uuid,
  p_vote text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_judge_id uuid := auth.uid();
  v_submitter_id uuid;
  v_bounty_id uuid;
  v_video_url text;
  v_submission_status text;
  v_vote text := upper(p_vote);
  v_stomped integer;
  v_bail integer;
  v_new_status text := 'PENDING';
  v_bounty_status text;
  v_bounty_claimed_by uuid;
  v_bounty_expires timestamptz;
  v_reward integer := 0;
  v_judge_vote_count integer;
  v_bonus integer := 0;
  v_judge_xp integer := 10;
begin
  if v_judge_id is null then raise exception 'authentication required'; end if;
  if v_vote not in ('STOMPED','BAIL') then raise exception 'invalid vote'; end if;

  select user_id,bounty_id,video_url,status
  into v_submitter_id,v_bounty_id,v_video_url,v_submission_status
  from public.bounty_submissions
  where id=p_submission_id
  for update;

  if not found then raise exception 'submission not found'; end if;
  if v_submitter_id=v_judge_id then raise exception 'cannot vote on your own submission'; end if;
  if v_submission_status <> 'PENDING' then raise exception 'submission is no longer pending'; end if;

  begin
    insert into public.bounty_submission_votes(submission_id,user_id,vote)
    values(p_submission_id,v_judge_id,v_vote);
  exception when unique_violation then
    raise exception 'already voted';
  end;

  select
    count(*) filter (where vote='STOMPED')::integer,
    count(*) filter (where vote='BAIL')::integer
  into v_stomped,v_bail
  from public.bounty_submission_votes
  where submission_id=p_submission_id;

  if v_bail >= 3 then
    v_new_status := 'REJECTED';
  elsif v_stomped >= 10 then
    select status,claimed_by,expires_at,coalesce(xp_reward,0)
    into v_bounty_status,v_bounty_claimed_by,v_bounty_expires,v_reward
    from public.bounties
    where id=v_bounty_id
    for update;

    if v_bounty_status='open'
       and v_bounty_claimed_by is null
       and (v_bounty_expires is null or v_bounty_expires > now()) then
      update public.bounties
      set claimed_by=v_submitter_id,
          claim_video_url=v_video_url,
          status='claimed'
      where id=v_bounty_id;

      perform public.increment_user_xp(v_submitter_id,v_reward);
      v_new_status := 'APPROVED';
      update public.bounty_submissions
      set status='REJECTED'
      where bounty_id=v_bounty_id and id<>p_submission_id and status='PENDING';

      insert into public.activity_feed(user_id,activity_type,title,description,xp_earned,media_id)
      select v_submitter_id,'bounty_claimed','Bounty approved: ' || trick_name,
             'Community judges approved the video proof.',v_reward,media_id
      from public.bounty_submissions where id=p_submission_id;
    else
      v_new_status := 'REJECTED';
    end if;
  end if;

  update public.bounty_submissions
  set stomped_votes=v_stomped,
      bail_votes=v_bail,
      status=v_new_status,
      approved_at=case when v_new_status='APPROVED' then now() else approved_at end
  where id=p_submission_id;

  select count(*)::integer into v_judge_vote_count
  from public.bounty_submission_votes where user_id=v_judge_id;
  if v_judge_vote_count % 5=0 then v_bonus:=50; v_judge_xp:=60; end if;
  perform public.increment_user_xp(v_judge_id,v_judge_xp);

  return jsonb_build_object(
    'success',true,'status',v_new_status,
    'stomped_votes',v_stomped,'bail_votes',v_bail,
    'judge_xp',v_judge_xp,'bonus_xp',v_bonus,
    'bounty_reward',case when v_new_status='APPROVED' then v_reward else 0 end
  );
end;
$$;

revoke all on function public.submit_challenge_proof(uuid,uuid) from public, anon;
revoke all on function public.submit_bounty_claim(uuid,uuid) from public, anon;
revoke all on function public.judge_challenge_submission(uuid,text) from public, anon;
revoke all on function public.judge_bounty_submission(uuid,text) from public, anon;
grant execute on function public.submit_challenge_proof(uuid,uuid) to authenticated;
grant execute on function public.submit_bounty_claim(uuid,uuid) to authenticated;
grant execute on function public.judge_challenge_submission(uuid,text) to authenticated;
grant execute on function public.judge_bounty_submission(uuid,text) to authenticated;
