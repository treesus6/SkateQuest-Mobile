begin;

drop trigger if exists callouts_mission_trigger on public.callouts;
drop trigger if exists challenge_completions_mission_trigger on public.challenge_completions;
drop trigger if exists comments_mission_trigger on public.comments;
drop trigger if exists park_ratings_mission_trigger on public.park_ratings;
drop trigger if exists park_visits_duration_mission_trigger on public.park_visits;
drop trigger if exists park_visits_mission_trigger on public.park_visits;
drop trigger if exists qr_scans_mission_trigger on public.qr_scans;
drop trigger if exists skate_spots_mission_trigger on public.skate_spots;

create or replace function public.trg_skatetv_likes_mission()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.user_id is not null and new.clip_id is not null then
    perform private.increment_mission_progress_once(new.user_id,'like_clips','skatetv_like:'||new.clip_id::text,1);
  end if;
  return new;
end; $$;

create or replace function public.trg_trick_analyses_mission()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.user_id is not null then
    perform private.increment_mission_progress_once(new.user_id,'land_trick','trick_analysis:'||new.id::text,1);
  end if;
  return new;
end; $$;

create or replace function public.trg_videos_mission()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.user_id is not null then
    perform private.increment_mission_progress_once(new.user_id,'upload_clip','video:'||new.id::text,1);
  end if;
  return new;
end; $$;

revoke all on function public.trg_skatetv_likes_mission() from public,anon,authenticated;
revoke all on function public.trg_trick_analyses_mission() from public,anon,authenticated;
revoke all on function public.trg_videos_mission() from public,anon,authenticated;

commit;
