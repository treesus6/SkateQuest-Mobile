-- Wrap bare auth.<fn>() calls in RLS policies with (select auth.<fn>()) so
-- Postgres evaluates them once per query instead of once per row.
-- Pure performance fix -- logically identical to the original policies.

ALTER POLICY "Users can create activities" ON public.activities
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "users_manage_own_coach" ON public.ai_coach_sessions
    USING ((user_id = (select auth.uid())));


