-- Keep the verified Passport-stamp trigger internal to the database/service role.
revoke execute on function public.award_passport_stamp_from_verified_checkin() from anon, authenticated;
grant execute on function public.award_passport_stamp_from_verified_checkin() to service_role;

-- Avoid per-row auth function evaluation in hot RLS policies while preserving behavior.
alter policy "Users can view their rate limit status" on public.api_rate_limits
using (
  user_id = (select auth.uid())
  or coalesce((((select auth.jwt()) -> 'app_metadata') ->> 'role'), '') = 'admin'
);

alter policy "users_read_own_bingo" on public.bingo_cards
using (user_id = (select auth.uid()));

alter policy "bingo_votes_read_own" on public.bingo_cell_submission_votes
using (user_id = (select auth.uid()));

alter policy "bingo_rewards_read_own" on public.bingo_rewards
using (user_id = (select auth.uid()));

alter policy "bounties_read_actionable" on public.bounties
using (
  not coalesce(is_official, false)
  or (select auth.uid()) is null
  or not exists (
    select 1
    from public.bounty_submissions bs
    where bs.bounty_id = bounties.id
      and bs.user_id = (select auth.uid())
      and bs.status = any (array['PENDING'::text, 'APPROVED'::text])
  )
);

alter policy "qr_trick_submissions_view_participants" on public.qr_trick_submissions
using (
  finder_id = (select auth.uid())
  or exists (
    select 1
    from public.qr_codes q
    where q.id = qr_trick_submissions.qr_id
      and q.purchased_by = (select auth.uid())
  )
);

alter policy "spot_claim_submission_votes_read_own" on public.spot_claim_submission_votes
using (user_id = (select auth.uid()));

alter policy "Admins can view suspicious locations" on public.suspicious_locations
using (coalesce((((select auth.jwt()) -> 'app_metadata') ->> 'role'), '') = 'admin');

alter policy "Admins can update report status" on public.user_reports
using (coalesce((((select auth.jwt()) -> 'app_metadata') ->> 'role'), '') = 'admin')
with check (coalesce((((select auth.jwt()) -> 'app_metadata') ->> 'role'), '') = 'admin');

alter policy "Users can view their own reports" on public.user_reports
using (
  reporter_id = (select auth.uid())
  or reported_user_id = (select auth.uid())
  or coalesce((((select auth.jwt()) -> 'app_metadata') ->> 'role'), '') = 'admin'
);

-- users_manage_own_likes already provides the same SELECT predicate via ALL.
drop policy if exists "skatetv_likes_read_own" on public.skatetv_likes;
