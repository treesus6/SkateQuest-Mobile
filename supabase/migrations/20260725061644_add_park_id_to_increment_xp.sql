CREATE OR REPLACE FUNCTION public.increment_xp(p_user_id uuid, p_xp_amount integer, p_park_id uuid DEFAULT NULL, p_source text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM public.increment_user_xp(p_user_id, p_xp_amount);
  IF p_park_id IS NOT NULL THEN
    INSERT INTO public.park_xp_log (user_id, park_id, xp_amount, source)
    VALUES (p_user_id, p_park_id, p_xp_amount, p_source);
  END IF;
END;
$function$;

