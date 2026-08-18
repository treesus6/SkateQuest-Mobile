-- Official SkateQuest bounties are reusable game challenges, not a single global prize.
-- Each skater may earn an official bounty once through judged video proof.
-- Community-created bounties still close when the first approved claimant wins them.

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
  v_existing_status text;
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

  select id,status into v_submission_id,v_existing_status
  from public.bounty_submissions
  where bounty_id=p_bounty_id and user_id=v_user_id
  order by submitted_at desc
  limit 1
  for update;

  if found then
    if v_existing_status='PENDING' then
      raise exception 'you already have a pending submission for this bounty';
    end if;
    if v_existing_status='APPROVED' then
      raise exception 'this bounty is already approved for your account';
    end if;

    delete from public.bounty_submission_votes where submission_id=v_submission_id;
    update public.bounty_submissions
    set media_id=p_media_id,
        video_url=v_video_url,
        trick_name=v_trick_name,
        status='PENDING',
        stomped_votes=0,
        bail_votes=0,
        submitted_at=now(),
        approved_at=null
    where id=v_submission_id;
  else
    insert into public.bounty_submissions(bounty_id,user_id,media_id,video_url,trick_name)
    values(p_bounty_id,v_user_id,p_media_id,v_video_url,v_trick_name)
    returning id into v_submission_id;
  end if;

  return jsonb_build_object('success',true,'submission_id',v_submission_id,'status','PENDING');
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
  v_media_id uuid;
  v_video_url text;
  v_status text;
  v_vote text := upper(p_vote);
  v_stomped integer;
  v_bail integer;
  v_reward integer := 0;
  v_trick_name text;
  v_is_official boolean := false;
  v_result_status text := 'PENDING';
  v_total_judge_votes integer := 0;
  v_bonus integer := 0;
begin
  if v_judge_id is null then raise exception 'authentication required'; end if;
  if v_vote not in ('STOMPED','BAIL') then raise exception 'invalid vote'; end if;

  select user_id,bounty_id,media_id,video_url,status,trick_name
  into v_submitter_id,v_bounty_id,v_media_id,v_video_url,v_status,v_trick_name
  from public.bounty_submissions
  where id=p_submission_id
  for update;

  if not found then raise exception 'submission not found'; end if;
  if v_submitter_id=v_judge_id then raise exception 'cannot vote on your own submission'; end if;
  if v_status <> 'PENDING' then raise exception 'submission is no longer pending'; end if;

  select coalesce(is_official,false),coalesce(xp_reward,0)
  into v_is_official,v_reward
  from public.bounties
  where id=v_bounty_id
    and status='open'
    and (expires_at is null or expires_at > now())
  for update;

  if not found then
    update public.bounty_submissions
    set status='REJECTED'
    where id=p_submission_id;
    raise exception 'bounty is no longer open';
  end if;

  begin
    insert into public.bounty_submission_votes(submission_id,user_id,vote)
    values(p_submission_id,v_judge_id,v_vote);
  exception when unique_violation then
    raise exception 'already voted';
  end;

  select
    count(*) filter(where vote='STOMPED')::integer,
    count(*) filter(where vote='BAIL')::integer
  into v_stomped,v_bail
  from public.bounty_submission_votes
  where submission_id=p_submission_id;

  update public.bounty_submissions
  set stomped_votes=v_stomped,bail_votes=v_bail
  where id=p_submission_id;

  perform public.increment_user_xp(v_judge_id,10);

  select
    coalesce((select count(*) from public.submission_votes where user_id=v_judge_id),0) +
    coalesce((select count(*) from public.bounty_submission_votes where user_id=v_judge_id),0) +
    coalesce((select count(*) from public.spot_claim_submission_votes where user_id=v_judge_id),0)
  into v_total_judge_votes;

  if v_total_judge_votes > 0 and v_total_judge_votes % 5=0 then
    v_bonus:=50;
    perform public.increment_user_xp(v_judge_id,v_bonus);
  end if;

  if v_bail >= 3 then
    v_result_status:='REJECTED';
    update public.bounty_submissions
    set status='REJECTED'
    where id=p_submission_id;

  elsif v_stomped >= 10 then
    if v_is_official then
      -- The catalog row remains open. This approved submission is the durable
      -- record that this skater already earned this official bounty.
      v_result_status:='APPROVED';
      update public.bounty_submissions
      set status='APPROVED',approved_at=now()
      where id=p_submission_id and status='PENDING';

      if found then
        perform public.increment_user_xp(v_submitter_id,v_reward);
        insert into public.activity_feed(user_id,activity_type,title,description,xp_earned,media_id)
        values(
          v_submitter_id,
          'bounty_completed',
          'Completed SkateQuest bounty: ' || coalesce(v_trick_name,'skate challenge'),
          'Community judges approved the video proof.',
          v_reward,
          v_media_id
        );
      end if;
    else
      update public.bounties
      set claimed_by=v_submitter_id,
          claim_video_url=v_video_url,
          status='claimed'
      where id=v_bounty_id
        and status='open'
        and claimed_by is null
        and (expires_at is null or expires_at > now())
      returning coalesce(xp_reward,0) into v_reward;

      if found then
        v_result_status:='APPROVED';
        update public.bounty_submissions
        set status='APPROVED',approved_at=now()
        where id=p_submission_id;

        update public.bounty_submissions
        set status='REJECTED'
        where bounty_id=v_bounty_id and id<>p_submission_id and status='PENDING';

        perform public.increment_user_xp(v_submitter_id,v_reward);
        insert into public.activity_feed(user_id,activity_type,title,description,xp_earned,media_id)
        values(
          v_submitter_id,
          'bounty_claimed',
          'Bounty approved: ' || coalesce(v_trick_name,'skate challenge'),
          'Community judges approved the video proof.',
          v_reward,
          v_media_id
        );
      else
        v_result_status:='REJECTED';
        update public.bounty_submissions set status='REJECTED' where id=p_submission_id;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'success',true,
    'status',v_result_status,
    'judge_xp',10,
    'bonus_xp',v_bonus,
    'stomped_votes',v_stomped,
    'bail_votes',v_bail,
    'official_bounty',v_is_official,
    'bounty_reward',case when v_result_status='APPROVED' then v_reward else 0 end
  );
end;
$$;

revoke all on function public.submit_bounty_claim(uuid,uuid) from public,anon;
revoke all on function public.judge_bounty_submission(uuid,text) from public,anon;
grant execute on function public.submit_bounty_claim(uuid,uuid) to authenticated;
grant execute on function public.judge_bounty_submission(uuid,text) to authenticated;
