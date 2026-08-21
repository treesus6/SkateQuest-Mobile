alter table public.skate_games
  add column if not exists turn_phase text not null default 'set',
  add column if not exists setter_id uuid null references public.profiles(id) on delete set null,
  add column if not exists current_trick_name text null;

alter table public.skate_games
  drop constraint if exists skate_games_turn_phase_check;

alter table public.skate_games
  add constraint skate_games_turn_phase_check
  check (turn_phase in ('set','match','complete'));

alter table public.skate_games
  drop constraint if exists skate_games_challenger_letters_check;

alter table public.skate_games
  add constraint skate_games_challenger_letters_check
  check (coalesce(challenger_letters, '') in ('','S','SK','SKA','SKAT','SKATE'));

alter table public.skate_games
  drop constraint if exists skate_games_opponent_letters_check;

alter table public.skate_games
  add constraint skate_games_opponent_letters_check
  check (coalesce(opponent_letters, '') in ('','S','SK','SKA','SKAT','SKATE'));

update public.skate_games
set setter_id = current_turn
where setter_id is null and status = 'active';

create or replace function public.create_skate_game(p_opponent_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_game_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_opponent_id is null or p_opponent_id = v_user_id then
    raise exception 'Choose another skater';
  end if;

  if not exists (select 1 from public.profiles where id = p_opponent_id) then
    raise exception 'Opponent not found';
  end if;

  if exists (
    select 1
    from public.skate_games
    where status = 'active'
      and ((challenger_id = v_user_id and opponent_id = p_opponent_id)
        or (challenger_id = p_opponent_id and opponent_id = v_user_id))
  ) then
    raise exception 'An active game already exists with this skater';
  end if;

  insert into public.skate_games (
    challenger_id,
    opponent_id,
    status,
    current_turn,
    challenger_letters,
    opponent_letters,
    setter_id,
    turn_phase,
    current_trick_name
  ) values (
    v_user_id,
    p_opponent_id,
    'active',
    v_user_id,
    '',
    '',
    v_user_id,
    'set',
    null
  )
  returning id into v_game_id;

  return v_game_id;
end;
$$;

create or replace function public.submit_skate_game_turn(
  p_game_id uuid,
  p_trick_name text,
  p_landed boolean,
  p_media_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_game public.skate_games%rowtype;
  v_other_id uuid;
  v_turn_number integer;
  v_trick_name text;
  v_new_letters text;
  v_completed boolean := false;
  v_letter text := null;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_game
  from public.skate_games
  where id = p_game_id
  for update;

  if not found then
    raise exception 'Game not found';
  end if;

  if v_user_id not in (v_game.challenger_id, v_game.opponent_id) then
    raise exception 'You are not a player in this game';
  end if;

  if v_game.status <> 'active' then
    raise exception 'This game is not active';
  end if;

  if v_game.current_turn is distinct from v_user_id then
    raise exception 'It is not your turn';
  end if;

  if p_media_id is not null and not exists (
    select 1 from public.media where id = p_media_id and user_id = v_user_id
  ) then
    raise exception 'Media proof does not belong to the current player';
  end if;

  v_other_id := case
    when v_user_id = v_game.challenger_id then v_game.opponent_id
    else v_game.challenger_id
  end;

  select coalesce(max(turn_number), 0) + 1
  into v_turn_number
  from public.skate_game_turns
  where game_id = p_game_id;

  if coalesce(v_game.turn_phase, 'set') = 'set' then
    v_trick_name := nullif(btrim(coalesce(p_trick_name, '')), '');
    if v_trick_name is null then
      raise exception 'Enter the trick you are setting';
    end if;

    insert into public.skate_game_turns (
      game_id, player_id, media_id, trick_name, matched, turn_number
    ) values (
      p_game_id, v_user_id, p_media_id, v_trick_name, p_landed, v_turn_number
    );

    if p_landed then
      update public.skate_games
      set setter_id = v_user_id,
          current_turn = v_other_id,
          turn_phase = 'match',
          current_trick_name = v_trick_name
      where id = p_game_id;
    else
      update public.skate_games
      set setter_id = v_other_id,
          current_turn = v_other_id,
          turn_phase = 'set',
          current_trick_name = null
      where id = p_game_id;
    end if;
  elsif v_game.turn_phase = 'match' then
    if v_game.setter_id is null or v_game.current_trick_name is null then
      raise exception 'Game match state is incomplete';
    end if;

    if v_game.setter_id = v_user_id then
      raise exception 'Setter cannot match their own trick';
    end if;

    v_trick_name := v_game.current_trick_name;

    insert into public.skate_game_turns (
      game_id, player_id, media_id, trick_name, matched, turn_number
    ) values (
      p_game_id, v_user_id, p_media_id, v_trick_name, p_landed, v_turn_number
    );

    if p_landed then
      update public.skate_games
      set setter_id = v_user_id,
          current_turn = v_user_id,
          turn_phase = 'set',
          current_trick_name = null
      where id = p_game_id;
    else
      if v_user_id = v_game.challenger_id then
        v_new_letters := left('SKATE', char_length(coalesce(v_game.challenger_letters, '')) + 1);
      else
        v_new_letters := left('SKATE', char_length(coalesce(v_game.opponent_letters, '')) + 1);
      end if;

      v_letter := right(v_new_letters, 1);
      v_completed := char_length(v_new_letters) >= 5;

      if v_user_id = v_game.challenger_id then
        update public.skate_games
        set challenger_letters = v_new_letters,
            status = case when v_completed then 'completed' else 'active' end,
            winner_id = case when v_completed then v_game.setter_id else winner_id end,
            completed_at = case when v_completed then now() else completed_at end,
            current_turn = case when v_completed then null else v_game.setter_id end,
            turn_phase = case when v_completed then 'complete' else 'set' end,
            current_trick_name = null
        where id = p_game_id;
      else
        update public.skate_games
        set opponent_letters = v_new_letters,
            status = case when v_completed then 'completed' else 'active' end,
            winner_id = case when v_completed then v_game.setter_id else winner_id end,
            completed_at = case when v_completed then now() else completed_at end,
            current_turn = case when v_completed then null else v_game.setter_id end,
            turn_phase = case when v_completed then 'complete' else 'set' end,
            current_trick_name = null
        where id = p_game_id;
      end if;
    end if;
  else
    raise exception 'This game is complete';
  end if;

  select * into v_game from public.skate_games where id = p_game_id;

  return jsonb_build_object(
    'game_id', v_game.id,
    'status', v_game.status,
    'turn_phase', v_game.turn_phase,
    'current_turn', v_game.current_turn,
    'setter_id', v_game.setter_id,
    'current_trick_name', v_game.current_trick_name,
    'challenger_letters', coalesce(v_game.challenger_letters, ''),
    'opponent_letters', coalesce(v_game.opponent_letters, ''),
    'winner_id', v_game.winner_id,
    'letter_awarded', v_letter
  );
end;
$$;

revoke insert, update, delete on public.skate_games from anon, authenticated;
revoke insert, update, delete on public.skate_game_turns from anon, authenticated;

grant select on public.skate_games to authenticated;
grant select on public.skate_game_turns to authenticated;
grant execute on function public.create_skate_game(uuid) to authenticated, service_role;
grant execute on function public.submit_skate_game_turn(uuid, text, boolean, uuid) to authenticated, service_role;
