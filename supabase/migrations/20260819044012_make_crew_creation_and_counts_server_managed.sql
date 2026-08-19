begin;

create unique index if not exists crew_members_one_crew_per_user
  on public.crew_members(user_id)
  where user_id is not null;

create or replace function private.sync_crew_member_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_crew_id uuid := coalesce(new.crew_id, old.crew_id);
begin
  update public.crews c
  set member_count = (
    select count(*)::integer
    from public.crew_members cm
    where cm.crew_id = v_crew_id
  )
  where c.id = v_crew_id;
  return coalesce(new, old);
end;
$$;
revoke all on function private.sync_crew_member_count() from public, anon, authenticated;
grant execute on function private.sync_crew_member_count() to service_role;

drop trigger if exists trg_sync_crew_member_count on public.crew_members;
create trigger trg_sync_crew_member_count
after insert or delete on public.crew_members
for each row execute function private.sync_crew_member_count();

update public.crews c
set member_count = (
  select count(*)::integer from public.crew_members cm where cm.crew_id = c.id
);

drop policy if exists "Authenticated users can create crews" on public.crews;
drop policy if exists "Creator can update crew" on public.crews;
revoke insert, update on public.crews from anon, authenticated;

create or replace function public.create_crew(p_name text, p_description text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_crew_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'Crew name must be between 2 and 60 characters';
  end if;
  if exists (select 1 from public.crew_members cm where cm.user_id = v_user) then
    raise exception 'You are already in a crew';
  end if;
  if exists (select 1 from public.crews c where lower(c.name) = lower(v_name)) then
    raise exception 'That crew name is already taken';
  end if;

  insert into public.crews(name, description, created_by, member_count, total_xp)
  values (v_name, nullif(btrim(coalesce(p_description,'')), ''), v_user, 0, 0)
  returning id into v_crew_id;

  insert into public.crew_members(crew_id, user_id)
  values (v_crew_id, v_user);

  return v_crew_id;
end;
$$;
revoke all on function public.create_crew(text,text) from public, anon;
grant execute on function public.create_crew(text,text) to authenticated, service_role;

commit;
