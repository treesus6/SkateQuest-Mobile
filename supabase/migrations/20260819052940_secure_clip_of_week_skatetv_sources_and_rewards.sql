begin;

alter table public.clip_of_week_nominations
  alter column media_id drop not null,
  add column if not exists skatetv_clip_id uuid references public.skatetv_clips(id) on delete cascade;

do $$ begin
  alter table public.clip_of_week_nominations add constraint clip_of_week_exactly_one_source
    check (num_nonnulls(media_id,skatetv_clip_id)=1);
exception when duplicate_object then null; end $$;

create unique index if not exists clip_of_week_unique_legacy_media_week
  on public.clip_of_week_nominations(media_id,week_start)
  where media_id is not null;
create unique index if not exists clip_of_week_unique_skatetv_week
  on public.clip_of_week_nominations(skatetv_clip_id,week_start)
  where skatetv_clip_id is not null;

revoke insert,update,delete on public.clip_of_week_nominations from anon,authenticated;
revoke insert,update,delete on public.clip_of_week_votes from anon,authenticated;
revoke insert,update,delete on public.clip_of_week_vote_rewards from anon,authenticated;
revoke insert,update,delete on public.clip_of_week_wins from anon,authenticated;
grant select on public.clip_of_week_nominations,public.clip_of_week_votes,public.clip_of_week_vote_rewards,public.clip_of_week_wins to authenticated;

drop function if exists public.submit_clip_of_week_nomination(uuid,uuid,date,integer);

create or replace function public.submit_clip_of_week_nomination(
  p_user_id uuid,
  p_clip_id uuid,
  p_week_start date
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_id uuid;
  v_media_owned boolean:=false;
  v_skatetv_owned boolean:=false;
  v_week date:=p_week_start;
begin
  if v_user is null or v_user is distinct from p_user_id then raise exception 'Not authorized'; end if;
  if v_week is null then raise exception 'Week is required'; end if;
  if v_week <> (date_trunc('week',current_date)::date) then raise exception 'Nominations are only accepted for the current week'; end if;
  select exists(select 1 from public.media m where m.id=p_clip_id and m.user_id=v_user and m.media_type='video') into v_media_owned;
  select exists(select 1 from public.skatetv_clips c where c.id=p_clip_id and c.user_id=v_user) into v_skatetv_owned;
  if not v_media_owned and not v_skatetv_owned then raise exception 'Clip not found or not owned by you'; end if;
  if v_skatetv_owned then
    insert into public.clip_of_week_nominations(user_id,skatetv_clip_id,week_start,xp_reward,status)
    values(v_user,p_clip_id,v_week,500,'active') returning id into v_id;
  else
    insert into public.clip_of_week_nominations(user_id,media_id,week_start,xp_reward,status)
    values(v_user,p_clip_id,v_week,500,'active') returning id into v_id;
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'That clip is already nominated this week';
end;
$$;
revoke all on function public.submit_clip_of_week_nomination(uuid,uuid,date) from public,anon;
grant execute on function public.submit_clip_of_week_nomination(uuid,uuid,date) to authenticated,service_role;

create or replace function public.set_clip_of_week_vote(
  p_user_id uuid,
  p_nomination_id uuid,
  p_vote integer,
  p_week_start date
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_owner uuid;
  v_vote_id uuid;
  v_today date:=current_date;
  v_day_reward integer:=0;
  v_total integer:=0;
  v_awarded integer:=0;
begin
  if v_user is null or v_user is distinct from p_user_id then raise exception 'Not authorized'; end if;
  if p_vote<>1 then raise exception 'Vote must be 1'; end if;
  if p_week_start <> date_trunc('week',current_date)::date then raise exception 'Voting is only open for the current week'; end if;
  select user_id into v_owner from public.clip_of_week_nominations
  where id=p_nomination_id and week_start=p_week_start and status='active';
  if not found then raise exception 'Nomination not found'; end if;
  if v_owner=v_user then raise exception 'You cannot vote for your own clip'; end if;
  insert into public.clip_of_week_votes(user_id,nomination_id,week_start,vote)
  values(v_user,p_nomination_id,p_week_start,1)
  on conflict(user_id,nomination_id,week_start) do nothing
  returning id into v_vote_id;
  if v_vote_id is null then return jsonb_build_object('success',true,'already_voted',true,'xp_awarded',0); end if;
  select coalesce(sum(xp_awarded),0)::integer into v_day_reward
  from public.clip_of_week_vote_rewards where user_id=v_user and rewarded_on=v_today;
  if v_day_reward<50 then
    v_awarded:=least(5,50-v_day_reward);
    if v_awarded>0 then
      v_awarded:=private.award_ledgered_xp(v_user,'clip_week_vote:'||v_vote_id::text,'clip_of_week_vote',v_awarded);
      if v_awarded>0 then
        insert into public.clip_of_week_vote_rewards(user_id,rewarded_on,xp_awarded,vote_id)
        values(v_user,v_today,v_awarded,v_vote_id) on conflict(vote_id) do nothing;
      end if;
    end if;
  end if;
  select count(*)::integer into v_total from public.clip_of_week_votes where nomination_id=p_nomination_id and week_start=p_week_start;
  return jsonb_build_object('success',true,'already_voted',false,'xp_awarded',v_awarded,'vote_count',v_total);
end;
$$;
revoke all on function public.set_clip_of_week_vote(uuid,uuid,integer,date) from public,anon;
grant execute on function public.set_clip_of_week_vote(uuid,uuid,integer,date) to authenticated,service_role;

create or replace function public.finalize_clip_of_week(p_week_start date)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_nomination public.clip_of_week_nominations%rowtype;
  v_rank integer:=0;
  v_awarded integer:=0;
  v_winners jsonb:='[]'::jsonb;
begin
  if auth.role()<>'service_role' and current_user not in ('postgres','supabase_admin') then raise exception 'Service role required'; end if;
  for v_nomination in
    select n.* from public.clip_of_week_nominations n
    where n.week_start=p_week_start and n.status='active'
    order by (select count(*) from public.clip_of_week_votes v where v.nomination_id=n.id and v.week_start=p_week_start) desc,n.created_at asc
    limit 3
  loop
    v_rank:=v_rank+1;
    v_awarded:=case v_rank when 1 then 500 when 2 then 250 else 100 end;
    insert into public.clip_of_week_wins(user_id,nomination_id,week_start,rank,xp_awarded)
    values(v_nomination.user_id,v_nomination.id,p_week_start,v_rank,v_awarded)
    on conflict(user_id,week_start) do nothing;
    if found then
      v_awarded:=private.award_ledgered_xp(v_nomination.user_id,'clip_week_win:'||p_week_start::text||':'||v_rank::text,'clip_of_week_win',v_awarded);
      v_winners:=v_winners||jsonb_build_array(jsonb_build_object('user_id',v_nomination.user_id,'rank',v_rank,'xp_awarded',v_awarded));
    end if;
  end loop;
  update public.clip_of_week_nominations set status='closed' where week_start=p_week_start and status='active';
  return jsonb_build_object('success',true,'week_start',p_week_start,'winners',v_winners);
end;
$$;
revoke all on function public.finalize_clip_of_week(date) from public,anon,authenticated;
grant execute on function public.finalize_clip_of_week(date) to service_role;

commit;
