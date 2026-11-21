-- Additive contracts for Expo/React Native discovery. No fabricated activity or partners.
begin;
alter table public.live_checkins add column if not exists stance text;
create index if not exists live_checkins_spot_expiration_idx on public.live_checkins(park_id, expires_at);
create index if not exists spot_conditions_spot_created_idx on public.spot_conditions(spot_id, created_at desc);

create or replace function public.get_spot_discovery(p_spot_ids uuid[])
returns table(spot_id uuid, active_skaters bigint, condition text, reported_at timestamptz)
language sql stable security invoker set search_path = '' as $$
 select s.id,
   (select count(distinct c.user_id) from public.live_checkins c where c.park_id=s.id and c.expires_at>now()),
   latest.condition, latest.created_at
 from public.skate_spots s
 left join lateral (
   select c.condition,c.created_at from public.spot_conditions c
   where c.spot_id=s.id and c.created_at>now()-interval '4 hours'
     and (c.expires_at is null or c.expires_at>now())
   order by c.created_at desc limit 1
 ) latest on true
 where s.id=any(p_spot_ids[1:200]);
$$;
grant execute on function public.get_spot_discovery(uuid[]) to anon, authenticated;

create or replace function public.start_live_spot_session(
 p_spot_id uuid,p_latitude double precision,p_longitude double precision,
 p_duration_minutes integer default 60,p_stance text default 'regular',p_message text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 v_user uuid:=auth.uid(); v_id uuid; v_spot public.skate_spots%rowtype; v_distance double precision; v_result jsonb;
begin
 if v_user is null then raise exception 'authentication required'; end if;
 if p_duration_minutes is null or p_duration_minutes not in (30,60,120,240) then raise exception 'invalid session duration'; end if;
 if p_stance is null or p_stance not in ('regular','goofy','switch') then raise exception 'invalid stance'; end if;
 if char_length(coalesce(p_message,''))>280 then raise exception 'message too long'; end if;
 if p_latitude is null or p_longitude is null or not (p_latitude between -90 and 90) or not (p_longitude between -180 and 180) then raise exception 'invalid coordinates'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,71));
 select * into v_spot from public.skate_spots where id=p_spot_id;
 if not found then raise exception 'spot not found'; end if;
 v_distance:=public.st_distance(public.st_makepoint(p_longitude,p_latitude)::public.geography,public.st_makepoint(v_spot.longitude,v_spot.latitude)::public.geography);
 if not (v_distance<=150) then raise exception 'Check in within 150m of this spot'; end if;
 -- Rejoin an existing visit without farming another daily check-in XP reward.
 select id into v_id from public.live_checkins where user_id=v_user and park_id=p_spot_id and created_at>=date_trunc('day',now()) order by created_at desc limit 1;
 if v_id is null then
   v_result:=public.verified_live_check_in(p_spot_id,p_latitude,p_longitude,p_message);
   v_id:=(v_result->>'checkin_id')::uuid;
 else
   v_result:=jsonb_build_object('checkin_id',v_id,'spot_name',v_spot.name,'xp_awarded',0);
 end if;
 -- One live spot per skater. Historical visits remain intact.
 update public.live_checkins set expires_at=now() where user_id=v_user and id<>v_id and expires_at>now();
 update public.live_checkins set expires_at=now()+make_interval(mins=>p_duration_minutes),stance=p_stance,message=nullif(btrim(p_message),'') where id=v_id and user_id=v_user;
 return v_result;
end; $$;
revoke all on function public.start_live_spot_session(uuid,double precision,double precision,integer,text,text) from public,anon;
grant execute on function public.start_live_spot_session(uuid,double precision,double precision,integer,text,text) to authenticated;

create or replace function public.end_live_spot_session(p_checkin_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 update public.live_checkins set expires_at=least(expires_at,now()) where id=p_checkin_id and user_id=auth.uid() returning id into v_id;
 if v_id is null then raise exception 'check-in not found or not yours'; end if;
 return v_id;
end; $$;
revoke all on function public.end_live_spot_session(uuid) from public,anon;
grant execute on function public.end_live_spot_session(uuid) to authenticated;

create table public.partner_referrals (
 id uuid primary key default gen_random_uuid(),
 sponsor_id uuid not null references public.map_sponsors(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 spot_id uuid references public.skate_spots(id) on delete set null,
 source_surface text not null check(source_surface in ('home','map','spot','profile')),
 clicked_at timestamptz not null default now()
);
create index partner_referrals_sponsor_time_idx on public.partner_referrals(sponsor_id,clicked_at desc);
create index partner_referrals_user_time_idx on public.partner_referrals(user_id,clicked_at desc);
alter table public.partner_referrals enable row level security;
create policy partner_referrals_read_own on public.partner_referrals for select to authenticated using(user_id=(select auth.uid()));
grant select on public.partner_referrals to authenticated;
revoke insert,update,delete on public.partner_referrals from anon,authenticated;

create or replace function public.record_partner_referral(p_sponsor_id uuid,p_source_surface text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid(); v_partner public.map_sponsors%rowtype; v_id uuid; v_xp integer:=0;
begin
 if v_user is null then raise exception 'Sign in to record partner referrals'; end if;
 if p_source_surface is null or p_source_surface not in ('home','map','spot','profile') then raise exception 'invalid referral source'; end if;
 select * into v_partner from public.map_sponsors where id=p_sponsor_id and active=true;
 if not found or v_partner.website_url is null or v_partner.website_url !~ '^https://' then raise exception 'Partner website unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text||p_sponsor_id::text,72));
 select id into v_id from public.partner_referrals where user_id=v_user and sponsor_id=p_sponsor_id and clicked_at>now()-interval '60 seconds' order by clicked_at desc limit 1;
 if v_id is null then
   insert into public.partner_referrals(sponsor_id,user_id,spot_id,source_surface) values(p_sponsor_id,v_user,v_partner.spot_id,p_source_surface) returning id into v_id;
   insert into public.xp_reward_ledger(user_id,reward_key,source,xp_amount)
   values(v_user,'partner:'||p_sponsor_id::text||':'||(now() at time zone 'UTC')::date::text,'partner_referral',10) on conflict(user_id,reward_key) do nothing;
   if found then perform public.increment_user_xp(v_user,10); v_xp:=10; end if;
 end if;
 return jsonb_build_object('referral_id',v_id,'xp_awarded',v_xp);
end; $$;
revoke all on function public.record_partner_referral(uuid,text) from public,anon;
grant execute on function public.record_partner_referral(uuid,text) to authenticated;

create or replace function public.get_partner_referral_stats(p_sponsor_id uuid)
returns table(total_clicks bigint, clicks_today bigint)
language sql stable security definer set search_path = '' as $$
 select count(*),count(*) filter(where r.clicked_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')
 from public.partner_referrals r join public.map_sponsors s on s.id=r.sponsor_id and s.active where r.sponsor_id=p_sponsor_id;
$$;
revoke all on function public.get_partner_referral_stats(uuid) from public;
grant execute on function public.get_partner_referral_stats(uuid) to anon,authenticated;

create table public.spotlight_challenges (
 id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 1 and 120),
 description text, spot_id uuid not null references public.skate_spots(id),
 starts_at timestamptz not null, ends_at timestamptz not null, active boolean not null default true,
 check(ends_at>starts_at)
);
alter table public.spotlight_challenges enable row level security;
create policy spotlight_challenges_read on public.spotlight_challenges for select to anon,authenticated using(true);
grant select on public.spotlight_challenges to anon,authenticated;
revoke insert,update,delete on public.spotlight_challenges from anon,authenticated;
create index spotlight_challenges_spot_idx on public.spotlight_challenges(spot_id);
create index partner_referrals_spot_idx on public.partner_referrals(spot_id);
create index spotlight_challenges_window_idx on public.spotlight_challenges(ends_at) where active;
alter table public.skatetv_clips add column if not exists spot_id uuid references public.skate_spots(id);
alter table public.skatetv_clips add column if not exists spotlight_id uuid references public.spotlight_challenges(id);
create index skatetv_clips_spot_idx on public.skatetv_clips(spot_id);
create index skatetv_clips_spotlight_idx on public.skatetv_clips(spotlight_id);
create or replace function public.validate_spotlight_clip()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_challenge public.spotlight_challenges%rowtype;
begin
 if new.spotlight_id is not null then
   select * into v_challenge from public.spotlight_challenges where id=new.spotlight_id and active and now()>=starts_at and now()<ends_at;
   if not found or new.spot_id is distinct from v_challenge.spot_id then raise exception 'Spotlight is closed or clip belongs to another spot'; end if;
 end if;
 if new.spot_id is not null then
   select s.name into new.park_name from public.skate_spots s where s.id=new.spot_id;
 end if;
 return new;
end; $$;
create trigger validate_spotlight_clip before insert or update of spot_id,spotlight_id on public.skatetv_clips for each row execute function public.validate_spotlight_clip();
-- Realtime is an accelerator; polling also handles expiry and deployments without publication.
do $$ declare v_table text; begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
   foreach v_table in array array['live_checkins','spot_conditions','map_sponsors','partner_referrals','spotlight_challenges'] loop
     if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=v_table) then
       execute format('alter publication supabase_realtime add table public.%I',v_table);
     end if;
   end loop;
 end if;
end $$;
notify pgrst,'reload schema';
commit;
