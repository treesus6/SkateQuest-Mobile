begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_conversation_member(uuid) from public, anon;
grant execute on function private.is_conversation_member(uuid) to authenticated, service_role;

alter table public.conversation_members
  add column if not exists last_read_at timestamptz;

drop policy if exists "Users can add members to conversations" on public.conversation_members;
drop policy if exists "no_joining_conversations" on public.conversation_members;
drop policy if exists "Users can view conversation members" on public.conversation_members;
drop policy if exists "Users can leave crews" on public.conversation_members;
create policy "Conversation members can view members"
on public.conversation_members for select
to authenticated
using (private.is_conversation_member(conversation_id));
revoke insert, delete on public.conversation_members from anon, authenticated;

drop policy if exists "Users can create conversations" on public.conversations;
drop policy if exists "no_private_messaging" on public.conversations;
drop policy if exists "Users can view conversations they're in" on public.conversations;
create policy "Members can view conversations"
on public.conversations for select
to authenticated
using (private.is_conversation_member(id));
revoke insert on public.conversations from anon, authenticated;

drop policy if exists "Users can view messages in their conversations" on public.messages;
drop policy if exists "Users can insert messages" on public.messages;
drop policy if exists "no_sending_messages" on public.messages;
drop policy if exists "Users can update their own messages" on public.messages;
drop policy if exists "Users can delete their own messages" on public.messages;
create policy "Members can view messages"
on public.messages for select
to authenticated
using (private.is_conversation_member(conversation_id));
create policy "Members can send their own messages"
on public.messages for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and deleted_at is null
  and private.is_conversation_member(conversation_id)
);
create policy "Members can update their own messages"
on public.messages for update
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_conversation_member(conversation_id)
)
with check (
  user_id = (select auth.uid())
  and private.is_conversation_member(conversation_id)
);
create policy "Members can delete their own messages"
on public.messages for delete
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_conversation_member(conversation_id)
);

drop policy if exists "Authenticated users can create crews" on public.crews;
create policy "Authenticated users can create crews"
on public.crews for insert
to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists "Creator can update crew" on public.crews;
create policy "Creator can update crew"
on public.crews for update
to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

drop policy if exists "Authenticated users can join crews" on public.crew_members;
create policy "Users can join crews as themselves"
on public.crew_members for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users can leave crews" on public.crew_members;
create policy "Users can leave crews"
on public.crew_members for delete
to authenticated
using (user_id = (select auth.uid()));

create unique index if not exists conversations_one_crew_chat
  on public.conversations(crew_id)
  where type = 'crew' and crew_id is not null;

create or replace function public.create_or_get_direct_conversation(
  p_user1_id uuid,
  p_user2_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_conversation_id uuid;
  v_lock_key text;
begin
  if v_user is null or v_user is distinct from p_user1_id then
    raise exception 'Not authorized to create this conversation';
  end if;
  if p_user2_id is null or p_user2_id = v_user then
    raise exception 'Invalid conversation recipient';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user2_id) then
    raise exception 'Recipient not found';
  end if;

  v_lock_key := least(v_user::text, p_user2_id::text) || ':' || greatest(v_user::text, p_user2_id::text);
  perform pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));

  select c.id into v_conversation_id
  from public.conversations c
  where c.type = 'direct'
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = c.id and cm.user_id = v_user
    )
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = c.id and cm.user_id = p_user2_id
    )
    and 2 = (
      select count(*) from public.conversation_members cm
      where cm.conversation_id = c.id
    )
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations(type, created_by)
  values ('direct', v_user)
  returning id into v_conversation_id;

  insert into public.conversation_members(conversation_id, user_id, last_read_at)
  values
    (v_conversation_id, v_user, now()),
    (v_conversation_id, p_user2_id, null);

  return v_conversation_id;
end;
$$;
revoke all on function public.create_or_get_direct_conversation(uuid, uuid) from public, anon;
grant execute on function public.create_or_get_direct_conversation(uuid, uuid) to authenticated, service_role;

create or replace function public.create_crew_conversation(
  p_crew_id uuid,
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;
  if not exists (
    select 1 from public.crews c
    where c.id = p_crew_id and c.created_by = v_user
  ) then
    raise exception 'Only the crew creator can create the crew conversation';
  end if;

  select c.id into v_conversation_id
  from public.conversations c
  where c.type = 'crew' and c.crew_id = p_crew_id
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations(type, name, crew_id, created_by)
  values ('crew', nullif(btrim(p_name), ''), p_crew_id, v_user)
  returning id into v_conversation_id;

  insert into public.conversation_members(conversation_id, user_id, last_read_at)
  select v_conversation_id, member.user_id,
         case when member.user_id = v_user then now() else null end
  from (
    select cm.user_id
    from public.crew_members cm
    where cm.crew_id = p_crew_id and cm.user_id is not null
    union
    select v_user
  ) member
  on conflict (conversation_id, user_id) do nothing;

  return v_conversation_id;
end;
$$;
revoke all on function public.create_crew_conversation(uuid, text) from public, anon;
grant execute on function public.create_crew_conversation(uuid, text) to authenticated, service_role;

create or replace function private.sync_crew_conversation_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.crew_id is not null and new.user_id is not null then
      insert into public.conversation_members(conversation_id, user_id)
      select c.id, new.user_id
      from public.conversations c
      where c.type = 'crew' and c.crew_id = new.crew_id
      on conflict (conversation_id, user_id) do nothing;
    end if;
    return new;
  end if;

  if old.crew_id is not null and old.user_id is not null then
    delete from public.conversation_members cm
    using public.conversations c
    where cm.conversation_id = c.id
      and cm.user_id = old.user_id
      and c.type = 'crew'
      and c.crew_id = old.crew_id;
  end if;
  return old;
end;
$$;
revoke all on function private.sync_crew_conversation_member() from public, anon, authenticated;
grant execute on function private.sync_crew_conversation_member() to service_role;

drop trigger if exists trg_sync_crew_conversation_member on public.crew_members;
create trigger trg_sync_crew_conversation_member
after insert or delete on public.crew_members
for each row execute function private.sync_crew_conversation_member();

create or replace function public.mark_messages_read(
  p_conversation_id uuid,
  p_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  update public.conversation_members cm
  set last_read_at = now()
  where cm.conversation_id = p_conversation_id
    and cm.user_id = p_user_id;

  if not found then
    raise exception 'Not a member of this conversation';
  end if;

  return 1;
end;
$$;
revoke all on function public.mark_messages_read(uuid, uuid) from public, anon;
grant execute on function public.mark_messages_read(uuid, uuid) to authenticated, service_role;

create or replace function public.get_unread_message_count(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  select count(*)::integer into v_count
  from public.conversation_members cm
  join public.messages m on m.conversation_id = cm.conversation_id
  where cm.user_id = p_user_id
    and m.user_id <> p_user_id
    and m.deleted_at is null
    and m.created_at > coalesce(cm.last_read_at, cm.joined_at::timestamptz, '-infinity'::timestamptz);

  return coalesce(v_count, 0);
end;
$$;
revoke all on function public.get_unread_message_count(uuid) from public, anon;
grant execute on function public.get_unread_message_count(uuid) to authenticated, service_role;

commit;
