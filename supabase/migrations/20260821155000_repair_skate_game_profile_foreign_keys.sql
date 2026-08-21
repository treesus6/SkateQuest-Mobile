alter table public.skate_game_turns drop constraint if exists skate_game_turns_player_id_fkey;
alter table public.skate_games drop constraint if exists skate_games_challenger_id_fkey;
alter table public.skate_games drop constraint if exists skate_games_opponent_id_fkey;
alter table public.skate_games drop constraint if exists skate_games_current_turn_fkey;
alter table public.skate_games drop constraint if exists skate_games_winner_id_fkey;

alter table public.skate_games
  add constraint skate_games_challenger_id_fkey foreign key (challenger_id) references public.profiles(id) on delete cascade;
alter table public.skate_games
  add constraint skate_games_opponent_id_fkey foreign key (opponent_id) references public.profiles(id) on delete cascade;
alter table public.skate_games
  add constraint skate_games_current_turn_fkey foreign key (current_turn) references public.profiles(id) on delete set null;
alter table public.skate_games
  add constraint skate_games_winner_id_fkey foreign key (winner_id) references public.profiles(id) on delete set null;
alter table public.skate_game_turns
  add constraint skate_game_turns_player_id_fkey foreign key (player_id) references public.profiles(id) on delete cascade;
