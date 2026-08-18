-- Media upload feed cards are real activity, but uploading alone does not award
-- XP. Remove old display-only XP values from those cards.
update public.activity_feed
set xp_earned = 0
where activity_type = 'media_uploaded'
  and coalesce(xp_earned, 0) <> 0;
