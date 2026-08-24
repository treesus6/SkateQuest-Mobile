-- Media uploads use auth.uid(), and profile ids share the same identity as
-- auth.users. Repair the two legacy foreign keys that still pointed at the
-- empty public.users table so spot-photo uploads can persist.

do $$
begin
  if exists (
    select 1
    from public.media m
    left join public.profiles p on p.id = m.user_id
    where m.user_id is not null and p.id is null
  ) then
    raise exception 'Cannot repair media.user_id: rows reference unknown profiles';
  end if;

  if exists (
    select 1
    from public.spot_photos sp
    left join public.profiles p on p.id = sp.uploaded_by
    where sp.uploaded_by is not null and p.id is null
  ) then
    raise exception 'Cannot repair spot_photos.uploaded_by: rows reference unknown profiles';
  end if;
end;
$$;

alter table public.media
  drop constraint if exists media_user_id_fkey,
  add constraint media_user_id_fkey
    foreign key (user_id)
    references public.profiles(id)
    on delete cascade;

alter table public.spot_photos
  drop constraint if exists spot_photos_uploaded_by_fkey,
  add constraint spot_photos_uploaded_by_fkey
    foreign key (uploaded_by)
    references public.profiles(id)
    on delete set null;
