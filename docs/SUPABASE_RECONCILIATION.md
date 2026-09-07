# Supabase Reconciliation

Updated: 2026-09-07

Project: `hreeuqdgrwvnxquxohod` (`Sk8_quest`, healthy, PostgreSQL 17)

## Current verified state

Read-only production inspection confirmed:

- 197 production migration-history entries.
- 180 local SQL migration files.
- `20260831233400_link_spot_conditions_reporters_to_profiles` is recorded remotely.
- `spot_conditions_reported_by_profiles_fkey` exists and points `spot_conditions.reported_by` to `profiles.id` with `ON DELETE SET NULL`.
- Core profiles, spots, conditions, media, sessions, challenges, games, and crew tables inspected have RLS enabled.
- `auth.users` has the `on_auth_user_created` trigger calling `handle_new_user()`.
- Storage buckets exist for `quest-proofs`, `user-avatars`, `spot-photos`, and `skatetv-clips`, with MIME and size limits.

The earlier claim that the spot-condition relationship migration was unapplied is stale. The relationship is live. The blocker is reproducible migration history.

## Discrepancies

Comparison by recorded version:

- 108 production versions are not represented by the same local version.
- 91 local versions are not represented by the same production version.
- 54 of those pairs have the same migration name but different timestamps.
- 39 production migration names have no exact semantic-name match locally.
- 22 local migration names have no exact semantic-name match remotely.

This pattern indicates that many changes were applied or pulled under new timestamps and that several production-only repair migrations were never committed under their remote identities.

## Safe reconciliation procedure

Do not run `db reset`, delete migration rows, replay all local migrations against production, or rename files speculatively.

1. Create a database backup or confirm a current recoverable Supabase backup.
2. Link a clean checkout to the production project using an authorized Supabase CLI session.
3. Export the production schema and migration list read-only.
4. Diff the production schema against a fresh local database built from the repository migrations.
5. For each remote-only entry, identify the exact SQL body or the later migration that supersedes it.
6. For each local-only entry, prove whether its intended schema effect is already present in production.
7. Commit missing historical SQL under its production-recorded version when the body can be proven.
8. Use migration-history repair only for entries whose applied schema effect is proven identical. Record the old version, new version, hash/equivalence evidence, and reviewer.
9. Run a fresh local reset from zero and compare the final schema again.
10. Only then consider applying a new forward-only reconciliation migration for genuine schema differences.

## Suggested commands

Discover the installed CLI syntax first:

```bash
supabase --version
supabase migration --help
supabase db --help
```

Then, from a clean authorized checkout, use the currently supported equivalents of:

```bash
supabase link --project-ref hreeuqdgrwvnxquxohod
supabase migration list
supabase db pull production-schema-snapshot
supabase db reset --local
supabase db diff --linked
supabase db advisors
```

`db reset` above is local only. Never point a reset command at production.

## Verification queries

After reconciliation, verify without changing data:

```sql
select version, name
from supabase_migrations.schema_migrations
order by version;

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conname = 'spot_conditions_reported_by_profiles_fkey';

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
```

Run read-only application checks for spot detail reporter attribution, session RSVP, profile creation, media ownership, and server-managed rewards.

## Rollback concerns

- Migration-history repair changes bookkeeping, not schema; an incorrect repair can make future deploys silently skip required SQL.
- Replaying historical DDL can alter policies, grants, triggers, and functions even when tables already exist.
- Retimestamped migrations may not be byte-identical despite sharing a name.
- Storage policy mistakes can expose or orphan user media.
- PostGIS objects must not be moved or altered as part of ordinary advisor cleanup.

No production mutation was executed during this audit.
