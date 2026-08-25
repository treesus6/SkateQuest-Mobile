-- Create community spots and their optional primary photos as one database action.
-- Storage upload happens first; these functions verify that the uploaded object
-- belongs to the signed-in caller before referencing it from public tables.

CREATE OR REPLACE FUNCTION public.create_spot_with_photo(
  p_name text,
  p_latitude double precision,
  p_longitude double precision,
  p_difficulty text,
  p_obstacles text[],
  p_tricks text[],
  p_spot_type text,
  p_bust_risk text,
  p_photo_url text DEFAULT NULL,
  p_photo_file_size integer DEFAULT NULL
)
RETURNS public.skate_spots
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public', 'storage'
AS $function$
DECLARE
  caller_id uuid := (SELECT auth.uid());
  created_spot public.skate_spots;
  created_media public.media;
  photo_path text;
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

  IF NULLIF(btrim(p_photo_url), '') IS NOT NULL THEN
    photo_path := split_part(
      p_photo_url,
      '/storage/v1/object/public/spot-photos/',
      2
    );

    IF NULLIF(photo_path, '') IS NULL OR NOT EXISTS (
      SELECT 1
      FROM storage.objects AS object
      WHERE object.bucket_id = 'spot-photos'
        AND object.name = photo_path
        AND (storage.foldername(object.name))[2] = caller_id::text
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'The selected spot photo was not uploaded by this account.';
    END IF;
  END IF;

  INSERT INTO public.skate_spots (
    name,
    latitude,
    longitude,
    difficulty,
    obstacles,
    tricks,
    image_url,
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
    NULLIF(btrim(p_photo_url), ''),
    caller_id,
    p_spot_type,
    p_bust_risk
  )
  RETURNING * INTO created_spot;

  IF NULLIF(btrim(p_photo_url), '') IS NOT NULL THEN
    INSERT INTO public.media (
      user_id,
      type,
      url,
      file_size,
      caption,
      spot_id
    )
    VALUES (
      caller_id,
      'photo',
      btrim(p_photo_url),
      GREATEST(COALESCE(p_photo_file_size, 0), 0),
      format('Photo of %s', created_spot.name),
      created_spot.id
    )
    RETURNING * INTO created_media;

    INSERT INTO public.spot_photos (
      spot_id,
      media_id,
      uploaded_by,
      is_primary
    )
    VALUES (
      created_spot.id,
      created_media.id,
      caller_id,
      true
    );
  END IF;

  RETURN created_spot;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_spot_with_photo(
  text,
  double precision,
  double precision,
  text,
  text[],
  text[],
  text,
  text,
  text,
  integer
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_spot_with_photo(
  text,
  double precision,
  double precision,
  text,
  text[],
  text[],
  text,
  text,
  text,
  integer
) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_spot_photo(
  p_spot_id uuid,
  p_photo_url text,
  p_photo_file_size integer DEFAULT NULL,
  p_caption text DEFAULT NULL
)
RETURNS public.spot_photos
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public', 'storage'
AS $function$
DECLARE
  caller_id uuid := (SELECT auth.uid());
  target_spot public.skate_spots;
  created_media public.media;
  created_photo public.spot_photos;
  photo_path text;
  make_primary boolean;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sign in before adding a spot photo.';
  END IF;
  IF NULLIF(btrim(p_photo_url), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A spot photo is required.';
  END IF;

  SELECT * INTO target_spot
  FROM public.skate_spots
  WHERE id = p_spot_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'The skate spot no longer exists.';
  END IF;

  photo_path := split_part(
    p_photo_url,
    '/storage/v1/object/public/spot-photos/',
    2
  );
  IF NULLIF(photo_path, '') IS NULL OR NOT EXISTS (
    SELECT 1
    FROM storage.objects AS object
    WHERE object.bucket_id = 'spot-photos'
      AND object.name = photo_path
      AND (storage.foldername(object.name))[2] = caller_id::text
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'The selected spot photo was not uploaded by this account.';
  END IF;

  SELECT NOT EXISTS (
    SELECT 1 FROM public.spot_photos WHERE spot_id = p_spot_id
  ) INTO make_primary;

  INSERT INTO public.media (
    user_id,
    type,
    url,
    file_size,
    caption,
    spot_id
  )
  VALUES (
    caller_id,
    'photo',
    btrim(p_photo_url),
    GREATEST(COALESCE(p_photo_file_size, 0), 0),
    COALESCE(NULLIF(btrim(p_caption), ''), format('Photo of %s', target_spot.name)),
    p_spot_id
  )
  RETURNING * INTO created_media;

  INSERT INTO public.spot_photos (
    spot_id,
    media_id,
    uploaded_by,
    is_primary
  )
  VALUES (
    p_spot_id,
    created_media.id,
    caller_id,
    make_primary
  )
  RETURNING * INTO created_photo;

  RETURN created_photo;
END;
$function$;

REVOKE ALL ON FUNCTION public.add_spot_photo(uuid, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_spot_photo(uuid, text, integer, text) TO authenticated;

-- A map result always carries the best available spot photo, including photos
-- added after the spot was created.
CREATE OR REPLACE FUNCTION public.get_nearby_spots(
  lat double precision,
  lng double precision,
  radius_meters integer DEFAULT 50000
)
RETURNS TABLE(
  id uuid,
  name text,
  latitude double precision,
  longitude double precision,
  difficulty text,
  tricks text[],
  rating double precision,
  image_url text,
  added_by uuid,
  created_at timestamp with time zone,
  sponsor_name text,
  sponsor_url text,
  sponsor_logo_url text,
  spot_type text,
  distance_meters double precision
)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    spot.id,
    spot.name,
    spot.latitude,
    spot.longitude,
    spot.difficulty,
    spot.tricks,
    spot.rating,
    COALESCE(
      spot.image_url,
      (
        SELECT media.url
        FROM public.spot_photos AS photo
        JOIN public.media AS media ON media.id = photo.media_id
        WHERE photo.spot_id = spot.id
        ORDER BY photo.is_primary DESC NULLS LAST, photo.created_at ASC
        LIMIT 1
      )
    ) AS image_url,
    spot.added_by,
    spot.created_at,
    spot.sponsor_name,
    spot.sponsor_url,
    spot.sponsor_logo_url,
    spot.spot_type,
    ST_Distance(
      ST_MakePoint(lng, lat)::geography,
      ST_MakePoint(spot.longitude, spot.latitude)::geography
    ) AS distance_meters
  FROM public.skate_spots AS spot
  WHERE ST_DWithin(
    ST_MakePoint(lng, lat)::geography,
    ST_MakePoint(spot.longitude, spot.latitude)::geography,
    radius_meters
  )
  ORDER BY distance_meters ASC
  LIMIT 500;
$function$;
