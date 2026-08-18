begin;

alter table public.callouts add column if not exists message text;
alter table public.callouts add column if not exists completed_at timestamptz;
alter table public.callouts alter column park_id type uuid using nullif(park_id, '')::uuid;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='callouts_park_id_fkey') then
    alter table public.callouts add constraint callouts_park_id_fkey foreign key (park_id) references public.skate_spots(id) on delete set null;
  end if;
end $$;

drop policy if exists "Users can create callouts" on public.callouts;
drop policy if exists "Users can update own callouts" on public.callouts;
revoke insert,update,delete on public.callouts from anon,authenticated;
grant select on public.callouts to authenticated;

create or replace function public.create_callout(p_target_id uuid,p_trick_name text,p_park_id uuid default null,p_message text default null,p_xp_stake integer default 100)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_target_id is null or p_target_id=v_user then raise exception 'Choose another skater'; end if;
  if not exists(select 1 from public.profiles where id=p_target_id) then raise exception 'Skater not found'; end if;
  if coalesce(char_length(trim(p_trick_name)),0) not between 2 and 80 then raise exception 'Enter a valid trick name'; end if;
  if p_xp_stake < 25 or p_xp_stake > 200 or mod(p_xp_stake,25)<>0 then raise exception 'XP reward must be 25 to 200 in 25 XP steps'; end if;
  if p_park_id is not null and not exists(select 1 from public.skate_spots where id=p_park_id) then raise exception 'Spot not found'; end if;
  insert into public.callouts(challenger_id,challenged_id,trick_name,park_id,message,xp_stake)
  values(v_user,p_target_id,trim(p_trick_name),p_park_id,nullif(trim(p_message),''),p_xp_stake) returning id into v_id;
  insert into public.notifications(user_id,type,title,body,data)
  values(p_target_id,'call_out','New Call Out! 🛹','You were called out to land '||trim(p_trick_name)||'!',jsonb_build_object('callOutId',v_id)) on conflict do nothing;
  return v_id;
end;
$$;

create or replace function public.respond_callout(p_callout_id uuid,p_accept boolean)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_call public.callouts%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_call from public.callouts where id=p_callout_id for update;
  if not found then raise exception 'Call out not found'; end if;
  if v_call.challenged_id<>v_user then raise exception 'Only the challenged skater can respond'; end if;
  if v_call.status<>'pending' then raise exception 'This call out has already been answered'; end if;
  if v_call.expires_at<=now() then update public.callouts set status='expired',updated_at=now() where id=p_callout_id; raise exception 'This call out expired'; end if;
  update public.callouts set status=case when p_accept then 'accepted' else 'declined' end,updated_at=now() where id=p_callout_id;
  return case when p_accept then 'accepted' else 'declined' end;
end;
$$;

create or replace function public.submit_callout_proof(p_callout_id uuid,p_video_url text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_call public.callouts%rowtype; v_expected text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_call from public.callouts where id=p_callout_id for update;
  if not found then raise exception 'Call out not found'; end if;
  if v_call.challenged_id<>v_user then raise exception 'Only the challenged skater can submit proof'; end if;
  if v_call.status<>'accepted' then raise exception 'Accept this call out before submitting proof'; end if;
  v_expected := '/storage/v1/object/public/skatetv-clips/callout-'||p_callout_id::text||'/'||v_user::text||'/';
  if p_video_url is null or position(v_expected in p_video_url)=0 then raise exception 'Proof must be a SkateQuest video uploaded for this call out'; end if;
  update public.callouts set challenged_video_url=p_video_url,updated_at=now() where id=p_callout_id;
end;
$$;

create or replace function public.verify_callout(p_callout_id uuid,p_approve boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_call public.callouts%rowtype; v_paid boolean:=false;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_call from public.callouts where id=p_callout_id for update;
  if not found then raise exception 'Call out not found'; end if;
  if v_call.challenger_id<>v_user then raise exception 'Only the challenger can verify the proof'; end if;
  if v_call.status<>'accepted' then raise exception 'This call out is not awaiting proof verification'; end if;
  if nullif(trim(v_call.challenged_video_url),'') is null then raise exception 'No proof video has been submitted'; end if;
  if not p_approve then update public.callouts set challenged_video_url=null,updated_at=now() where id=p_callout_id; return jsonb_build_object('approved',false,'xp_awarded',0); end if;
  insert into public.xp_reward_ledger(user_id,reward_key,source,xp_amount)
  values(v_call.challenged_id,'callout:'||p_callout_id::text,'callout_verified',v_call.xp_stake)
  on conflict(user_id,reward_key) do nothing;
  get diagnostics v_paid=row_count;
  if v_paid then perform public.increment_user_xp(v_call.challenged_id,v_call.xp_stake); end if;
  update public.callouts set status='completed',winner_id=v_call.challenged_id,completed_at=now(),updated_at=now() where id=p_callout_id;
  return jsonb_build_object('approved',true,'xp_awarded',case when v_paid then v_call.xp_stake else 0 end);
end;
$$;

revoke all on function public.create_callout(uuid,text,uuid,text,integer) from public,anon;
grant execute on function public.create_callout(uuid,text,uuid,text,integer) to authenticated;
revoke all on function public.respond_callout(uuid,boolean) from public,anon;
grant execute on function public.respond_callout(uuid,boolean) to authenticated;
revoke all on function public.submit_callout_proof(uuid,text) from public,anon;
grant execute on function public.submit_callout_proof(uuid,text) to authenticated;
revoke all on function public.verify_callout(uuid,boolean) from public,anon;
grant execute on function public.verify_callout(uuid,boolean) to authenticated;

commit;
