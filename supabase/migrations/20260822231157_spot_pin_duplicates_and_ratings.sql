-- A map pin is the authoritative spot location. GPS proximity to the submitter
-- is never required, but another saved spot within 25 meters is a duplicate.

ALTER TABLE public.skate_spots
  ADD COLUMN IF NOT EXISTS potential_rating double precision,
  ADD COLUMN IF NOT EXISTS difficulty_rating double precision,
  ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.skate_spots
  DROP CONSTRAINT IF EXISTS skate_spots_latitude_bounds,
  ADD CONSTRAINT skate_spots_latitude_bounds CHECK (latitude BETWEEN -90 AND 90),
  DROP CONSTRAINT IF EXISTS skate_spots_longitude_bounds,
  ADD CONSTRAINT skate_spots_longitude_bounds CHECK (longitude BETWEEN -180 AND 180),
  DROP CONSTRAINT IF EXISTS skate_spots_rating_count_nonnegative,
  ADD CONSTRAINT skate_spots_rating_count_nonnegative CHECK (rating_count >= 0);

CREATE INDEX IF NOT EXISTS skate_spots_geography_gix
  ON public.skate_spots
  USING gist (
    (public.ST_SetSRID(public.ST_MakePoint(longitude, latitude), 4326)::public.geography)
  );

CREATE TABLE IF NOT EXISTS public.spot_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES public.skate_spots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  potential smallint NOT NULL CHECK (potential BETWEEN 1 AND 5),
  difficulty smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  quality smallint NOT NULL CHECK (quality BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spot_ratings_one_per_skater UNIQUE (spot_id, user_id)
);

CREATE INDEX IF NOT EXISTS spot_ratings_user_id_idx
  ON public.spot_ratings(user_id);

ALTER TABLE public.spot_ratings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.spot_ratings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.spot_ratings TO authenticated;

DROP POLICY IF EXISTS "Spot ratings are public" ON public.spot_ratings;
CREATE POLICY "Spot ratings are public"
  ON public.spot_ratings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Skaters create own spot ratings" ON public.spot_ratings;
CREATE POLICY "Skaters create own spot ratings"
  ON public.spot_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) = user_id
  );

DROP POLICY IF EXISTS "Skaters update own spot ratings" ON public.spot_ratings;
CREATE POLICY "Skaters update own spot ratings"
  ON public.spot_ratings
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Skaters delete own spot ratings" ON public.spot_ratings;
CREATE POLICY "Skaters delete own spot ratings"
  ON public.spot_ratings
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.refresh_skate_spot_rating_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  target_spot_id uuid := COALESCE(NEW.spot_id, OLD.spot_id);
BEGIN
  UPDATE public.skate_spots AS spot
  SET
    potential_rating = summary.potential_rating,
    difficulty_rating = summary.difficulty_rating,
    rating = summary.quality_rating,
    rating_count = summary.rating_count
  FROM (
    SELECT
      round(avg(r.potential)::numeric, 1)::double precision AS potential_rating,
      round(avg(r.difficulty)::numeric, 1)::double precision AS difficulty_rating,
      round(avg(r.quality)::numeric, 1)::double precision AS quality_rating,
      count(*)::integer AS rating_count
    FROM public.spot_ratings AS r
    WHERE r.spot_id = target_spot_id
  ) AS summary
  WHERE spot.id = target_spot_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

REVOKE ALL ON FUNCTION public.refresh_skate_spot_rating_summary()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS refresh_skate_spot_rating_summary
  ON public.spot_ratings;
CREATE TRIGGER refresh_skate_spot_rating_summary
AFTER INSERT OR UPDATE OR DELETE ON public.spot_ratings
FOR EACH ROW
EXECUTE FUNCTION public.refresh_skate_spot_rating_summary();

CREATE OR REPLACE FUNCTION public.prevent_duplicate_skate_spot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  existing_spot record;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('skatequest:skate_spots:duplicate_guard')
  );

  SELECT spot.id, spot.name
  INTO existing_spot
  FROM public.skate_spots AS spot
  WHERE public.ST_DWithin(
    public.ST_SetSRID(public.ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::public.geography,
    public.ST_SetSRID(public.ST_MakePoint(spot.longitude, spot.latitude), 4326)::public.geography,
    25
  )
  ORDER BY public.ST_Distance(
    public.ST_SetSRID(public.ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::public.geography,
    public.ST_SetSRID(public.ST_MakePoint(spot.longitude, spot.latitude), 4326)::public.geography
  )
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = format('A skate spot already exists here: %s', existing_spot.name),
      DETAIL = existing_spot.id::text,
      HINT = 'Open the existing spot instead of adding a duplicate.';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.prevent_duplicate_skate_spot()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_duplicate_skate_spot
  ON public.skate_spots;
CREATE TRIGGER prevent_duplicate_skate_spot
BEFORE INSERT ON public.skate_spots
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_skate_spot();

DROP POLICY IF EXISTS "Users can create own community spots" ON public.skate_spots;
CREATE POLICY "Users can create own community spots"
  ON public.skate_spots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    added_by = (SELECT auth.uid())
    AND sponsor_name IS NULL
    AND sponsor_url IS NULL
    AND sponsor_logo_url IS NULL
    AND COALESCE(has_qr, false) = false
    AND crew_id IS NULL
    AND COALESCE(reputation_points, 0) = 0
    AND status IS NULL
    AND rating IS NULL
    AND potential_rating IS NULL
    AND difficulty_rating IS NULL
    AND rating_count = 0
  );

CREATE OR REPLACE FUNCTION public.create_spot_with_rating(
  p_name text,
  p_latitude double precision,
  p_longitude double precision,
  p_difficulty text,
  p_obstacles text[],
  p_tricks text[],
  p_spot_type text,
  p_bust_risk text,
  p_potential_rating smallint,
  p_difficulty_rating smallint,
  p_quality_rating smallint
)
RETURNS public.skate_spots
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := (SELECT auth.uid());
  created_spot public.skate_spots;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sign in before adding a spot.';
  END IF;
  IF NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Spot name is required.';
  END IF;
  IF p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Spot coordinates are invalid.';
  END IF;
  IF p_potential_rating NOT BETWEEN 1 AND 5
     OR p_difficulty_rating NOT BETWEEN 1 AND 5
     OR p_quality_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'All spot ratings must be from 1 to 5.';
  END IF;

  INSERT INTO public.skate_spots (
    name,
    latitude,
    longitude,
    difficulty,
    obstacles,
    tricks,
    added_by,
    spot_type,
    bust_risk
  )
  VALUES (
    btrim(p_name),
    p_latitude,
    p_longitude,
    p_difficulty,
    COALESCE(p_obstacles, ARRAY[]::text[]),
    COALESCE(p_tricks, ARRAY[]::text[]),
    caller_id,
    p_spot_type,
    p_bust_risk
  )
  RETURNING * INTO created_spot;

  INSERT INTO public.spot_ratings (
    spot_id,
    user_id,
    potential,
    difficulty,
    quality
  )
  VALUES (
    created_spot.id,
    caller_id,
    p_potential_rating,
    p_difficulty_rating,
    p_quality_rating
  );

  SELECT *
  INTO created_spot
  FROM public.skate_spots
  WHERE id = created_spot.id;

  RETURN created_spot;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_spot_with_rating(
  text,
  double precision,
  double precision,
  text,
  text[],
  text[],
  text,
  text,
  smallint,
  smallint,
  smallint
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_spot_with_rating(
  text,
  double precision,
  double precision,
  text,
  text[],
  text[],
  text,
  text,
  smallint,
  smallint,
  smallint
) TO authenticated;

CREATE OR REPLACE FUNCTION public.rate_spot(
  p_spot_id uuid,
  p_potential_rating smallint,
  p_difficulty_rating smallint,
  p_quality_rating smallint
)
RETURNS TABLE (
  potential_score double precision,
  difficulty_score double precision,
  quality_score double precision,
  ratings_count integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := (SELECT auth.uid());
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sign in before rating a spot.';
  END IF;
  IF p_potential_rating NOT BETWEEN 1 AND 5
     OR p_difficulty_rating NOT BETWEEN 1 AND 5
     OR p_quality_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'All spot ratings must be from 1 to 5.';
  END IF;

  INSERT INTO public.spot_ratings (
    spot_id,
    user_id,
    potential,
    difficulty,
    quality
  )
  VALUES (
    p_spot_id,
    caller_id,
    p_potential_rating,
    p_difficulty_rating,
    p_quality_rating
  )
  ON CONFLICT (spot_id, user_id)
  DO UPDATE SET
    potential = EXCLUDED.potential,
    difficulty = EXCLUDED.difficulty,
    quality = EXCLUDED.quality,
    updated_at = now();

  RETURN QUERY
  SELECT
    spot.potential_rating,
    spot.difficulty_rating,
    spot.rating,
    spot.rating_count
  FROM public.skate_spots AS spot
  WHERE spot.id = p_spot_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.rate_spot(
  uuid,
  smallint,
  smallint,
  smallint
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rate_spot(
  uuid,
  smallint,
  smallint,
  smallint
) TO authenticated;
