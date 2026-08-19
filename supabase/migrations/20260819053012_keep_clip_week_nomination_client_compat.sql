create or replace function public.submit_clip_of_week_nomination(
  p_user_id uuid,
  p_media_id uuid,
  p_week_start date,
  p_xp_reward integer
)
returns uuid
language sql
security definer
set search_path=''
as $$
  select public.submit_clip_of_week_nomination(p_user_id,p_media_id,p_week_start);
$$;
revoke all on function public.submit_clip_of_week_nomination(uuid,uuid,date,integer) from public,anon;
grant execute on function public.submit_clip_of_week_nomination(uuid,uuid,date,integer) to authenticated,service_role;
