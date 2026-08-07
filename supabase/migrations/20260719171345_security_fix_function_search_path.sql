do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    begin
      execute format('alter function %s set search_path = public, pg_temp', r.sig);
    exception when insufficient_privilege then
      raise notice 'skipped % (not owner)', r.sig;
    end;
  end loop;
end $$;

