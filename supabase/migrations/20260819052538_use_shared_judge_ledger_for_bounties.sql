create or replace function public.judge_bounty_submission(p_submission_id uuid,p_vote text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_judge_id uuid:=auth.uid();
  v_submitter_id uuid;
  v_bounty_id uuid;
  v_media_id uuid;
  v_video_url text;
  v_status text;
  v_vote text:=upper(btrim(coalesce(p_vote,'')));
  v_stomped integer;
  v_bail integer;
  v_reward integer:=0;
  v_trick_name text;
  v_is_official boolean:=false;
  v_result_status text:='PENDING';
  v_vote_id uuid;
  v_judge jsonb;
  v_submitter_xp integer:=0;
begin
  if v_judge_id is null then raise exception 'authentication required'; end if;
  if v_vote not in ('STOMPED','BAIL') then raise exception 'invalid vote'; end if;
  select user_id,bounty_id,media_id,video_url,status,trick_name
  into v_submitter_id,v_bounty_id,v_media_id,v_video_url,v_status,v_trick_name
  from public.bounty_submissions where id=p_submission_id for update;
  if not found then raise exception 'submission not found'; end if;
  if v_submitter_id=v_judge_id then raise exception 'cannot vote on your own submission'; end if;
  if v_status<>'PENDING' then raise exception 'submission is no longer pending'; end if;
  select coalesce(is_official,false),coalesce(xp_reward,0)
  into v_is_official,v_reward
  from public.bounties where id=v_bounty_id and status='open' and (expires_at is null or expires_at>now()) for update;
  if not found then update public.bounty_submissions set status='REJECTED' where id=p_submission_id; raise exception 'bounty is no longer open'; end if;
  begin
    insert into public.bounty_submission_votes(submission_id,user_id,vote)
    values(p_submission_id,v_judge_id,v_vote) returning id into v_vote_id;
  exception when unique_violation then raise exception 'already voted'; end;
  select count(*) filter(where vote='STOMPED')::integer,count(*) filter(where vote='BAIL')::integer
  into v_stomped,v_bail from public.bounty_submission_votes where submission_id=p_submission_id;
  update public.bounty_submissions set stomped_votes=v_stomped,bail_votes=v_bail where id=p_submission_id;
  v_judge:=private.award_judge_participation(v_judge_id,'bounty_judge_vote:'||v_vote_id::text,'bounty_judge_vote');
  if v_bail>=3 then
    v_result_status:='REJECTED';
    update public.bounty_submissions set status='REJECTED' where id=p_submission_id;
  elsif v_stomped>=10 then
    if v_is_official then
      update public.bounty_submissions set status='APPROVED',approved_at=now() where id=p_submission_id and status='PENDING';
      if found then
        v_result_status:='APPROVED';
        v_submitter_xp:=private.award_ledgered_xp(v_submitter_id,'bounty_submission:'||p_submission_id::text,'official_bounty',v_reward);
        insert into public.activity_feed(user_id,activity_type,title,description,xp_earned,media_id)
        values(v_submitter_id,'bounty_completed','Completed SkateQuest bounty: '||coalesce(v_trick_name,'skate challenge'),'Community judges approved the video proof.',v_submitter_xp,v_media_id);
      end if;
    else
      update public.bounties set claimed_by=v_submitter_id,claim_video_url=v_video_url,status='claimed'
      where id=v_bounty_id and status='open' and claimed_by is null and (expires_at is null or expires_at>now())
      returning coalesce(xp_reward,0) into v_reward;
      if found then
        v_result_status:='APPROVED';
        update public.bounty_submissions set status='APPROVED',approved_at=now() where id=p_submission_id;
        update public.bounty_submissions set status='REJECTED' where bounty_id=v_bounty_id and id<>p_submission_id and status='PENDING';
        v_submitter_xp:=private.award_ledgered_xp(v_submitter_id,'bounty_submission:'||p_submission_id::text,'bounty_claim',v_reward);
        insert into public.activity_feed(user_id,activity_type,title,description,xp_earned,media_id)
        values(v_submitter_id,'bounty_claimed','Bounty approved: '||coalesce(v_trick_name,'skate challenge'),'Community judges approved the video proof.',v_submitter_xp,v_media_id);
      else
        v_result_status:='REJECTED';
        update public.bounty_submissions set status='REJECTED' where id=p_submission_id;
      end if;
    end if;
  end if;
  return jsonb_build_object('success',true,'status',v_result_status,'judge_xp',coalesce((v_judge->>'judge_xp')::integer,0),'bonus_xp',coalesce((v_judge->>'bonus_xp')::integer,0),'stomped_votes',v_stomped,'bail_votes',v_bail,'official_bounty',v_is_official,'bounty_reward',case when v_result_status='APPROVED' then v_submitter_xp else 0 end);
end;
$$;
revoke all on function public.judge_bounty_submission(uuid,text) from public,anon;
grant execute on function public.judge_bounty_submission(uuid,text) to authenticated,service_role;
