-- Crew ownership uses auth.uid(), so both user foreign keys must reference
-- the authenticated user table. Some deployed environments inherited these
-- constraints against an empty legacy public.users table, which made the
-- create_crew RPC fail even for valid authenticated profiles.

do $$
begin
  if exists (
    select 1
    from public.crews c
    left join auth.users u on u.id = c.created_by
    where c.created_by is not null
      and u.id is null
  ) then
    raise exception 'Cannot repair crews.created_by: rows reference unknown auth users';
  end if;

  if exists (
    select 1
    from public.crew_members cm
    left join auth.users u on u.id = cm.user_id
    where u.id is null
  ) then
    raise exception 'Cannot repair crew_members.user_id: rows reference unknown auth users';
  end if;
end;
$$;

alter table public.crews
  drop constraint if exists crews_created_by_fkey,
  add constraint crews_created_by_fkey
    foreign key (created_by)
    references auth.users(id)
    on delete set null;

alter table public.crew_members
  drop constraint if exists crew_members_user_id_fkey,
  add constraint crew_members_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete cascade;
