begin;

alter table public.callouts
  add column if not exists stake_escrowed boolean not null default false,
  add column if not exists stake_refunded_at timestamptz,
  add column if not exists stake_paid_at timestamptz;
do $$ begin
  alter table public.callouts add constraint callouts_xp_stake_valid
    check (xp_stake between 25 and 200 and mod(xp_stake,25)=0);
exception when duplicate_object then null; end $$;

create or replace function private.refund_callout_stake(p_callout_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_call public.callouts%rowtype;
begin
  select * into v_call from public.callouts where id=p_callout_id for update;
  if not found then return false; end if;
  if not v_call.stake_escrowed or v_call.stake_refunded_at is not null or v_call.stake_paid_at is not null then return false; end if;
  update public.profiles
  set xp=coalesce(xp,0)+v_call.xp_stake,
      level=public.calculate_level(coalesce(xp,0)+v_call.xp_stake),updated_at=now()
  where id=v_call.challenger_id;
  update public.callouts set stake_refunded_at=now(),updated_at=now() where id=p_callout_id;
  return true;
end; $$;
revoke all on function private.refund_callout_stake(uuid) from public,anon,authenticated;
grant execute on function private.refund_callout_stake(uuid) to service_role;

create or replace function public.create_callout(p_target_id uuid,p_trick_name text,p_park_id uuid default null,p_message text default null,p_xp_stake integer default 100)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_id uuid; v_message text:=nullif(btrim(coalesce(p_message,'')),'');
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_target_id is null or p_target_id=v_user then raise exception 'Choose another skater'; end if;
  if not exists(select 1 from public.profiles where id=p_target_id) then raise exception 'Skater not found'; end if;
  if coalesce(char_length(btrim(p_trick_name)),0) not between 2 and 80 then raise exception 'Enter a valid trick name'; end if;
  if v_message is not null and char_length(v_message)>280 then raise exception 'Message is too long'; end if;
  if p_xp_stake<25 or p_xp_stake>200 or mod(p_xp_stake,25)<>0 then raise exception 'XP stake must be 25 to 200 in 25 XP steps'; end if;
  if p_park_id is not null and not exists(select 1 from public.skate_spots where id=p_park_id) then raise exception 'Spot not found'; end if;
  if exists(select 1 from public.callouts where challenger_id=v_user and challenged_id=p_target_id and status in ('pending','accepted') and expires_at>now()) then raise exception 'You already have an open Call Out with this skater'; end if;
  update public.profiles set xp=xp-p_xp_stake,level=public.calculate_level(xp-p_xp_stake),updated_at=now()
  where id=v_user and coalesce(xp,0)>=p_xp_stake;
  if not found then raise exception 'Not enough XP for this stake'; end if;
  insert into public.callouts(challenger_id,challenged_id,trick_name,park_id,message,xp_stake,stake_escrowed)
  values(v_user,p_target_id,btrim(p_trick_name),p_park_id,v_message,p_xp_stake,true) returning id into v_id;
  insert into public.notifications(user_id,type,title,body,data)
  values(p_target_id,'call_out','New Call Out! 🛹','You were called out to land '||btrim(p_trick_name)||' for '||p_xp_stake||' XP!',jsonb_build_object('callOutId',v_id)) on conflict do nothing;
  return v_id;
end; $$;
revoke all on function public.create_callout(uuid,text,uuid,text,integer) from public,anon;
grant execute on function public.create_callout(uuid,text,uuid,text,integer) to authenticated,service_role;

create or replace function public.respond_callout(p_callout_id uuid,p_accept boolean)
returns text language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_call public.callouts%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_call from public.callouts where id=p_callout_id for update;
  if not found then raise exception 'Call out not found'; end if;
  if v_call.challenged_id<>v_user then raise exception 'Only the challenged skater can respond'; end if;
  if v_call.status<>'pending' then raise exception 'This call out has already been answered'; end if;
  if v_call.expires_at<=now() then
    perform private.refund_callout_stake(p_callout_id);
    update public.callouts set status='expired',updated_at=now() where id=p_callout_id;
    return 'expired';
  end if;
  if p_accept then update public.callouts set status='accepted',updated_at=now() where id=p_callout_id; return 'accepted'; end if;
  perform private.refund_callout_stake(p_callout_id);
  update public.callouts set status='declined',updated_at=now() where id=p_callout_id;
  return 'declined';
end; $$;
revoke all on function public.respond_callout(uuid,boolean) from public,anon;
grant execute on function public.respond_callout(uuid,boolean) to authenticated,service_role;

create or replace function public.verify_callout(p_callout_id uuid,p_approve boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_call public.callouts%rowtype; v_paid boolean:=false;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_call from public.callouts where id=p_callout_id for update;
  if not found then raise exception 'Call out not found'; end if;
  if v_call.challenger_id<>v_user then raise exception 'Only the challenger can verify the proof'; end if;
  if v_call.status<>'accepted' then raise exception 'This call out is not awaiting proof verification'; end if;
  if v_call.expires_at<=now() then raise exception 'This Call Out has expired'; end if;
  if nullif(btrim(v_call.challenged_video_url),'') is null then raise exception 'No proof video has been submitted'; end if;
  if not p_approve then update public.callouts set challenged_video_url=null,updated_at=now() where id=p_callout_id; return jsonb_build_object('approved',false,'xp_awarded',0,'stake_held',true); end if;
  if not v_call.stake_escrowed or v_call.stake_refunded_at is not null or v_call.stake_paid_at is not null then raise exception 'Call Out stake is not available'; end if;
  insert into public.xp_reward_ledger(user_id,reward_key,source,xp_amount)
  values(v_call.challenged_id,'callout:'||p_callout_id::text,'callout_escrow_payout',v_call.xp_stake)
  on conflict(user_id,reward_key) do nothing;
  get diagnostics v_paid=row_count;
  if v_paid then perform public.increment_user_xp(v_call.challenged_id,v_call.xp_stake); end if;
  update public.callouts set status='completed',winner_id=v_call.challenged_id,completed_at=now(),stake_paid_at=case when v_paid then now() else stake_paid_at end,updated_at=now() where id=p_callout_id;
  return jsonb_build_object('approved',true,'xp_awarded',case when v_paid then v_call.xp_stake else 0 end,'stake_transferred',v_paid);
end; $$;
revoke all on function public.verify_callout(uuid,boolean) from public,anon;
grant execute on function public.verify_callout(uuid,boolean) to authenticated,service_role;

create or replace function private.finalize_expired_callouts()
returns integer language plpgsql security definer set search_path='' as $$
declare r record; v_count integer:=0;
begin
  for r in select id from public.callouts where status in ('pending','accepted') and expires_at<=now() order by expires_at for update skip locked loop
    perform private.refund_callout_stake(r.id);
    update public.callouts set status='expired',updated_at=now() where id=r.id;
    v_count:=v_count+1;
  end loop;
  return v_count;
end; $$;
revoke all on function private.finalize_expired_callouts() from public,anon,authenticated;
grant execute on function private.finalize_expired_callouts() to service_role;

do $$ declare r record; begin
  for r in select jobid from cron.job where jobname='skatequest-finalize-expired-callouts' loop perform cron.unschedule(r.jobid); end loop;
end $$;
select cron.schedule('skatequest-finalize-expired-callouts','*/5 * * * *','select private.finalize_expired_callouts();');

commit;
