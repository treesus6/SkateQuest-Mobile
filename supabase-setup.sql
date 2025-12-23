-- Supabase RPC Functions Setup for SkateQuest Mobile
-- Run these commands in your Supabase SQL Editor (Database > SQL Editor)
-- These functions enable atomic operations for the app

-- ============================================================
-- 1. Generic Field Increment Function
-- ============================================================
-- This function allows updateDoc() to atomically increment any numeric field
-- Used by the increment() helper in supabase-client.js

CREATE OR REPLACE FUNCTION increment_fields(
    table_name TEXT,
    record_id UUID,
    increments JSONB
)
RETURNS void AS $$
DECLARE
    field_name TEXT;
    field_value NUMERIC;
    sql_query TEXT;
BEGIN
    -- Build and execute UPDATE statement for each field to increment
    FOR field_name, field_value IN SELECT * FROM jsonb_each_text(increments)
    LOOP
        sql_query := format(
            'UPDATE %I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
            table_name,
            field_name,
            field_name
        );
        EXECUTE sql_query USING field_value::NUMERIC, record_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example usage:
-- SELECT increment_fields('profiles', 'user-uuid-here', '{"xp": 50, "spotsAdded": 1}'::jsonb);

-- ============================================================
-- 2. User XP Increment Function
-- ============================================================
-- Specialized function for incrementing user XP

CREATE OR REPLACE FUNCTION increment_xp(
    user_id UUID,
    amount INTEGER
)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + amount
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example usage:
-- SELECT increment_xp('user-uuid-here', 100);

-- ============================================================
-- 3. Crew XP Increment Function
-- ============================================================
-- Specialized function for incrementing crew total XP

CREATE OR REPLACE FUNCTION increment_crew_xp(
    crew_id UUID,
    amount INTEGER
)
RETURNS void AS $$
BEGIN
    UPDATE public.crews
    SET total_xp = COALESCE(total_xp, 0) + amount
    WHERE id = crew_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example usage:
-- SELECT increment_crew_xp('crew-uuid-here', 100);

-- ============================================================
-- Verification
-- ============================================================
-- After running these commands, verify they were created successfully:
--
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name IN ('increment_fields', 'increment_xp', 'increment_crew_xp');
--
-- You should see all three functions listed.
