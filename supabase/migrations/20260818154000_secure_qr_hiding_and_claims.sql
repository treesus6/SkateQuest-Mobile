begin;

drop policy if exists qr_codes_auth_insert on public.qr_codes;
drop policy if exists qr_codes_auth_update on public.qr_codes;
revoke insert,update,delete on public.qr_codes from anon,authenticated;
revoke insert,update,delete on public.qr_scans from anon,authenticated;

create or replace function public.create_hidden_qr(
  p_latitude double precision,
  p_longitude double precision,
  p_location_description text default null,
  p_trick_challenge text default null,
  p_challenge_message text default null,
  p_proof_required boolean default false
)
returns public.qr_codes
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_profile record; v_code text; v_row public.qr_codes%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'Invalid coordinates'; end if;
  select username,display_name into v_profile from public.profiles where id=v_user;
  loop
    v_code:='SKQ-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    exit when not exists(select 1 from public.qr_codes where code=v_code);
  end loop;
  insert into public.qr_codes(code,purchased_by,purchaser_name,purchase_price,status,hidden_at,hidden_location_lat,hidden_location_lng,hidden_location_description,xp_reward,trick_challenge,challenge_message,proof_required)
  values(v_code,v_user,coalesce(v_profile.display_name,v_profile.username,'Skater'),0,'hidden',now(),p_latitude,p_longitude,nullif(trim(p_location_description),''),50,nullif(trim(p_trick_challenge),''),nullif(trim(p_challenge_message),''),coalesce(p_proof_required,false))
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.claim_hidden_qr(p_code text,p_latitude double precision,p_longitude double precision,p_spot_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_user uuid:=auth.uid(); v_qr public.qr_codes%rowtype; v_profile record; v_spot public.skate_spots%rowtype;
  v_distance double precision; v_spot_distance double precision; v_qr_spot_distance double precision;
  v_reward integer:=50; v_paid boolean:=false; v_ghost public.ghost_clips%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'Invalid coordinates'; end if;
  select * into v_qr from public.qr_codes where upper(code)=upper(trim(p_code)) for update;
  if not found then raise exception 'QR code not recognized'; end if;
  if v_qr.status='found' then raise exception 'This QR has already been found'; end if;
  if v_qr.status<>'hidden' then raise exception 'This QR is not currently hidden'; end if;
  if v_qr.expires_at<=now() then update public.qr_codes set status='expired' where id=v_qr.id; raise exception 'This QR has expired'; end if;
  if v_qr.purchased_by=v_user then raise exception 'You cannot claim your own hidden QR'; end if;
  if v_qr.hidden_location_lat is null or v_qr.hidden_location_lng is null then raise exception 'This QR has no verified hiding location'; end if;
  if coalesce(v_qr.proof_required,false) then return jsonb_build_object('claimed',false,'requires_proof',true,'qr_id',v_qr.id,'trick_challenge',v_qr.trick_challenge,'challenge_message',v_qr.challenge_message); end if;
  v_distance:=6371000*2*asin(sqrt(power(sin(radians(p_latitude-v_qr.hidden_location_lat)/2),2)+cos(radians(v_qr.hidden_location_lat))*cos(radians(p_latitude))*power(sin(radians(p_longitude-v_qr.hidden_location_lng)/2),2)));
  if v_distance>25 then raise exception 'Move within 25 meters of the hidden QR location (currently % meters away)',round(v_distance); end if;
  if p_spot_id is not null then
    select * into v_spot from public.skate_spots where id=p_spot_id;
    if not found then raise exception 'Spot not found'; end if;
    v_spot_distance:=6371000*2*asin(sqrt(power(sin(radians(p_latitude-v_spot.latitude)/2),2)+cos(radians(v_spot.latitude))*cos(radians(p_latitude))*power(sin(radians(p_longitude-v_spot.longitude)/2),2)));
    v_qr_spot_distance:=6371000*2*asin(sqrt(power(sin(radians(v_qr.hidden_location_lat-v_spot.latitude)/2),2)+cos(radians(v_spot.latitude))*cos(radians(v_qr.hidden_location_lat))*power(sin(radians(v_qr.hidden_location_lng-v_spot.longitude)/2),2)));
    if v_spot_distance>150 or v_qr_spot_distance>150 then raise exception 'This QR is not verified for this skate spot'; end if;
  end if;
  insert into public.qr_scans(spot_id,user_id,latitude,longitude,distance_from_spot,success) values(p_spot_id,v_user,p_latitude,p_longitude,round(v_distance)::integer,true);
  select username,display_name into v_profile from public.profiles where id=v_user;
  update public.qr_codes set status='found',found_by=v_user,found_by_name=coalesce(v_profile.display_name,v_profile.username,'Skater'),found_at=now() where id=v_qr.id;
  insert into public.xp_reward_ledger(user_id,reward_key,source,xp_amount) values(v_user,'qr:'||v_qr.id::text,'qr_found',v_reward) on conflict(user_id,reward_key) do nothing;
  get diagnostics v_paid=row_count;
  if v_paid then perform public.increment_user_xp(v_user,v_reward); end if;
  if p_spot_id is not null then
    select * into v_ghost from public.ghost_clips where spot_id=p_spot_id and coalesce(requires_qr_scan,true)=true order by created_at desc limit 1;
    if found then insert into public.user_unlocks(user_id,ghost_clip_id) select v_user,v_ghost.id where not exists(select 1 from public.user_unlocks where user_id=v_user and ghost_clip_id=v_ghost.id); end if;
  end if;
  return jsonb_build_object('claimed',true,'requires_proof',false,'qr_id',v_qr.id,'xp_awarded',case when v_paid then v_reward else 0 end,'distance_meters',round(v_distance),'ghost_clip_url',case when v_ghost.id is not null then v_ghost.video_url else null end,'bonus_reward',v_qr.bonus_reward);
end;
$$;

revoke all on function public.create_hidden_qr(double precision,double precision,text,text,text,boolean) from public,anon;
grant execute on function public.create_hidden_qr(double precision,double precision,text,text,text,boolean) to authenticated;
revoke all on function public.claim_hidden_qr(text,double precision,double precision,uuid) from public,anon;
grant execute on function public.claim_hidden_qr(text,double precision,double precision,uuid) to authenticated;

commit;
