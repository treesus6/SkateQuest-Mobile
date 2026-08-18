-- Make King of the Hill a real proof-based feature.
-- A user uploads an owned video, community judges review it, and only an
-- approved submission can create or replace the active spot claim.

alter table public.spot_claims
  add column if not exists trick_description text,
  add column if not exists status text not null default 'active';

update public.spot_claims
set status = 'active'
where status is null;

create table if not exists public.spot_claim_submissions (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.skate_spots(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete cascade,
  video_url text not null,
  trick_description text not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  stomped_votes integer not null default 0,
  bail_votes integer not null default 0,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (user_id, spot_id)
);

create table if not exists public.spot_claim_submission_votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.spot_claim_submissions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote text not null check (vote in ('stomped','bail')),
  created_at timestamptz not null default now(),
  unique (submission_id, user_id)
);

create index if not exists idx_spot_claim_submissions_pending
  on public.spot_claim_submissions(status, submitted_at);
create index if not exists idx_spot_claim_submission_votes_user
  on public.spot_claim_submission_votes(user_id, submission_id);

alter table public.spot_claim_submissions enable row level security;
alter table public.spot_claim_submission_votes enable row level security;

drop policy if exists "spot_claim_submissions_read" on public.spot_claim_submissions;
create policy "spot_claim_submissions_read"
on public.spot_claim_submissions for select to authenticated using (true);

drop policy if exists "spot_claim_submission_votes_read_own" on public.spot_claim_submission_votes;
create policy "spot_claim_submission_votes_read_own"
on public.spot_claim_submission_votes for select to authenticated using (user_id = auth.uid());

create or replace function public.submit_spot_claim_proof(
  p_spot_id uuid,
  p_media_id uuid,
  p_trick_description text
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
  v_submission_id uuid;
  v_existing_status text;
  v_description text := btrim(coalesce(p_trick_description, ''));
begin
  if v_user_id is null then raise exception 'not authorized'; end if;
  if v_description = '' then raise exception 'add the trick you landed'; end if;
  if not exists (select 1 from public.skate_spots where id = p_spot_id) then
    raise exception 'spot not found';
  end if;

  select m.url, m.type
  into v_video_url, v_media_type
  from public.media m
  where m.id = p_media_id and m.user_id = v_user_id;

  if not found or v_video_url is null then raise exception 'owned media proof not found'; end if;
  if v_media_type is distinct from 'video' then raise exception 'spot claim proof must be a video'; end if;

  select id, status
  into v_submission_id, v_existing_status
  from public.spot_claim_submissions
  where user_id = v_user_id and spot_id = p_spot_id
  for update;

  if found then
    if v_existing_status = 'PENDING' then raise exception 'spot claim proof is already pending'; end if;

    delete from public.spot_claim_submission_votes where submission_id = v_submission_id;
    update public.spot_claim_submissions
    set media_id = p_media_id,
        video_url = v_video_url,
        trick_description = v_description,
        status = 'PENDING',
        stomped_votes = 0,
        bail_votes = 0,
        submitted_at = now(),
        reviewed_at = null
    where id = v_submission_id;
  else
    insert into public.spot_claim_submissions (
      spot_id, user_id, media_id, video_url, trick_description
    ) values (
      p_spot_id, v_user_id, p_media_id, v_video_url, v_description
    ) returning id into v_submission_id;
  end if;

  return jsonb_build_object('success', true, 'submission_id', v_submission_id, 'status', 'PENDING');
end;
$$;

create or replace function public.judge_spot_claim_submission(
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
  v_spot_id uuid;
  v_media_id uuid;
  v_video_url text;
  v_trick_description text;
  v_status text;
  v_stomped integer;
  v_bail integer;
  v_previous_holder uuid;
  v_previous_strength integer := 0;
  v_reward integer := 50;
  v_result_status text := 'PENDING';
  v_total_judge_votes integer := 0;
  v_bonus integer := 0;
begin
  if v_judge_id is null then raise exception 'not authorized'; end if;

  p_vote := lower(p_vote);
  if p_vote not in ('stomped','bail') then raise exception 'invalid vote'; end if;

  select user_id, spot_id, media_id, video_url, trick_description, status
  into v_submitter_id, v_spot_id, v_media_id, v_video_url, v_trick_description, v_status
  from public.spot_claim_submissions
  where id = p_submission_id
  for update;

  if not found then raise exception 'submission not found'; end if;
  if v_submitter_id = v_judge_id then raise exception 'cannot judge own submission'; end if;
  if v_status <> 'PENDING' then raise exception 'submission is no longer pending'; end if;

  begin
    insert into public.spot_claim_submission_votes (submission_id, user_id, vote)
    values (p_submission_id, v_judge_id, p_vote);
  exception when unique_violation then
    raise exception 'already voted';
  end;

  select
    count(*) filter (where vote = 'stomped')::integer,
    count(*) filter (where vote = 'bail')::integer
  into v_stomped, v_bail
  from public.spot_claim_submission_votes
  where submission_id = p_submission_id;

  update public.spot_claim_submissions
  set stomped_votes = v_stomped, bail_votes = v_bail
  where id = p_submission_id;

  perform public.increment_user_xp(v_judge_id, 10);

  select
    coalesce((select count(*) from public.submission_votes where user_id = v_judge_id), 0) +
    coalesce((select count(*) from public.bounty_submission_votes where user_id = v_judge_id), 0) +
    coalesce((select count(*) from public.spot_claim_submission_votes where user_id = v_judge_id), 0)
  into v_total_judge_votes;

  if v_total_judge_votes > 0 and v_total_judge_votes % 5 = 0 then
    v_bonus := 50;
    perform public.increment_user_xp(v_judge_id, v_bonus);
  end if;

  if v_bail >= 3 then
    v_result_status := 'REJECTED';
    update public.spot_claim_submissions
    set status = 'REJECTED', reviewed_at = now()
    where id = p_submission_id;
  elsif v_stomped >= 10 then
    select user_id, coalesce(claim_strength, 0)
    into v_previous_holder, v_previous_strength
    from public.spot_claims
    where spot_id = v_spot_id
      and status = 'active'
      and (expires_at is null or expires_at > now())
    order by claimed_at desc
    limit 1
    for update;

    if v_previous_holder is not null and v_previous_holder <> v_submitter_id then
      v_reward := 100;
    else
      v_reward := 50;
    end if;

    delete from public.spot_claims where spot_id = v_spot_id;

    insert into public.spot_claims (
      spot_id,
      user_id,
      trick_name,
      video_url,
      verified,
      claimed_at,
      expires_at,
      claim_strength,
      updated_at,
      trick_description,
      status
    ) values (
      v_spot_id,
      v_submitter_id,
      v_trick_description,
      v_video_url,
      true,
      now(),
      now() + interval '30 days',
      greatest(v_previous_strength + 1, 1),
      now(),
      v_trick_description,
      'active'
    );

    insert into public.spot_claim_history (
      spot_id,
      previous_holder_id,
      new_holder_id,
      action,
      challenge_xp_reward,
      created_at
    ) values (
      v_spot_id,
      v_previous_holder,
      v_submitter_id,
      case when v_previous_holder is null then 'claimed' else 'challenged' end,
      v_reward,
      now()
    );

    update public.spot_claim_submissions
    set status = 'APPROVED', reviewed_at = now()
    where id = p_submission_id;

    update public.spot_claim_submissions
    set status = 'REJECTED', reviewed_at = now()
    where spot_id = v_spot_id and id <> p_submission_id and status = 'PENDING';

    perform public.increment_user_xp(v_submitter_id, v_reward);

    insert into public.activity_feed (
      user_id, activity_type, title, description, xp_earned, media_id
    ) values (
      v_submitter_id,
      'spot_claimed',
      case when v_previous_holder is null then 'Claimed King of the Hill' else 'Took over King of the Hill' end,
      v_trick_description,
      v_reward,
      v_media_id
    );

    v_result_status := 'APPROVED';
  end if;

  return jsonb_build_object(
    'success', true,
    'status', v_result_status,
    'judge_xp', 10,
    'bonus_xp', v_bonus,
    'stomped_votes', v_stomped,
    'bail_votes', v_bail,
    'claim_xp', case when v_result_status = 'APPROVED' then v_reward else 0 end
  );
end;
$$;

-- Disable the old proofless claim path. A spot claim must now come from a judged video.
revoke all on function public.claim_spot(uuid, uuid) from public;
revoke all on function public.claim_spot(uuid, uuid) from anon;
revoke all on function public.claim_spot(uuid, uuid) from authenticated;

revoke all on function public.submit_spot_claim_proof(uuid, uuid, text) from public;
revoke all on function public.judge_spot_claim_submission(uuid, text) from public;
grant execute on function public.submit_spot_claim_proof(uuid, uuid, text) to authenticated;
grant execute on function public.judge_spot_claim_submission(uuid, text) to authenticated;
