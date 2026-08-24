-- The live schema already has equivalent indexes named
-- idx_skate_sessions_time and idx_skate_sessions_creator.
drop index if exists public.skate_sessions_scheduled_time_idx;
drop index if exists public.skate_sessions_creator_id_idx;
