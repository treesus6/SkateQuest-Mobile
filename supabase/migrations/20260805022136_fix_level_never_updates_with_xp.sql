CREATE OR REPLACE FUNCTION public.increment_user_xp(p_user_id uuid, p_xp_amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE public.profiles
  SET xp = COALESCE(xp, 0) + p_xp_amount,
      level = public.calculate_level(COALESCE(xp, 0) + p_xp_amount)
  WHERE id = p_user_id;
END;
$function$;

