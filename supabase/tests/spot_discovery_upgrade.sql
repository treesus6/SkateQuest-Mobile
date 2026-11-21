-- Run against the connected project. All test writes, rewards and fixtures ROLLBACK.
begin;
do $$
declare
 u1 uuid;u2 uuid;s public.skate_spots%rowtype;partner uuid;visit jsonb;again jsonb;ref1 jsonb;ref2 jsonb;
 challenge uuid;clip uuid;visible integer;before_xp integer;after_xp integer;
begin
 select id into u1 from public.profiles order by created_at limit 1;
 select id into u2 from public.profiles where id<>u1 order by created_at limit 1;
 if u1 is null or u2 is null then raise exception 'Need two existing profiles for ownership tests';end if;
 select * into s from public.skate_spots where latitude between -89 and 89 and longitude between -179 and 179 limit 1;
 select id into partner from public.map_sponsors where active and website_url like 'https://%' limit 1;
 if s.id is null or partner is null then raise exception 'Need an existing real spot and partner';end if;
 insert into public.spotlight_challenges(title,spot_id,starts_at,ends_at) values('QA rollback only',s.id,now()-interval '1 hour',now()+interval '1 hour') returning id into challenge;
 perform set_config('request.jwt.claim.sub',u1::text,true);
 execute 'set local role authenticated';
 begin
   perform public.start_live_spot_session(s.id,0,0,60,'regular',null);
   raise exception 'Distance check was bypassed';
 exception when raise_exception then
   if sqlerrm not like '%150m%' then raise;end if;
 end;
 visit:=public.start_live_spot_session(s.id,s.latitude,s.longitude,30,'goofy','QA rollback only');
 if not exists(select 1 from public.live_checkins where id=(visit->>'checkin_id')::uuid and user_id=u1 and park_id=s.id and stance='goofy' and expires_at>now()+interval '29 minutes' and expires_at<=now()+interval '31 minutes') then raise exception 'Check-in read-back failed';end if;
 select xp into before_xp from public.profiles where id=u1;
 again:=public.start_live_spot_session(s.id,s.latitude,s.longitude,120,'switch',null);
 select xp into after_xp from public.profiles where id=u1;
 if again->>'checkin_id'<>visit->>'checkin_id' or (again->>'xp_awarded')::integer<>0 or after_xp<>before_xp then raise exception 'Rejoin duplicated visit or XP';end if;
 if not exists(select 1 from public.get_spot_discovery(array[s.id]) where spot_id=s.id and active_skaters>=1) then raise exception 'Radar failed to count persisted check-in';end if;
 ref1:=public.record_partner_referral(partner,'home');
 ref2:=public.record_partner_referral(partner,'map');
 if ref1->>'referral_id'<>ref2->>'referral_id' or (ref2->>'xp_awarded')::integer<>0 then raise exception 'Referral cooldown failed';end if;
 if not exists(select 1 from public.partner_referrals where id=(ref1->>'referral_id')::uuid and user_id=u1) then raise exception 'Referral read-back failed';end if;
 begin
   insert into public.partner_referrals(sponsor_id,user_id,source_surface) values(partner,u1,'map');
   raise exception 'Direct referral insert allowed';
 exception when insufficient_privilege then null;
 end;
 insert into public.skatetv_clips(user_id,video_url,title,spot_id,spotlight_id,likes,views,featured) values(u1,'https://example.invalid/rollback-only.mp4','QA rollback only',s.id,challenge,0,0,false) returning id into clip;
 if not exists(select 1 from public.skatetv_clips where id=clip and spot_id=s.id and spotlight_id=challenge and park_name=s.name) then raise exception 'Spotlight clip read-back failed';end if;
 perform set_config('request.jwt.claim.sub',u2::text,true);
 select count(*) into visible from public.partner_referrals where id=(ref1->>'referral_id')::uuid;
 if visible<>0 then raise exception 'Another account can read private referral history';end if;
 begin
   perform public.end_live_spot_session((visit->>'checkin_id')::uuid);
   raise exception 'Another account checked out the skater';
 exception when raise_exception then
   if sqlerrm<>'check-in not found or not yours' then raise;end if;
 end;
 perform set_config('request.jwt.claim.sub',u1::text,true);
 perform public.end_live_spot_session((visit->>'checkin_id')::uuid);
 if exists(select 1 from public.live_checkins where id=(visit->>'checkin_id')::uuid and expires_at>now()) then raise exception 'Checkout did not persist';end if;
 execute 'set local role anon';
 begin
   perform public.record_partner_referral(partner,'home');
   raise exception 'Anonymous referral write allowed';
 exception when insufficient_privilege then null;
 end;
 execute 'reset role';
end $$;
do $$
declare ids uuid[];clip uuid;result jsonb;
begin
 select array_agg(id) into ids from (select id from public.profiles order by created_at limit 4) profiles;
 if cardinality(ids)<4 then raise exception 'Need four existing profiles for review tests';end if;
 perform set_config('request.jwt.claim.sub',ids[1]::text,true);execute 'set local role authenticated';
 insert into public.skatetv_clips(user_id,video_url,title,milestone,review_status,stomped_votes,likes,views,featured)
 values(ids[1],'https://example.invalid/rollback-review.mp4','QA rollback review','first_land_friday','approved',99,0,0,false) returning id into clip;
 if not exists(select 1 from public.skatetv_clips where id=clip and review_status='pending' and stomped_votes=0) then raise exception 'Client forged review status';end if;
 begin perform public.judge_spotlight_clip(clip,'stomped');raise exception 'Self vote accepted';exception when raise_exception then if sqlerrm<>'cannot judge own submission' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',ids[2]::text,true);
 result:=public.judge_spotlight_clip(clip,'stomped');
 if result->>'status'<>'PENDING' or (result->>'judge_xp')::integer<>0 then raise exception 'Single vote finalized clip or invented XP';end if;
 begin perform public.judge_spotlight_clip(clip,'stomped');raise exception 'Duplicate vote accepted';exception when raise_exception then if sqlerrm<>'already voted' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',ids[3]::text,true);perform public.judge_spotlight_clip(clip,'bail');
 perform set_config('request.jwt.claim.sub',ids[4]::text,true);result:=public.judge_spotlight_clip(clip,'stomped');
 if result->>'status'<>'APPROVED' then raise exception 'Three-voter majority failed';end if;
 if not exists(select 1 from public.skatetv_clips where id=clip and review_status='approved' and stomped_votes=2 and bail_votes=1) then raise exception 'Review read-back failed';end if;
 execute 'reset role';
end $$;
rollback;
select 'PASS: GPS distance gate, check-in read-back, rejoin/XP dedupe, radar count, referral read-back/cooldown, direct-write denial, spotlight/spot read-back, cross-account privacy/checkout denial, checkout persistence, anonymous write denial, forged-review reset, self-vote and duplicate rejection, three-review majority and counter read-back; all writes rolled back' as verification;
