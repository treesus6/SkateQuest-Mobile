-- Preserve legacy skatepark visits while recording modern skate_spots visits correctly.
begin;
alter table public.park_visits add column if not exists spot_id uuid references public.skate_spots(id);
alter table public.park_visits alter column park_id drop not null;
alter table public.park_visits add constraint park_visits_has_location check(park_id is not null or spot_id is not null);
create index if not exists park_visits_spot_idx on public.park_visits(spot_id);
create or replace function public.trg_mission_park_visit()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.user_id is not null and coalesce(new.spot_id,new.park_id) is not null then
   perform private.increment_mission_progress_once(new.user_id,'visit_new_park',case when new.spot_id is not null then 'spot:'||new.spot_id::text else 'park:'||new.park_id::text end,1);
 end if;
 return new;
end; $$;
create or replace function public.award_pioneer_badge()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_badge uuid;v_visited boolean;
begin
 select exists(select 1 from public.park_visits where id<>new.id and
   ((new.spot_id is not null and spot_id=new.spot_id) or (new.park_id is not null and park_id=new.park_id))) into v_visited;
 if not v_visited then
   select id into v_badge from public.badges where name='Pioneer';
   if v_badge is not null then insert into public.user_badges(user_id,badge_id) values(new.user_id,v_badge) on conflict do nothing;end if;
 end if;
 return new;
end; $$;
create or replace function public.verified_web_check_in(p_spot_id uuid,p_latitude double precision,p_longitude double precision)
returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $$
declare
 v_user_id uuid:=auth.uid();v_spot public.skate_spots%rowtype;v_distance double precision;v_checkin_id uuid;v_rewarded boolean:=false;
begin
 if v_user_id is null then raise exception 'authentication required';end if;
 if p_latitude is null or p_longitude is null or not(p_latitude between -90 and 90) or not(p_longitude between -180 and 180) then raise exception 'invalid coordinates';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user_id::text,71));
 select * into v_spot from public.skate_spots where id=p_spot_id;
 if not found then raise exception 'spot not found';end if;
 v_distance:=ST_Distance(ST_MakePoint(p_longitude,p_latitude)::geography,ST_MakePoint(v_spot.longitude,v_spot.latitude)::geography);
 if not(v_distance<=150) then raise exception 'too far from spot: % meters',round(v_distance)::integer;end if;
 if exists(select 1 from public.live_checkins where user_id=v_user_id and park_id=p_spot_id and created_at>=date_trunc('day',now())) then raise exception 'already checked in at this spot today';end if;
 insert into public.live_checkins(user_id,park_id,park_name,latitude,longitude,created_at) values(v_user_id,p_spot_id,v_spot.name,p_latitude,p_longitude,now()) returning id into v_checkin_id;
 insert into public.xp_reward_ledger(user_id,reward_key,source,xp_amount) values(v_user_id,'checkin:'||v_checkin_id::text,'checkin',25) on conflict(user_id,reward_key) do nothing;
 if found then perform public.increment_user_xp(v_user_id,25);v_rewarded:=true;end if;
 insert into public.park_visits(user_id,spot_id,park_id,session_start)
 values(v_user_id,p_spot_id,(select id from public.skateparks where id=p_spot_id),now());
 return jsonb_build_object('checkin_id',v_checkin_id,'distance_meters',round(v_distance)::integer,'xp_awarded',case when v_rewarded then 25 else 0 end,'spot_name',v_spot.name);
end; $$;
revoke all on function public.verified_web_check_in(uuid,double precision,double precision) from public,anon;
grant execute on function public.verified_web_check_in(uuid,double precision,double precision) to authenticated,service_role;
notify pgrst,'reload schema';
commit;
