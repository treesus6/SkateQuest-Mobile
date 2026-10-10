-- Preserve the production Supabase migration ledger before the 2026-09-11
-- history alignment. This table is an internal audit/rollback snapshot only.
-- It does not change application tables, user data, auth, storage, or RLS.

create table if not exists supabase_migrations.schema_migrations_backup_20260911
  (like supabase_migrations.schema_migrations including all);

insert into supabase_migrations.schema_migrations_backup_20260911
select * from supabase_migrations.schema_migrations
on conflict (version) do nothing;
