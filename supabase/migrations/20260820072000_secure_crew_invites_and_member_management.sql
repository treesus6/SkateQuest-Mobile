create table if not exists public.crew_invites (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index if not exists crew_invites_one_pending_idx
  on public.crew_invites(crew_id, invitee_id)
  where status = 'pending';

alter table public.crew_invites enable row level security;
revoke insert, update, delete on public.crew_invites from anon, authenticated;
grant select on public.crew_invites to authenticated;

drop policy if exists "Users can view their crew invites" on public.crew_invites;
create policy "Users can view their crew invites"
  on public.crew_invites for select to authenticated
  using (invitee_id = (select auth.uid()) or inviter_id = (select auth.uid()));

create or replace function public.invite_to_crew(p_crew_id uuid, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_invite_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_user_id is null or p_user_id = v_user then raise exception 'Choose another skater'; end if;
  if not exists (select 1 from public.crew_members where crew_id=p_crew_id and user_id=v_user and role='owner') then
    raise exception 'Only the crew owner can invite members';
  end if;
  if not exists (select 1 from public.profiles where id=p_user_id) then raise exception 'Skater not found'; end if;
  if exists (select 1 from public.crew_members where user_id=p_user_id) then raise exception 'That skater is already in a crew'; end if;

  insert into public.crew_invites(crew_id, inviter_id, invitee_id, status)
  values(p_crew_id, v_user, p_user_id, 'pending')
  on conflict (crew_id, invitee_id) where status='pending'
  do update set inviter_id=excluded.inviter_id, created_at=now()
  returning id into v_invite_id;

  insert into public.notifications(user_id,type,title,body,data)
  values(p_user_id,'crew_invite','Crew invite','You were invited to join a SkateQuest crew.',jsonb_build_object('crewId',p_crew_id,'inviteId',v_invite_id));

  return jsonb_build_object('success',true,'invite_id',v_invite_id);
end; $$;

create or replace function public.respond_crew_invite(p_invite_id uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_invite public.crew_invites%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_invite from public.crew_invites where id=p_invite_id and invitee_id=v_user and status='pending' for update;
  if not found then raise exception 'Pending invite not found'; end if;

  if not p_accept then
    update public.crew_invites set status='declined', responded_at=now() where id=p_invite_id;
    return jsonb_build_object('success',true,'accepted',false);
  end if;

  if exists (select 1 from public.crew_members where user_id=v_user) then raise exception 'You are already in a crew'; end if;
  insert into public.crew_members(crew_id,user_id,role,joined_at) values(v_invite.crew_id,v_user,'member',now());
  update public.crew_invites set status='accepted', responded_at=now() where id=p_invite_id;
  update public.crew_invites set status='cancelled', responded_at=now() where invitee_id=v_user and id<>p_invite_id and status='pending';
  return jsonb_build_object('success',true,'accepted',true,'crew_id',v_invite.crew_id);
end; $$;

create or replace function public.remove_crew_member(p_crew_id uuid, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_user_id=v_user then raise exception 'Use leave crew for yourself'; end if;
  if not exists (select 1 from public.crew_members where crew_id=p_crew_id and user_id=v_user and role='owner') then
    raise exception 'Only the crew owner can remove members';
  end if;
  if exists (select 1 from public.crew_members where crew_id=p_crew_id and user_id=p_user_id and role='owner') then
    raise exception 'The crew owner cannot be removed';
  end if;
  delete from public.crew_members where crew_id=p_crew_id and user_id=p_user_id;
  if not found then raise exception 'Crew member not found'; end if;
  return jsonb_build_object('success',true);
end; $$;

create or replace function public.leave_crew(p_crew_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_role text; v_count integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select role into v_role from public.crew_members where crew_id=p_crew_id and user_id=v_user for update;
  if not found then raise exception 'You are not in this crew'; end if;
  select count(*)::integer into v_count from public.crew_members where crew_id=p_crew_id;
  if v_role='owner' and v_count>1 then raise exception 'Transfer ownership or remove the other members before leaving'; end if;
  delete from public.crew_members where crew_id=p_crew_id and user_id=v_user;
  if v_role='owner' and v_count=1 then delete from public.crews where id=p_crew_id; end if;
  return jsonb_build_object('success',true);
end; $$;

revoke all on function public.invite_to_crew(uuid,uuid) from public, anon;
revoke all on function public.respond_crew_invite(uuid,boolean) from public, anon;
revoke all on function public.remove_crew_member(uuid,uuid) from public, anon;
revoke all on function public.leave_crew(uuid) from public, anon;
grant execute on function public.invite_to_crew(uuid,uuid) to authenticated,service_role;
grant execute on function public.respond_crew_invite(uuid,boolean) to authenticated,service_role;
grant execute on function public.remove_crew_member(uuid,uuid) to authenticated,service_role;
grant execute on function public.leave_crew(uuid) to authenticated,service_role;
