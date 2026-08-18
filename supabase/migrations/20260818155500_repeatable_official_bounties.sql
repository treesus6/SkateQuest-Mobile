-- Official SkateQuest bounties are reusable game challenges, not a single global prize.
-- Each skater may earn an official bounty once through judged video proof.
-- Community-created bounties still close when the first approved claimant wins them.

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
  v_stomped integer;
  v_bail integer;
  v_reward integer := 0;
  v_trick_name text;
  v_is_official boolean := false;
  v_result_status text := 'PENDING';
  v_total_judge_votes integer := 0;
  v_bonus integer := 0;
begin
  if v_judge_id is null then raise exception 'not authorized'; end if;
  p_vote := lower(p_vote);
  if p_vote not in ('stomped','bail') then raise exception 'invalid vote'; end if;

  select user_id, bounty_id, media_id, video_url, status, trick_name
  into v_submitter_id, v_bounty_id, v_media_id, v_video_url, v_status, v_trick_name
  from public.bounty_submissions
  where id = p_submission_id
  for update;

  if not found then raise exception 'submission not found'; end if;
  if v_submitter_id = v_judge_id then raise exception 'cannot judge own submission'; end if;
  if v_status <> 'PENDING' then raise exception 'submission is no longer pending'; end if;

  select coalesce(is_official, false), coalesce(xp_reward, 0)
  into v_is_official, v_reward
  from public.bounties
  where id = v_bounty_id
    and status = 'open'
    and (expires_at is null or expires_at > now());

  if not found then
    update public.bounty_submissions
    set status = 'REJECTED', reviewed_at = now()
    where id = p_submission_id;
    raise exception 'bounty is no longer open';
  end if;

  begin
    insert into public.bounty_submission_votes (submission_id, user_id, vote)
    values (p_submission_id, v_judge_id, p_vote);
  exception when unique_violation then
    raise exception 'already voted';
  end;

  select
    count(*) filter (where vote = 'stomped')::integer,
    count(*) filter (where vote = 'bail')::integer
  into v_stomped, v_bail
  from public.bounty_submission_votes
  where submission_id = p_submission_id;

  update public.bounty_submissions
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
    update public.bounty_submissions
    set status = 'REJECTED', reviewed_at = now()
    where id = p_submission_id;

  elsif v_stomped >= 10 then
    if v_is_official then
      -- Leave the catalog bounty open for other skaters. The unique
      -- (user_id,bounty_id) submission prevents the same skater from farming it.
      v_result_status := 'APPROVED';
      update public.bounty_submissions
      set status = 'APPROVED', reviewed_at = now()
      where id = p_submission_id;

      perform public.increment_user_xp(v_submitter_id, v_reward);

      insert into public.activity_feed (
        user_id, activity_type, title, description, xp_earned, media_id
      ) values (
        v_submitter_id,
        'bounty_completed',
        'Completed SkateQuest bounty: ' || coalesce(v_trick_name, 'skate challenge'),
        'Community judges approved the video proof.',
        v_reward,
        v_media_id
      );
    else
      update public.bounties
      set claimed_by = v_submitter_id,
          claim_video_url = v_video_url,
          status = 'claimed'
      where id = v_bounty_id
        and status = 'open'
        and (expires_at is null or expires_at > now())
      returning coalesce(xp_reward, 0) into v_reward;

      if found then
        v_result_status := 'APPROVED';
        update public.bounty_submissions
        set status = 'APPROVED', reviewed_at = now()
        where id = p_submission_id;

        update public.bounty_submissions
        set status = 'REJECTED', reviewed_at = now()
        where bounty_id = v_bounty_id
          and id <> p_submission_id
          and status = 'PENDING';

        perform public.increment_user_xp(v_submitter_id, v_reward);

        insert into public.activity_feed (
          user_id, activity_type, title, description, xp_earned, media_id
        ) values (
          v_submitter_id,
          'bounty_claimed',
          'Bounty approved: ' || coalesce(v_trick_name, 'skate challenge'),
          'Community judges approved the video proof.',
          v_reward,
          v_media_id
        );
      else
        v_result_status := 'REJECTED';
        update public.bounty_submissions
        set status = 'REJECTED', reviewed_at = now()
        where id = p_submission_id;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'status', v_result_status,
    'judge_xp', 10,
    'bonus_xp', v_bonus,
    'stomped_votes', v_stomped,
    'bail_votes', v_bail,
    'official_bounty', v_is_official
  );
end;
$$;

revoke all on function public.judge_bounty_submission(uuid, text) from public, anon;
grant execute on function public.judge_bounty_submission(uuid, text) to authenticated;
