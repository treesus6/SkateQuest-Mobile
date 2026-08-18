update public.daily_quests
set active = true, frozen = false
where requirement_type in ('checkins','trick_count','new_spot','challenge_complete','spot_rating');
