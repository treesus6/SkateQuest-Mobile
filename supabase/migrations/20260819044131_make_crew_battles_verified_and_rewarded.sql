begin;

alter table public.crew_battles
  add column if not exists created_by uuid references public.users(id) on delete set null,
  add column if not exists reward_xp integer not null default 500 check (reward_xp = 500),
  add column if not exists completed_at timestamptz,
  add column if not exists xp_awarded_at timestamptz;

drop policy if exists "crew_battles_auth_insert" on public.crew_battles;
drop policy if exists "crew_battles_auth_update" on public.crew_battles;
revoke insert, update, delete on public.crew_battles from anon, authenticated;

drop policy if exists "crew_battle_votes_own_insert" on public.crew_battle_votes;
revoke insert, update, delete on public.crew_battle_votes from anon, authenticated;

create or replace function public.create_crew_battle(
  p_crew_a_id uuid,
  p_crew_b_id uuid,
  p_trick_name text,
  p_duration_hours integer default 24,
  p_spot_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_battle_id uuid;
  v_trick text := btrim(coalesce(p_trick_name,''));
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_crew_a_id is null or p_crew_b_id is null or p_crew_a_id = p_crew_b_id then
    raise exception 'Choose two different crews';
  end if;
  if char_length(v_trick) < 2 or char_length(v_trick) > 80 then
    raise exception 'Trick name must be between 2 and 80 characters';
  end if;
  if p_duration_hours not in (24,48,72) then
    raise exception 'Battle duration must be 24, 48, or 72 hours';
  end if;
  if not exists (
    select 1 from public.crew_members cm
    where cm.crew_id = p_crew_a_id and cm.user_id = v_user
  ) then
    raise exception 'You must be a member of Crew A to start this battle';
  end if;
  if not exists (select 1 from public.crews c where c.id = p_crew_b_id) then
    raise exception 'Opponent crew not found';
  end if;
  if p_spot_id is not null and not exists (select 1 from public.skate_spots s where s.id=p_spot_id) then
    raise exception 'Spot not found';
  end if;
  if exists (
    select 1 from public.crew_battles b
    where b.status='active' and b.ends_at > now()
      and ((b.crew_a_id=p_crew_a_id and b.crew_b_id=p_crew_b_id)
        or (b.crew_a_id=p_crew_b_id and b.crew_b_id=p_crew_a_id))
  ) then
    raise exception 'These crews already have an active battle';
  end if;

  insert into public.crew_battles(
    crew_a_id, crew_b_id, spot_id, trick_name, votes_a, votes_b,
    ends_at, winner_crew_id, status, created_by, reward_xp
  ) values (
    p_crew_a_id, p_crew_b_id, p_spot_id, v_trick, 0, 0,
    now() + make_interval(hours => p_duration_hours), null, 'active', v_user, 500
  ) returning id into v_battle_id;

  return v_battle_id;
end;
$$;
revoke all on function public.create_crew_battle(uuid,uuid,text,integer,uuid) from public, anon;
grant execute on function public.create_crew_battle(uuid,uuid,text,integer,uuid) to authenticated, service_role;

create or replace function public.vote_crew_battle(p_battle_id uuid, p_side text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_side text := lower(btrim(coalesce(p_side,'')));
  v_battle public.crew_battles%rowtype;
  v_votes_a integer;
  v_votes_b integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_side not in ('a','b') then raise exception 'Vote must be a or b'; end if;

  select * into v_battle
  from public.crew_battles
  where id=p_battle_id
  for update;
  if not found then raise exception 'Battle not found'; end if;
  if v_battle.status <> 'active' or v_battle.ends_at <= now() then
    raise exception 'Battle has ended';
  end if;

  begin
    insert into public.crew_battle_votes(battle_id,user_id,crew_voted)
    values(p_battle_id,v_user,v_side);
  exception when unique_violation then
    raise exception 'You already voted on this battle';
  end;

  select count(*) filter(where crew_voted='a')::integer,
         count(*) filter(where crew_voted='b')::integer
    into v_votes_a,v_votes_b
  from public.crew_battle_votes
  where battle_id=p_battle_id;

  update public.crew_battles
  set votes_a=v_votes_a, votes_b=v_votes_b
  where id=p_battle_id;

  return jsonb_build_object(
    'success',true,'battle_id',p_battle_id,'crew_voted',v_side,
    'votes_a',v_votes_a,'votes_b',v_votes_b
  );
end;
$$;
revoke all on function public.vote_crew_battle(uuid,text) from public, anon;
grant execute on function public.vote_crew_battle(uuid,text) to authenticated, service_role;

create or replace function private.finalize_crew_battles()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_battle public.crew_battles%rowtype;
  v_votes_a integer;
  v_votes_b integer;
  v_winner uuid;
  v_finalized integer := 0;
begin
  for v_battle in
    select * from public.crew_battles
    where status='active' and ends_at <= now()
    order by ends_at
    for update skip locked
  loop
    select count(*) filter(where crew_voted='a')::integer,
           count(*) filter(where crew_voted='b')::integer
      into v_votes_a,v_votes_b
    from public.crew_battle_votes
    where battle_id=v_battle.id;

    v_winner := case
      when v_votes_a > v_votes_b then v_battle.crew_a_id
      when v_votes_b > v_votes_a then v_battle.crew_b_id
      else null
    end;

    update public.crew_battles
    set votes_a=v_votes_a,
        votes_b=v_votes_b,
        status='completed',
        winner_crew_id=v_winner,
        completed_at=now(),
        xp_awarded_at=case when v_winner is not null then now() else null end
    where id=v_battle.id and status='active';

    if found then
      if v_winner is not null then
        update public.crews
        set total_xp=coalesce(total_xp,0)+v_battle.reward_xp
        where id=v_winner;
      end if;
      v_finalized := v_finalized + 1;
    end if;
  end loop;
  return v_finalized;
end;
$$;
revoke all on function private.finalize_crew_battles() from public, anon, authenticated;
grant execute on function private.finalize_crew_battles() to service_role;

do $$
declare v_job record;
begin
  for v_job in select jobid from cron.job where jobname='skatequest-finalize-crew-battles' loop
    perform cron.unschedule(v_job.jobid);
  end loop;
end $$;
select cron.schedule(
  'skatequest-finalize-crew-battles',
  '* * * * *',
  'select private.finalize_crew_battles();'
);

commit;
