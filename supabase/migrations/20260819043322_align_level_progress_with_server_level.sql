create or replace function public.get_level_progress(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_xp integer;
  current_level integer;
  xp_for_current integer;
  xp_for_next integer;
  xp_progress integer;
  xp_needed integer;
  progress_fraction double precision;
  progress_percentage numeric;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  select coalesce(p.xp, 0)
  into user_xp
  from public.profiles p
  where p.id = p_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  current_level := public.calculate_level(user_xp);
  xp_for_current := ((current_level - 1) * (current_level - 1)) * 100;
  xp_for_next := (current_level * current_level) * 100;
  xp_progress := greatest(0, user_xp - xp_for_current);
  xp_needed := greatest(0, xp_for_next - user_xp);
  progress_fraction := case
    when xp_for_next > xp_for_current
      then least(1.0, greatest(0.0, (user_xp - xp_for_current)::double precision / (xp_for_next - xp_for_current)::double precision))
    else 1.0
  end;
  progress_percentage := round((progress_fraction * 100)::numeric, 1);

  return jsonb_build_object(
    'current_level', current_level,
    'level', current_level,
    'current_xp', user_xp,
    'xp', user_xp,
    'xp_for_current_level', xp_for_current,
    'xp_for_next_level', xp_for_next,
    'xp_progress', xp_progress,
    'xp_needed', xp_needed,
    'progress', progress_fraction,
    'progress_percentage', progress_percentage
  );
end;
$$;

revoke all on function public.get_level_progress(uuid) from public, anon;
grant execute on function public.get_level_progress(uuid) to authenticated, service_role;
