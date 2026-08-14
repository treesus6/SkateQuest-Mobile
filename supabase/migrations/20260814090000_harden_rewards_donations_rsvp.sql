-- Durable, atomic reward, donation, and queued-RSVP support.
create table if not exists public.xp_donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  xp_amount integer not null check (xp_amount > 0),
  usd_value numeric(12,2) not null check (usd_value >= 0),
  created_at timestamptz not null default now()
);
alter table public.xp_donations enable row level security;
create policy "Authenticated users view donations" on public.xp_donations
for select to authenticated using (true);
grant select on public.xp_donations to authenticated;
create index xp_donations_created_at_idx on public.xp_donations(created_at desc);
create index xp_donations_user_id_idx on public.xp_donations(user_id);

create table if not exists public.seasonal_reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.seasonal_events(id) on delete cascade,
  claim_date date not null default current_date,
  day_number integer not null check (day_number between 1 and 366),
  xp_awarded integer not null check (xp_awarded >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, event_id, claim_date)
);
alter table public.seasonal_reward_claims enable row level security;
create policy "Users view own seasonal claims" on public.seasonal_reward_claims
for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.seasonal_reward_claims to authenticated;

create or replace function public.donate_xp(p_xp_amount integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid := auth.uid(); v_xp integer; v_charity integer; v_row public.xp_donations;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_xp_amount is null or p_xp_amount <= 0 then raise exception 'Donation must be positive'; end if;
  update public.profiles
  set xp=xp-p_xp_amount, charity_points=coalesce(charity_points,0)+p_xp_amount, updated_at=now()
  where id=v_user and coalesce(xp,0)>=p_xp_amount
  returning xp,charity_points into v_xp,v_charity;
  if not found then raise exception 'Insufficient XP'; end if;
  insert into public.xp_donations(user_id,xp_amount,usd_value)
  values(v_user,p_xp_amount,p_xp_amount::numeric/1000) returning * into v_row;
  return jsonb_build_object('donation_id',v_row.id,'xp',v_xp,'charity_points',v_charity);
end $$;
revoke execute on function public.donate_xp(integer) from public,anon;
grant execute on function public.donate_xp(integer) to authenticated,service_role;

create or replace function public.claim_seasonal_reward(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_event public.seasonal_events; v_day integer; v_xp integer; v_claim uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_event from public.seasonal_events
  where id=p_event_id and now() between start_date and end_date;
  if not found then return jsonb_build_object('error','inactive event'); end if;
  v_day:=greatest(1,floor(extract(epoch from (now()-v_event.start_date))/86400)::integer+1);
  v_xp:=greatest(0,round(v_day*25*coalesce((v_event.rewards->>'xp_multiplier')::numeric,1))::integer);
  insert into public.seasonal_reward_claims(user_id,event_id,claim_date,day_number,xp_awarded)
  values(v_user,p_event_id,current_date,v_day,v_xp)
  on conflict(user_id,event_id,claim_date) do nothing returning id into v_claim;
  if v_claim is null then return jsonb_build_object('claimed',false,'day_number',v_day); end if;
  update public.profiles set xp=coalesce(xp,0)+v_xp,updated_at=now() where id=v_user;
  return jsonb_build_object('claimed',true,'day_number',v_day,'xp_awarded',v_xp);
end $$;
revoke execute on function public.claim_seasonal_reward(uuid) from public,anon;
grant execute on function public.claim_seasonal_reward(uuid) to authenticated,service_role;

create or replace function public.set_session_rsvp(p_session_id uuid,p_attending boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user text:=auth.uid()::text; v_participants text[]; v_max integer; v_new text[];
begin
  if auth.uid() is null then return jsonb_build_object('error','unauthorized'); end if;
  select coalesce(participants,'{}'),max_participants into v_participants,v_max
  from public.skate_sessions where id=p_session_id for update;
  if not found then return jsonb_build_object('error','session not found'); end if;
  if p_attending then
    if v_user=any(v_participants) then v_new:=v_participants;
    elsif v_max is not null and coalesce(array_length(v_participants,1),0)>=v_max
      then return jsonb_build_object('error','full');
    else v_new:=v_participants||v_user; end if;
  else v_new:=array_remove(v_participants,v_user); end if;
  update public.skate_sessions set participants=v_new where id=p_session_id;
  return jsonb_build_object('is_attending',p_attending,'attendee_count',coalesce(array_length(v_new,1),0));
end $$;
revoke execute on function public.set_session_rsvp(uuid,boolean) from public,anon;
grant execute on function public.set_session_rsvp(uuid,boolean) to authenticated,service_role;
