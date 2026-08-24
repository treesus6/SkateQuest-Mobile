-- Keep the live Add Spot contract reproducible in source control.
-- A submission is one real spot, one creator rating, and an optional primary photo.

alter table public.skate_spots
  add column if not exists potential_rating double precision,
  add column if not exists difficulty_rating double precision,
  add column if not exists rating_count integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.skate_spots'::regclass
      and conname = 'skate_spots_rating_count_nonnegative'
  ) then
    alter table public.skate_spots
      add constraint skate_spots_rating_count_nonnegative check (rating_count >= 0);
  end if;
end
$$;

create table if not exists public.spot_ratings (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.skate_spots(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  potential smallint not null check (potential between 1 and 5),
  difficulty smallint not null check (difficulty between 1 and 5),
  quality smallint not null check (quality between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spot_ratings_one_per_skater unique (spot_id, user_id)
);

create index if not exists spot_ratings_spot_id_idx
  on public.spot_ratings (spot_id);
create index if not exists spot_ratings_user_id_idx
  on public.spot_ratings (user_id);

alter table public.spot_ratings enable row level security;

drop policy if exists "Spot ratings are public" on public.spot_ratings;
create policy "Spot ratings are public"
  on public.spot_ratings for select
  to anon, authenticated
  using (true);

drop policy if exists "Skaters create own spot ratings" on public.spot_ratings;
create policy "Skaters create own spot ratings"
  on public.spot_ratings for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Skaters update own spot ratings" on public.spot_ratings;
create policy "Skaters update own spot ratings"
  on public.spot_ratings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Skaters delete own spot ratings" on public.spot_ratings;
create policy "Skaters delete own spot ratings"
  on public.spot_ratings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.spot_ratings to anon;
grant select, insert, update, delete on public.spot_ratings to authenticated;

create or replace function public.refresh_skate_spot_rating_summary()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_spot_id uuid := coalesce(new.spot_id, old.spot_id);
begin
  update public.skate_spots as spot
  set
    potential_rating = summary.potential_rating,
    difficulty_rating = summary.difficulty_rating,
    rating = summary.quality_rating,
    rating_count = summary.rating_count
  from (
    select
      round(avg(r.potential)::numeric, 1)::double precision as potential_rating,
      round(avg(r.difficulty)::numeric, 1)::double precision as difficulty_rating,
      round(avg(r.quality)::numeric, 1)::double precision as quality_rating,
      count(*)::integer as rating_count
    from public.spot_ratings as r
    where r.spot_id = target_spot_id
  ) as summary
  where spot.id = target_spot_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_skate_spot_rating_summary on public.spot_ratings;
create trigger refresh_skate_spot_rating_summary
after insert or update or delete on public.spot_ratings
for each row execute function public.refresh_skate_spot_rating_summary();

-- Exact features can sit close together at a street spot. Use a tight guard there,
-- while parks and shops get a wider same-type guard for slightly misplaced pins.
create or replace function public.prevent_duplicate_skate_spot()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  existing_spot record;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('skatequest:skate_spots:duplicate_guard')
  );

  select
    spot.id,
    spot.name,
    public.st_distance(
      public.st_setsrid(public.st_makepoint(new.longitude, new.latitude), 4326)::public.geography,
      public.st_setsrid(public.st_makepoint(spot.longitude, spot.latitude), 4326)::public.geography
    ) as distance_meters
  into existing_spot
  from public.skate_spots as spot
  where public.st_dwithin(
    public.st_setsrid(public.st_makepoint(new.longitude, new.latitude), 4326)::public.geography,
    public.st_setsrid(public.st_makepoint(spot.longitude, spot.latitude), 4326)::public.geography,
    case
      when new.spot_type in ('park', 'shop') and spot.spot_type = new.spot_type then 25
      else 8
    end
  )
  order by distance_meters
  limit 1;

  if found then
    raise exception using
      errcode = '23505',
      message = format('A skate spot already exists here: %s', existing_spot.name),
      detail = existing_spot.id::text,
      hint = 'Open the existing spot instead of adding a duplicate.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_duplicate_skate_spot on public.skate_spots;
create trigger prevent_duplicate_skate_spot
before insert on public.skate_spots
for each row execute function public.prevent_duplicate_skate_spot();

create or replace function public.find_duplicate_spot(
  p_latitude double precision,
  p_longitude double precision,
  p_spot_type text
)
returns table (
  id uuid,
  name text,
  distance_meters double precision
)
language sql
stable
set search_path = pg_catalog, public
as $$
  select
    spot.id,
    spot.name,
    public.st_distance(
      public.st_setsrid(public.st_makepoint(p_longitude, p_latitude), 4326)::public.geography,
      public.st_setsrid(public.st_makepoint(spot.longitude, spot.latitude), 4326)::public.geography
    ) as distance_meters
  from public.skate_spots as spot
  where p_latitude between -90 and 90
    and p_longitude between -180 and 180
    and public.st_dwithin(
      public.st_setsrid(public.st_makepoint(p_longitude, p_latitude), 4326)::public.geography,
      public.st_setsrid(public.st_makepoint(spot.longitude, spot.latitude), 4326)::public.geography,
      case
        when p_spot_type in ('park', 'shop') and spot.spot_type = p_spot_type then 25
        else 8
      end
    )
  order by distance_meters
  limit 1;
$$;

create unique index if not exists spot_photos_media_id_unique
  on public.spot_photos (media_id)
  where media_id is not null;
create unique index if not exists spot_photos_one_primary_per_spot
  on public.spot_photos (spot_id)
  where is_primary is true;

create or replace function public.create_spot_with_full_details(
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
  p_quality_rating smallint,
  p_photo_url text default null,
  p_photo_file_size integer default null
)
returns public.skate_spots
language plpgsql
set search_path = pg_catalog, public, storage
as $$
declare
  caller_id uuid := (select auth.uid());
  created_spot public.skate_spots;
  created_media public.media;
  photo_path text;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Sign in before adding a spot.';
  end if;
  if nullif(btrim(p_name), '') is null or char_length(btrim(p_name)) > 80 then
    raise exception using errcode = '22023', message = 'Spot name must be from 1 to 80 characters.';
  end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception using errcode = '22023', message = 'Spot coordinates are invalid.';
  end if;
  if p_difficulty not in ('Beginner', 'Intermediate', 'Advanced') then
    raise exception using errcode = '22023', message = 'Choose a valid spot difficulty.';
  end if;
  if p_spot_type not in ('park', 'street', 'diy', 'quest', 'shop') then
    raise exception using errcode = '22023', message = 'Choose a valid spot type.';
  end if;
  if p_bust_risk is not null and p_bust_risk not in ('low', 'medium', 'high') then
    raise exception using errcode = '22023', message = 'Choose a valid bust risk.';
  end if;
  if p_potential_rating not between 1 and 5
     or p_difficulty_rating not between 1 and 5
     or p_quality_rating not between 1 and 5 then
    raise exception using errcode = '22023', message = 'All spot ratings must be from 1 to 5.';
  end if;

  if nullif(btrim(p_photo_url), '') is not null then
    photo_path := split_part(
      p_photo_url,
      '/storage/v1/object/public/spot-photos/',
      2
    );
    if nullif(photo_path, '') is null or not exists (
      select 1
      from storage.objects as object
      where object.bucket_id = 'spot-photos'
        and object.name = photo_path
        and (storage.foldername(object.name))[2] = caller_id::text
    ) then
      raise exception using
        errcode = '42501',
        message = 'The selected spot photo was not uploaded by this account.';
    end if;
  end if;

  insert into public.skate_spots (
    name,
    latitude,
    longitude,
    difficulty,
    obstacles,
    tricks,
    added_by,
    spot_type,
    bust_risk
  ) values (
    btrim(p_name),
    p_latitude,
    p_longitude,
    p_difficulty,
    coalesce(p_obstacles[1:20], array[]::text[]),
    coalesce(p_tricks[1:50], array[]::text[]),
    caller_id,
    p_spot_type,
    case when p_spot_type = 'street' then p_bust_risk else null end
  )
  returning * into created_spot;

  insert into public.spot_ratings (
    spot_id,
    user_id,
    potential,
    difficulty,
    quality
  ) values (
    created_spot.id,
    caller_id,
    p_potential_rating,
    p_difficulty_rating,
    p_quality_rating
  );

  if nullif(btrim(p_photo_url), '') is not null then
    insert into public.media (
      user_id,
      type,
      url,
      file_size,
      caption,
      spot_id
    ) values (
      caller_id,
      'photo',
      btrim(p_photo_url),
      greatest(coalesce(p_photo_file_size, 0), 0),
      format('Photo of %s', created_spot.name),
      created_spot.id
    )
    returning * into created_media;

    insert into public.spot_photos (
      spot_id,
      media_id,
      uploaded_by,
      is_primary
    ) values (
      created_spot.id,
      created_media.id,
      caller_id,
      true
    );
  end if;

  select * into created_spot
  from public.skate_spots
  where id = created_spot.id;

  return created_spot;
end;
$$;

create or replace function public.upsert_spot_rating(
  p_spot_id uuid,
  p_potential smallint,
  p_difficulty smallint,
  p_quality smallint
)
returns public.spot_ratings
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := (select auth.uid());
  saved_rating public.spot_ratings;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Sign in before rating a spot.';
  end if;
  if p_potential not between 1 and 5
     or p_difficulty not between 1 and 5
     or p_quality not between 1 and 5 then
    raise exception using errcode = '22023', message = 'All spot ratings must be from 1 to 5.';
  end if;

  insert into public.spot_ratings (
    spot_id,
    user_id,
    potential,
    difficulty,
    quality
  ) values (
    p_spot_id,
    caller_id,
    p_potential,
    p_difficulty,
    p_quality
  )
  on conflict (spot_id, user_id) do update
  set
    potential = excluded.potential,
    difficulty = excluded.difficulty,
    quality = excluded.quality,
    updated_at = now()
  returning * into saved_rating;

  return saved_rating;
end;
$$;

create or replace function public.add_spot_photo(
  p_spot_id uuid,
  p_photo_url text,
  p_photo_file_size integer default null,
  p_caption text default null
)
returns public.spot_photos
language plpgsql
set search_path = pg_catalog, public, storage
as $$
declare
  caller_id uuid := (select auth.uid());
  target_spot public.skate_spots;
  created_media public.media;
  created_photo public.spot_photos;
  photo_path text;
  make_primary boolean;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Sign in before adding a spot photo.';
  end if;
  if nullif(btrim(p_photo_url), '') is null then
    raise exception using errcode = '22023', message = 'A spot photo is required.';
  end if;

  select * into target_spot
  from public.skate_spots
  where id = p_spot_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'The skate spot no longer exists.';
  end if;

  photo_path := split_part(
    p_photo_url,
    '/storage/v1/object/public/spot-photos/',
    2
  );
  if nullif(photo_path, '') is null or not exists (
    select 1
    from storage.objects as object
    where object.bucket_id = 'spot-photos'
      and object.name = photo_path
      and (storage.foldername(object.name))[2] = caller_id::text
  ) then
    raise exception using
      errcode = '42501',
      message = 'The selected spot photo was not uploaded by this account.';
  end if;

  select not exists (
    select 1 from public.spot_photos where spot_id = p_spot_id
  ) into make_primary;

  insert into public.media (
    user_id,
    type,
    url,
    file_size,
    caption,
    spot_id
  ) values (
    caller_id,
    'photo',
    btrim(p_photo_url),
    greatest(coalesce(p_photo_file_size, 0), 0),
    coalesce(nullif(btrim(p_caption), ''), format('Photo of %s', target_spot.name)),
    p_spot_id
  )
  returning * into created_media;

  insert into public.spot_photos (
    spot_id,
    media_id,
    uploaded_by,
    is_primary
  ) values (
    p_spot_id,
    created_media.id,
    caller_id,
    make_primary
  )
  returning * into created_photo;

  return created_photo;
end;
$$;

revoke all on function public.find_duplicate_spot(double precision, double precision, text)
  from public, anon;
revoke all on function public.create_spot_with_full_details(
  text, double precision, double precision, text, text[], text[], text, text,
  smallint, smallint, smallint, text, integer
) from public, anon;
revoke all on function public.upsert_spot_rating(uuid, smallint, smallint, smallint)
  from public, anon;
revoke all on function public.add_spot_photo(uuid, text, integer, text)
  from public, anon;

grant execute on function public.find_duplicate_spot(double precision, double precision, text)
  to authenticated, service_role;
grant execute on function public.create_spot_with_full_details(
  text, double precision, double precision, text, text[], text[], text, text,
  smallint, smallint, smallint, text, integer
) to authenticated, service_role;
grant execute on function public.upsert_spot_rating(uuid, smallint, smallint, smallint)
  to authenticated, service_role;
grant execute on function public.add_spot_photo(uuid, text, integer, text)
  to authenticated, service_role;
