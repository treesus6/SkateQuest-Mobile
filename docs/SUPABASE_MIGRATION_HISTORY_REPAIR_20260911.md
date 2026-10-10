# Supabase migration history alignment - 2026-09-11

Project: `hreeuqdgrwvnxquxohod`

## Why this was needed

The production migration ledger and `supabase/migrations` had diverged even though the live schema contained the expected application changes.

Before repair:

- 76 versions existed only in the repository.
- 93 versions existed only in the production migration ledger.
- Supabase merge checks failed with `Remote migration versions not found in local migrations directory.`

The drift came from migrations being applied under different timestamps/names than the later source-controlled equivalents. Supabase compares migration timestamps, so equivalent schema intent does not make the histories match.

## Safety snapshot

Before changing migration-history rows, migration `20260911104833_backup_migration_history_before_alignment.sql` created:

`supabase_migrations.schema_migrations_backup_20260911`

The snapshot contains 197 pre-repair ledger rows, including the full original migration metadata stored by Supabase.

## Repair performed

Only `supabase_migrations.schema_migrations` bookkeeping was aligned. No application migration SQL was re-executed during the history repair, and no application tables, auth users, storage objects, user data, RLS policies, or feature records were deleted by the repair.

- 93 remote-only timestamp rows were marked reverted/removed from the active history.
- 76 source-controlled timestamp rows were marked applied in the active history.
- The backup migration itself is present both remotely and in source control.

After repair:

- Active migration rows: 181
- Remote-only versions vs source control: 0
- Local-only versions vs production: 0
- `spot_conditions_reported_by_profiles_fkey` remains present in production and points `spot_conditions.reported_by` to `profiles.id` with `ON DELETE SET NULL`.

## Rules going forward

1. Never rename or re-timestamp a migration after it has been applied to production.
2. Add new schema work as a new timestamped migration.
3. Use `supabase migration list` before pushing database changes.
4. If history diverges, investigate the live schema first. Do not blindly replay old migrations.
5. Repair migration history only when the schema state is already known to be correct and preserve a rollback snapshot first.

## Rollback note

If the history alignment itself ever needs to be reversed, the pre-repair rows are preserved in `supabase_migrations.schema_migrations_backup_20260911`. Restoring that snapshot changes migration bookkeeping only; it should be done deliberately and followed by a fresh migration-list/schema verification.
