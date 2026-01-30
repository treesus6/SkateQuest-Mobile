-- ============================================
-- SkateQuest Security Fixes
-- Fix SECURITY DEFINER views and enable RLS
-- ============================================

-- 1. Fix the SECURITY DEFINER view
-- This ensures the view runs with the permissions of the caller, not the definer
ALTER VIEW public.city_war_stats SET (security_invoker = true);

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.daily_tricks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_wars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_war_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reported_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- NOTE: spatial_ref_sys is a PostGIS system table.
-- It should NOT have public RLS policies - only service_role should access it.
-- If you need to enable RLS on it, use this (but typically leave it alone):
-- ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (idempotent migrations)
-- ============================================

-- Daily tricks policies
DROP POLICY IF EXISTS "Anyone can view daily tricks" ON public.daily_tricks;
DROP POLICY IF EXISTS "Users can insert their own tricks" ON public.daily_tricks;
DROP POLICY IF EXISTS "Users can update their own tricks" ON public.daily_tricks;
DROP POLICY IF EXISTS "Users can delete their own tricks" ON public.daily_tricks;

-- Blocked users policies
DROP POLICY IF EXISTS "Users can view their own blocks" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can block others" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can delete their own blocks" ON public.blocked_users;

-- Crew wars policies
DROP POLICY IF EXISTS "Anyone can view crew wars" ON public.crew_wars;
DROP POLICY IF EXISTS "Crew admins can create wars" ON public.crew_wars;
DROP POLICY IF EXISTS "Crew admins can update their wars" ON public.crew_wars;

-- Crew war rankings policies
DROP POLICY IF EXISTS "Anyone can view rankings" ON public.crew_war_rankings;
DROP POLICY IF EXISTS "System can manage rankings" ON public.crew_war_rankings;

-- Reported content policies
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reported_content;
DROP POLICY IF EXISTS "Users can report content" ON public.reported_content;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reported_content;
DROP POLICY IF EXISTS "Admins can update reports" ON public.reported_content;

-- ============================================
-- DAILY TRICKS POLICIES
-- ============================================

-- Anyone can view daily tricks (community feed)
CREATE POLICY "Anyone can view daily tricks"
ON public.daily_tricks
FOR SELECT
TO public
USING (true);

-- Users can only insert their own tricks
CREATE POLICY "Users can insert their own tricks"
ON public.daily_tricks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own tricks
CREATE POLICY "Users can update their own tricks"
ON public.daily_tricks
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own tricks
CREATE POLICY "Users can delete their own tricks"
ON public.daily_tricks
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- BLOCKED USERS POLICIES
-- ============================================

-- Only the blocker can see their blocks
CREATE POLICY "Users can view their own blocks"
ON public.blocked_users
FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id);

-- Users can block others (but not themselves)
CREATE POLICY "Users can block others"
ON public.blocked_users
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = blocker_id
    AND auth.uid() != blocked_id
);

-- Users can unblock (delete their own blocks)
CREATE POLICY "Users can delete their own blocks"
ON public.blocked_users
FOR DELETE
TO authenticated
USING (auth.uid() = blocker_id);

-- ============================================
-- CREW WARS POLICIES
-- ============================================

-- Anyone can view crew wars (leaderboards are public)
CREATE POLICY "Anyone can view crew wars"
ON public.crew_wars
FOR SELECT
TO public
USING (true);

-- Only crew admins/leaders can create wars for their crew
-- Assumes crew_wars has challenger_crew_id column and crew_members has role column
CREATE POLICY "Crew admins can create wars"
ON public.crew_wars
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM crew_members
        WHERE crew_members.user_id = auth.uid()
        AND crew_members.crew_id = challenger_crew_id
        AND crew_members.role IN ('admin', 'leader', 'owner')
    )
);

-- Crew admins can update wars they created
CREATE POLICY "Crew admins can update their wars"
ON public.crew_wars
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM crew_members
        WHERE crew_members.user_id = auth.uid()
        AND crew_members.crew_id = challenger_crew_id
        AND crew_members.role IN ('admin', 'leader', 'owner')
    )
);

-- ============================================
-- CREW WAR RANKINGS POLICIES
-- ============================================

-- Anyone can view rankings (public leaderboard)
CREATE POLICY "Anyone can view rankings"
ON public.crew_war_rankings
FOR SELECT
TO public
USING (true);

-- Rankings are managed by triggers/functions, not direct user inserts
-- Service role bypasses RLS, so no INSERT/UPDATE policies needed for users
-- If you need authenticated users to contribute (e.g., submit scores):
-- CREATE POLICY "Crew members can submit scores"
-- ON public.crew_war_rankings
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (
--     EXISTS (
--         SELECT 1 FROM crew_members
--         WHERE crew_members.user_id = auth.uid()
--         AND crew_members.crew_id = crew_war_rankings.crew_id
--     )
-- );

-- ============================================
-- REPORTED CONTENT POLICIES
-- ============================================

-- Users can view reports they submitted
CREATE POLICY "Users can view their own reports"
ON public.reported_content
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

-- Users can report content
CREATE POLICY "Users can report content"
ON public.reported_content
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = reporter_id
    AND auth.uid() != reported_user_id  -- Can't report yourself
);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.reported_content
FOR SELECT
TO authenticated
USING (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

-- Admins can update report status (resolve, dismiss, etc.)
CREATE POLICY "Admins can update reports"
ON public.reported_content
FOR UPDATE
TO authenticated
USING (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Daily tricks indexes
CREATE INDEX IF NOT EXISTS idx_daily_tricks_user_id
ON public.daily_tricks(user_id);

CREATE INDEX IF NOT EXISTS idx_daily_tricks_created_at
ON public.daily_tricks(created_at DESC);

-- Blocked users indexes
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id
ON public.blocked_users(blocker_id);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id
ON public.blocked_users(blocked_id);

-- Unique constraint to prevent duplicate blocks
CREATE UNIQUE INDEX IF NOT EXISTS idx_blocked_users_unique
ON public.blocked_users(blocker_id, blocked_id);

-- Crew wars indexes
CREATE INDEX IF NOT EXISTS idx_crew_wars_challenger_crew
ON public.crew_wars(challenger_crew_id);

CREATE INDEX IF NOT EXISTS idx_crew_wars_defender_crew
ON public.crew_wars(defender_crew_id);

CREATE INDEX IF NOT EXISTS idx_crew_wars_status
ON public.crew_wars(status);

-- Crew war rankings indexes
CREATE INDEX IF NOT EXISTS idx_crew_war_rankings_crew_id
ON public.crew_war_rankings(crew_id);

CREATE INDEX IF NOT EXISTS idx_crew_war_rankings_war_id
ON public.crew_war_rankings(war_id);

-- Reported content indexes
CREATE INDEX IF NOT EXISTS idx_reported_content_reporter
ON public.reported_content(reporter_id);

CREATE INDEX IF NOT EXISTS idx_reported_content_status
ON public.reported_content(status);

CREATE INDEX IF NOT EXISTS idx_reported_content_created
ON public.reported_content(created_at DESC);

-- ============================================
-- HELPER FUNCTION: Check if user is blocked
-- ============================================

CREATE OR REPLACE FUNCTION is_user_blocked(
    p_user_id UUID,
    p_blocked_by UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocked_users
        WHERE blocker_id = p_blocked_by
        AND blocked_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_user_blocked(UUID, UUID) TO authenticated;

-- ============================================
-- VERIFICATION QUERIES (for testing)
-- ============================================

-- Uncomment to verify RLS is enabled:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('daily_tricks', 'crew_wars', 'crew_war_rankings', 'reported_content', 'blocked_users');

-- Uncomment to verify policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public';

SELECT 'Security fixes applied successfully!' as status;
