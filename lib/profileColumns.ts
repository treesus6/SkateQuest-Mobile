// Public profile fields only. Keep explicit: SELECT * fails once sensitive
// columns are restricted, including on the signed-in user's own profile.
export const PUBLIC_PROFILE_SELECT =
  'id,username,display_name,avatar_url,bio,home_park_id,city,state,xp,level,parks_visited,challenges_completed,tricks_landed,total_sessions,stance,skill_level,is_public,created_at,updated_at,unlocked_tricks,completed_challenges,battle_pass_level,battle_pass_xp,charity_points,total_hours_skated,current_streak,longest_streak,last_active_date,daily_streak,last_daily_challenge';
