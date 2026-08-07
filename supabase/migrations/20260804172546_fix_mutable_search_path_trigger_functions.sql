CREATE OR REPLACE FUNCTION public.award_pioneer_badge()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  pioneer_badge_id uuid;
  already_visited boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM park_visits WHERE park_id = NEW.park_id AND id != NEW.id) INTO already_visited;
  IF NOT already_visited THEN
    SELECT id INTO pioneer_badge_id FROM badges WHERE name = 'Pioneer';
    IF pioneer_badge_id IS NOT NULL THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (NEW.user_id, pioneer_badge_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_time_badges()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  badge_id uuid;
  local_hour int;
BEGIN
  local_hour := EXTRACT(HOUR FROM NEW.session_start);
  IF local_hour < 7 THEN
    SELECT id INTO badge_id FROM badges WHERE name = 'Dawn Patrol';
  ELSIF local_hour >= 21 THEN
    SELECT id INTO badge_id FROM badges WHERE name = 'Night Owl';
  END IF;
  IF badge_id IS NOT NULL THEN
    INSERT INTO user_badges (user_id, badge_id) VALUES (NEW.user_id, badge_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

