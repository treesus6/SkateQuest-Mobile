-- Keep SKATE game mutation RPCs callable only by signed-in users and trusted server roles.
-- These functions are SECURITY DEFINER, so PUBLIC/anon EXECUTE would expose privileged writes.

revoke execute on function public.create_skate_game(uuid) from public, anon;
revoke execute on function public.submit_skate_game_turn(uuid, text, boolean, uuid) from public, anon;

grant execute on function public.create_skate_game(uuid) to authenticated, service_role;
grant execute on function public.submit_skate_game_turn(uuid, text, boolean, uuid) to authenticated, service_role;
