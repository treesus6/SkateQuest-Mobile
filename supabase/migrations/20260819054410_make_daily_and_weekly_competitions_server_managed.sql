do $$
declare r record;
begin
  for r in
    select c.oid::regclass::text as relname
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r'
      and (c.relname like 'daily_quest%' or c.relname like 'trick_of_week%')
  loop
    execute format('revoke insert, update, delete on %s from anon, authenticated',r.relname);
    execute format('grant select on %s to authenticated',r.relname);
  end loop;
end $$;
