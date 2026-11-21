-- Real community review for spotlight/first-land clips; no synthetic submissions or votes.
begin;
alter table public.skatetv_clips add column milestone text check(milestone is null or milestone='first_land_friday');
alter table public.skatetv_clips add column review_status text not null default 'unreviewed' check(review_status in ('unreviewed','pending','approved','rejected'));
alter table public.skatetv_clips add column stomped_votes integer not null default 0 check(stomped_votes>=0);
alter table public.skatetv_clips add column bail_votes integer not null default 0 check(bail_votes>=0);
create index skatetv_clips_review_queue_idx on public.skatetv_clips(created_at) where review_status='pending';
create table public.spotlight_clip_votes(
 clip_id uuid not null references public.skatetv_clips(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 vote text not null check(vote in ('stomped','bail')),
 created_at timestamptz not null default now(),primary key(clip_id,user_id)
);
create index spotlight_clip_votes_user_idx on public.spotlight_clip_votes(user_id);
alter table public.spotlight_clip_votes enable row level security;
create policy spotlight_clip_votes_read_own on public.spotlight_clip_votes for select to authenticated using(user_id=(select auth.uid()));
grant select on public.spotlight_clip_votes to authenticated;
revoke insert,update,delete on public.spotlight_clip_votes from anon,authenticated;
create or replace function public.protect_clip_review()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
   new.review_status:=case when new.spotlight_id is not null or new.milestone is not null then 'pending' else 'unreviewed' end;
   new.stomped_votes:=0;new.bail_votes:=0;
 elsif current_user in ('authenticated','anon') and
  (new.review_status is distinct from old.review_status or new.stomped_votes is distinct from old.stomped_votes or new.bail_votes is distinct from old.bail_votes or new.milestone is distinct from old.milestone) then
   raise exception 'Clip review fields are server managed';
 end if;
 return new;
end;$$;
create trigger protect_clip_review before insert or update on public.skatetv_clips for each row execute function public.protect_clip_review();

create or replace function public.judge_spotlight_clip(p_clip_id uuid,p_vote text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_clip public.skatetv_clips%rowtype;v_up integer;v_down integer;v_status text;
begin
 if v_user is null then raise exception 'authentication required';end if;
 if p_vote is null or p_vote not in ('stomped','bail') then raise exception 'invalid vote';end if;
 select * into v_clip from public.skatetv_clips where id=p_clip_id for update;
 if not found then raise exception 'clip not found';end if;
 if v_clip.user_id=v_user then raise exception 'cannot judge own submission';end if;
 if v_clip.review_status<>'pending' then raise exception 'clip no longer pending';end if;
 if exists(select 1 from public.spotlight_clip_votes where clip_id=p_clip_id and user_id=v_user) then raise exception 'already voted';end if;
 insert into public.spotlight_clip_votes(clip_id,user_id,vote) values(p_clip_id,v_user,p_vote);
 select count(*) filter(where vote='stomped'),count(*) filter(where vote='bail') into v_up,v_down from public.spotlight_clip_votes where clip_id=p_clip_id;
 v_status:=case when v_up+v_down<3 then 'pending' when v_up>v_down then 'approved' else 'rejected' end;
 update public.skatetv_clips set stomped_votes=v_up,bail_votes=v_down,review_status=v_status where id=p_clip_id;
 return jsonb_build_object('success',true,'status',upper(v_status),'judge_xp',0,'xp_earned',0,'bonus_xp',0);
end;$$;
revoke all on function public.judge_spotlight_clip(uuid,text) from public,anon;
grant execute on function public.judge_spotlight_clip(uuid,text) to authenticated;

-- Activate one genuine, prize-free weekly community prompt at the owner's chosen
-- launch spot. Submission and vote tables remain empty until real skaters act.
insert into public.spotlight_challenges(title,description,spot_id,starts_at,ends_at)
select 'Newport: show us your line',
 'Film a line at Newport Skatepark (Sam Moore Parkway) and share the real clip. No prize or automatic submission XP. Community review judges the clip, not proof of filming location.',
 p.spot_id,now(),now()+interval '7 days'
from public.map_sponsors p
where p.website_url='https://portaldimension.com' and p.active and p.spot_id is not null
 and not exists(select 1 from public.spotlight_challenges c where c.spot_id=p.spot_id and c.active and c.ends_at>now());
notify pgrst,'reload schema';
commit;
