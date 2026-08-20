-- Skate Passport stamps are earned only from a verified live check-in.
-- Imported skate_spots and skateparks share IDs, so we can use exact park identity
-- instead of guessing state from coordinates or user-supplied text.

create or replace function public.award_passport_stamp_from_verified_checkin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state text;
  v_park_name text;
begin
  select upper(btrim(p.state)), p.name
    into v_state, v_park_name
  from public.skateparks p
  where p.id = new.park_id
    and upper(btrim(p.state)) = any (array[
      'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
      'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
      'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
      'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
      'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
    ]::text[])
  limit 1;

  if v_state is null then
    return new;
  end if;

  insert into public.skate_passport_stamps(
    user_id,
    location_type,
    location_name,
    location_code,
    park_id,
    stamped_at
  )
  values (
    new.user_id,
    'state',
    v_state,
    v_state,
    new.park_id,
    coalesce(new.created_at, now())
  )
  on conflict (user_id, location_code) do nothing;

  return new;
end;
$$;

revoke all on function public.award_passport_stamp_from_verified_checkin() from public;
grant execute on function public.award_passport_stamp_from_verified_checkin() to service_role;

drop trigger if exists trg_award_passport_stamp_from_verified_checkin on public.live_checkins;
create trigger trg_award_passport_stamp_from_verified_checkin
after insert on public.live_checkins
for each row
execute function public.award_passport_stamp_from_verified_checkin();
