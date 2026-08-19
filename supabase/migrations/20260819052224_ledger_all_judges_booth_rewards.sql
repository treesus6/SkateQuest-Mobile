begin;

create or replace function private.award_judge_participation(
  p_user_id uuid,
  p_vote_reward_key text,
  p_source text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_total integer:=0;
  v_judge_xp integer:=0;
  v_bonus integer:=0;
begin
  if p_user_id is null then return jsonb_build_object('judge_xp',0,'bonus_xp',0,'total_votes',0); end if;
  v_judge_xp:=private.award_ledgered_xp(p_user_id,p_vote_reward_key,p_source,10);
  select
    coalesce((select count(*) from public.submission_votes where user_id=p_user_id),0)+
    coalesce((select count(*) from public.bounty_submission_votes where user_id=p_user_id),0)+
    coalesce((select count(*) from public.spot_claim_submission_votes where user_id=p_user_id),0)+
    coalesce((select count(*) from public.bingo_cell_submission_votes where user_id=p_user_id),0)
  into v_total;
  if v_total>0 and v_total%5=0 then
    v_bonus:=private.award_ledgered_xp(p_user_id,'judge_milestone:'||v_total::text,'judge_milestone',50);
  end if;
  return jsonb_build_object('judge_xp',v_judge_xp,'bonus_xp',v_bonus,'total_votes',v_total);
end;
$$;
revoke all on function private.award_judge_participation(uuid,text,text) from public,anon,authenticated;
grant execute on function private.award_judge_participation(uuid,text,text) to service_role;

drop policy if exists "Users can insert own completions" on public.challenge_completions;
drop policy if exists "Users can update own completions" on public.challenge_completions;
revoke insert,update,delete on public.challenge_completions from anon,authenticated;
grant select on public.challenge_completions to authenticated;
revoke insert,update,delete on public.challenge_submissions from anon,authenticated;
grant select on public.challenge_submissions to authenticated;
revoke insert,update,delete on public.submission_votes from anon,authenticated;
grant select on public.submission_votes to authenticated;

create or replace function public.trg_mission_challenge_completed()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.completed=true and (tg_op='INSERT' or old.completed is distinct from true) and new.user_id is not null then
    perform private.increment_mission_progress_once(new.user_id,'complete_challenge','challenge_completion:'||new.id::text,1);
  end if;
  return new;
end;
$$;
revoke all on function public.trg_mission_challenge_completed() from public,anon,authenticated;
drop trigger if exists trg_challenge_completions_mission_progress on public.challenge_completions;
create trigger trg_challenge_completions_mission_progress
after insert or update on public.challenge_completions
for each row execute function public.trg_mission_challenge_completed();

create or replace function public.judge_challenge_submission(p_submission_id uuid,p_vote text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_judge_id uuid:=auth.uid(); v_submitter_id uuid; v_challenge_id uuid; v_media_id uuid; v_status text;
  v_vote text:=upper(btrim(coalesce(p_vote,''))); v_stomped integer; v_bail integer; v_reward integer:=0;
  v_title text; v_vote_id uuid; v_judge jsonb; v_submitter_xp integer:=0;
begin
  if v_judge_id is null then raise exception 'authentication required'; end if;
  if v_vote not in ('STOMPED','BAIL') then raise exception 'invalid vote'; end if;
  select user_id,challenge_id,media_id,status into v_submitter_id,v_challenge_id,v_media_id,v_status
  from public.challenge_submissions where id=p_submission_id for update;
  if not found then raise exception 'submission not found'; end if;
  if v_submitter_id=v_judge_id then raise exception 'cannot vote on your own submission'; end if;
  if v_status<>'PENDING' then raise exception 'submission is no longer pending'; end if;
  select coalesce(xp_reward,0),title into v_reward,v_title
  from public.challenges where id=v_challenge_id and active=true and status='pending' and (expires_at is null or expires_at>now());
  if not found then update public.challenge_submissions set status='REJECTED',reviewed_at=now() where id=p_submission_id; raise exception 'challenge is no longer active'; end if;
  begin
    insert into public.submission_votes(submission_id,user_id,vote) values(p_submission_id,v_judge_id,v_vote) returning id into v_vote_id;
  exception when unique_violation then raise exception 'already voted'; end;
  select count(*) filter(where vote='STOMPED')::integer,count(*) filter(where vote='BAIL')::integer
  into v_stomped,v_bail from public.submission_votes where submission_id=p_submission_id;
  update public.challenge_submissions set stomped_votes=v_stomped,bail_votes=v_bail where id=p_submission_id;
  v_judge:=private.award_judge_participation(v_judge_id,'challenge_judge_vote:'||v_vote_id::text,'challenge_judge_vote');
  if v_bail>=3 then
    update public.challenge_submissions set status='REJECTED',reviewed_at=now() where id=p_submission_id and status='PENDING';
  elsif v_stomped>=10 then
    update public.challenge_submissions set status='APPROVED',reviewed_at=now() where id=p_submission_id and status='PENDING';
    if found then
      insert into public.challenge_completions(user_id,challenge_id,completed,verified,completed_at)
      values(v_submitter_id,v_challenge_id,true,true,now())
      on conflict(user_id,challenge_id) do update set completed=true,verified=true,completed_at=coalesce(public.challenge_completions.completed_at,now());
      update public.challenges set completed_by=v_submitter_id,completed_at=now(),status='completed' where id=v_challenge_id and status='pending';
      v_submitter_xp:=private.award_ledgered_xp(v_submitter_id,'challenge_submission:'||p_submission_id::text,'challenge_completion',v_reward);
      insert into public.activity_feed(user_id,activity_type,title,description,xp_earned,media_id)
      values(v_submitter_id,'challenge_completed','Challenge approved: '||coalesce(v_title,'SkateQuest challenge'),'Community judges approved the video proof.',v_submitter_xp,v_media_id);
    end if;
  end if;
  return jsonb_build_object('success',true,'status',(select status from public.challenge_submissions where id=p_submission_id),'judge_xp',coalesce((v_judge->>'judge_xp')::integer,0),'bonus_xp',coalesce((v_judge->>'bonus_xp')::integer,0),'stomped_votes',v_stomped,'bail_votes',v_bail,'challenge_reward',v_submitter_xp);
end;
$$;
revoke all on function public.judge_challenge_submission(uuid,text) from public,anon;
grant execute on function public.judge_challenge_submission(uuid,text) to authenticated,service_role;

revoke insert,update,delete on public.spot_claim_submissions from anon,authenticated;
grant select on public.spot_claim_submissions to authenticated;
revoke insert,update,delete on public.spot_claim_submission_votes from anon,authenticated;
grant select on public.spot_claim_submission_votes to authenticated;

create or replace function public.judge_spot_claim_submission(p_submission_id uuid,p_vote text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_judge_id uuid:=auth.uid(); v_submitter_id uuid; v_spot_id uuid; v_media_id uuid; v_status text;
  v_vote text:=upper(btrim(coalesce(p_vote,''))); v_stomped integer; v_bail integer; v_current_holder uuid;
  v_reward integer; v_holder_changed boolean:=false; v_result_status text:='PENDING'; v_vote_id uuid; v_judge jsonb; v_submitter_xp integer:=0;
begin
  if v_judge_id is null then raise exception 'authentication required'; end if;
  if v_vote not in ('STOMPED','BAIL') then raise exception 'invalid vote'; end if;
  select user_id,spot_id,media_id,status into v_submitter_id,v_spot_id,v_media_id,v_status
  from public.spot_claim_submissions where id=p_submission_id for update;
  if not found then raise exception 'submission not found'; end if;
  if v_submitter_id=v_judge_id then raise exception 'cannot vote on your own submission'; end if;
  if v_status<>'PENDING' then raise exception 'submission is no longer pending'; end if;
  begin
    insert into public.spot_claim_submission_votes(submission_id,user_id,vote) values(p_submission_id,v_judge_id,v_vote) returning id into v_vote_id;
  exception when unique_violation then raise exception 'already voted'; end;
  select count(*) filter(where vote='STOMPED')::integer,count(*) filter(where vote='BAIL')::integer
  into v_stomped,v_bail from public.spot_claim_submission_votes where submission_id=p_submission_id;
  update public.spot_claim_submissions set stomped_votes=v_stomped,bail_votes=v_bail where id=p_submission_id;
  v_judge:=private.award_judge_participation(v_judge_id,'spot_claim_judge_vote:'||v_vote_id::text,'spot_claim_judge_vote');
  if v_bail>=3 then
    v_result_status:='REJECTED'; update public.spot_claim_submissions set status='REJECTED',reviewed_at=now() where id=p_submission_id and status='PENDING';
  elsif v_stomped>=10 then
    select user_id into v_current_holder from public.spot_claims where spot_id=v_spot_id for update;
    v_reward:=case when v_current_holder is null then 50 when v_current_holder=v_submitter_id then 0 else 100 end;
    if v_current_holder is distinct from v_submitter_id then
      v_holder_changed:=true;
      if v_current_holder is not null then update public.spot_claim_history set lost_at=now() where spot_id=v_spot_id and user_id=v_current_holder and lost_at is null; end if;
      insert into public.spot_claims(spot_id,user_id,claimed_at,updated_at) values(v_spot_id,v_submitter_id,now(),now())
      on conflict(spot_id) do update set user_id=excluded.user_id,claimed_at=excluded.claimed_at,updated_at=now();
      insert into public.spot_claim_history(spot_id,user_id,claimed_at,proof_media_id,submission_id) values(v_spot_id,v_submitter_id,now(),v_media_id,p_submission_id);
    end if;
    update public.spot_claim_submissions set status='APPROVED',reviewed_at=now() where id=p_submission_id and status='PENDING';
    if found then
      v_result_status:='APPROVED';
      if v_reward>0 and v_holder_changed then v_submitter_xp:=private.award_ledgered_xp(v_submitter_id,'spot_claim_submission:'||p_submission_id::text,'spot_claim',v_reward); end if;
      insert into public.activity_feed(user_id,activity_type,title,description,xp_earned,media_id)
      values(v_submitter_id,case when v_current_holder is null then 'spot_claimed' else 'spot_stolen' end,case when v_current_holder is null then 'Claimed a skate spot' else 'Took over a skate spot' end,'Community judges approved the spot claim proof.',v_submitter_xp,v_media_id);
    end if;
  end if;
  return jsonb_build_object('success',true,'status',v_result_status,'judge_xp',coalesce((v_judge->>'judge_xp')::integer,0),'bonus_xp',coalesce((v_judge->>'bonus_xp')::integer,0),'stomped_votes',v_stomped,'bail_votes',v_bail,'claim_reward',v_submitter_xp);
end;
$$;
revoke all on function public.judge_spot_claim_submission(uuid,text) from public,anon;
grant execute on function public.judge_spot_claim_submission(uuid,text) to authenticated,service_role;

revoke insert,update,delete on public.bingo_cell_submissions from anon,authenticated;
grant select on public.bingo_cell_submissions to authenticated;
revoke insert,update,delete on public.bingo_cell_submission_votes from anon,authenticated;
grant select on public.bingo_cell_submission_votes to authenticated;
revoke insert,update,delete on public.bingo_rewards from anon,authenticated;
grant select on public.bingo_rewards to authenticated;

create or replace function public.judge_bingo_cell_submission(p_submission_id uuid,p_vote text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_judge_id uuid:=auth.uid(); v_submitter_id uuid; v_card_id uuid; v_cell_index integer; v_status text;
  v_vote text:=upper(btrim(coalesce(p_vote,''))); v_stomped integer; v_bail integer; v_completed integer[]; v_new_completed integer[];
  v_row integer; v_col integer; v_reward integer:=0; v_result_status text:='PENDING'; v_vote_id uuid; v_judge jsonb;
  v_inserted boolean; v_award integer;
begin
  if v_judge_id is null then raise exception 'authentication required'; end if;
  if v_vote not in ('STOMPED','BAIL') then raise exception 'invalid vote'; end if;
  select user_id,bingo_card_id,cell_index,status into v_submitter_id,v_card_id,v_cell_index,v_status
  from public.bingo_cell_submissions where id=p_submission_id for update;
  if not found then raise exception 'submission not found'; end if;
  if v_submitter_id=v_judge_id then raise exception 'cannot vote on your own submission'; end if;
  if v_status<>'PENDING' then raise exception 'submission is no longer pending'; end if;
  begin
    insert into public.bingo_cell_submission_votes(submission_id,user_id,vote) values(p_submission_id,v_judge_id,v_vote) returning id into v_vote_id;
  exception when unique_violation then raise exception 'already voted'; end;
  select count(*) filter(where vote='STOMPED')::integer,count(*) filter(where vote='BAIL')::integer into v_stomped,v_bail
  from public.bingo_cell_submission_votes where submission_id=p_submission_id;
  update public.bingo_cell_submissions set stomped_votes=v_stomped,bail_votes=v_bail where id=p_submission_id;
  v_judge:=private.award_judge_participation(v_judge_id,'bingo_judge_vote:'||v_vote_id::text,'bingo_judge_vote');
  if v_bail>=3 then
    v_result_status:='REJECTED'; update public.bingo_cell_submissions set status='REJECTED',reviewed_at=now() where id=p_submission_id and status='PENDING';
  elsif v_stomped>=10 then
    select coalesce(completed_cells,'{}'::integer[]) into v_completed from public.bingo_cards where id=v_card_id and user_id=v_submitter_id for update;
    if not found then raise exception 'bingo card not found'; end if;
    if not(v_cell_index=any(v_completed)) then
      v_new_completed:=array_append(v_completed,v_cell_index);
      select array_agg(distinct x order by x) into v_new_completed from unnest(v_new_completed) x;
      update public.bingo_cards set completed_cells=v_new_completed,updated_at=now() where id=v_card_id;
      insert into public.bingo_rewards(user_id,bingo_card_id,reward_key,xp_awarded) values(v_submitter_id,v_card_id,'cell:'||v_cell_index,25)
      on conflict(user_id,bingo_card_id,reward_key) do nothing; get diagnostics v_inserted=row_count;
      if v_inserted then v_award:=private.award_ledgered_xp(v_submitter_id,'bingo:'||v_card_id::text||':cell:'||v_cell_index::text,'bingo_cell',25); v_reward:=v_reward+v_award; end if;
      v_row:=v_cell_index/5;
      if (select count(*) from unnest(v_new_completed) x where x between v_row*5 and v_row*5+4)=5 then
        insert into public.bingo_rewards(user_id,bingo_card_id,reward_key,xp_awarded) values(v_submitter_id,v_card_id,'row:'||v_row,50)
        on conflict(user_id,bingo_card_id,reward_key) do nothing; get diagnostics v_inserted=row_count;
        if v_inserted then v_award:=private.award_ledgered_xp(v_submitter_id,'bingo:'||v_card_id::text||':row:'||v_row::text,'bingo_row',50); v_reward:=v_reward+v_award; end if;
      end if;
      v_col:=v_cell_index%5;
      if (select count(*) from unnest(v_new_completed) x where x%5=v_col)=5 then
        insert into public.bingo_rewards(user_id,bingo_card_id,reward_key,xp_awarded) values(v_submitter_id,v_card_id,'col:'||v_col,50)
        on conflict(user_id,bingo_card_id,reward_key) do nothing; get diagnostics v_inserted=row_count;
        if v_inserted then v_award:=private.award_ledgered_xp(v_submitter_id,'bingo:'||v_card_id::text||':col:'||v_col::text,'bingo_column',50); v_reward:=v_reward+v_award; end if;
      end if;
      if coalesce(array_length(v_new_completed,1),0)=25 then
        insert into public.bingo_rewards(user_id,bingo_card_id,reward_key,xp_awarded) values(v_submitter_id,v_card_id,'blackout',500)
        on conflict(user_id,bingo_card_id,reward_key) do nothing; get diagnostics v_inserted=row_count;
        if v_inserted then v_award:=private.award_ledgered_xp(v_submitter_id,'bingo:'||v_card_id::text||':blackout','bingo_blackout',500); v_reward:=v_reward+v_award; end if;
      end if;
    end if;
    update public.bingo_cell_submissions set status='APPROVED',reviewed_at=now() where id=p_submission_id and status='PENDING';
    if found then v_result_status:='APPROVED'; end if;
  end if;
  return jsonb_build_object('success',true,'status',v_result_status,'judge_xp',coalesce((v_judge->>'judge_xp')::integer,0),'bonus_xp',coalesce((v_judge->>'bonus_xp')::integer,0),'stomped_votes',v_stomped,'bail_votes',v_bail,'submitter_reward',v_reward);
end;
$$;
revoke all on function public.judge_bingo_cell_submission(uuid,text) from public,anon;
grant execute on function public.judge_bingo_cell_submission(uuid,text) to authenticated,service_role;

commit;
