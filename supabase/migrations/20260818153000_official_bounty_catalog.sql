-- SkateQuest-authored game challenges are real product content, not fake user activity.
-- They are explicitly marked official and use the same video + Judge's Booth flow as community bounties.

ALTER TABLE public.bounties
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS official_key text,
  ADD COLUMN IF NOT EXISTS difficulty text CHECK (difficulty IN ('beginner','intermediate','advanced','expert'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_bounties_official_key
  ON public.bounties(official_key)
  WHERE official_key IS NOT NULL;

INSERT INTO public.bounties
  (official_key, is_official, difficulty, trick_name, description, xp_reward, status, expires_at, created_by, crew_id, park_id, park_name)
VALUES
  ('official-ollie', true, 'beginner', 'Ollie', 'Land a clean ollie and roll away under control.', 100, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-fakie-ollie', true, 'beginner', 'Fakie Ollie', 'Ride fakie, pop an ollie, and roll away fakie.', 125, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-pop-shove', true, 'beginner', 'Pop Shove-it', 'Land a popped backside shove-it with both feet on the bolts.', 150, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-fs-180', true, 'beginner', 'Frontside 180', 'Land a frontside 180 and ride away clean.', 150, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-bs-180', true, 'beginner', 'Backside 180', 'Land a backside 180 and ride away clean.', 175, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-manual-10', true, 'beginner', 'Manual', 'Hold a manual for at least 10 feet without scraping the tail.', 175, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-nose-manual-6', true, 'intermediate', 'Nose Manual', 'Hold a nose manual for at least 6 feet and ride away.', 250, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-boneless', true, 'beginner', 'Boneless', 'Land a boneless with a clear foot plant and clean roll-away.', 125, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-no-comply-180', true, 'beginner', 'No Comply 180', 'Land a no-comply 180 and keep rolling.', 175, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-kickflip', true, 'intermediate', 'Kickflip', 'Land a clean kickflip with a full flip and controlled roll-away.', 300, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-heelflip', true, 'intermediate', 'Heelflip', 'Land a clean heelflip and roll away with both feet on.', 325, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-varial-kickflip', true, 'intermediate', 'Varial Kickflip', 'Land a full varial kickflip and ride away.', 375, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-fs-shove', true, 'intermediate', 'Frontside Pop Shove-it', 'Pop a frontside shove-it, catch it, and ride away.', 275, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-halfcab', true, 'intermediate', 'Half Cab', 'Land a fakie backside 180 with a clean roll-away.', 225, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-bigspin', true, 'intermediate', 'Bigspin', 'Land a backside bigspin with full board rotation.', 450, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-fs-bigspin', true, 'advanced', 'Frontside Bigspin', 'Land a frontside bigspin and ride away clean.', 600, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-5050', true, 'beginner', '50-50 Grind', 'Grind both trucks on a curb, ledge, or rail and roll away.', 225, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-5-0', true, 'intermediate', '5-0 Grind', 'Lock into a 5-0 grind and exit clean.', 350, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-nosegrind', true, 'advanced', 'Nosegrind', 'Lock the front truck into a nosegrind and ride away.', 550, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-crooked', true, 'advanced', 'Crooked Grind', 'Lock a crooked grind on a ledge or rail and exit clean.', 650, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-smith', true, 'advanced', 'Smith Grind', 'Lock into a proper smith grind and roll away.', 650, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-feeble', true, 'advanced', 'Feeble Grind', 'Land a proper feeble grind on a rail or ledge and ride away.', 700, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-boardslide', true, 'intermediate', 'Boardslide', 'Slide the center of the deck on a rail or ledge and roll away.', 325, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-fs-boardslide', true, 'intermediate', 'Frontside Boardslide', 'Land a frontside boardslide and ride away clean.', 375, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-noseslide', true, 'intermediate', 'Noseslide', 'Lock a noseslide and come out clean.', 325, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-tailslide', true, 'advanced', 'Tailslide', 'Lock a tailslide, slide it, and roll away.', 550, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-bluntslide', true, 'expert', 'Bluntslide', 'Land a proper bluntslide and exit clean.', 1000, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-tre-flip', true, 'advanced', 'Tre Flip (360 Flip)', 'Land a full 360 flip and roll away clean.', 750, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-hardflip', true, 'advanced', 'Hardflip', 'Land a hardflip with full rotation and a clean roll-away.', 800, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-inward-heel', true, 'advanced', 'Inward Heelflip', 'Land an inward heelflip and roll away controlled.', 850, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-fs-flip', true, 'advanced', 'Frontside Flip', 'Land a frontside 180 kickflip and ride away.', 650, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-bs-flip', true, 'advanced', 'Backside Flip', 'Land a backside 180 kickflip and ride away.', 700, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-halfcab-flip', true, 'advanced', 'Half Cab Kickflip', 'Land a fakie backside 180 kickflip and ride away.', 650, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-nollie', true, 'intermediate', 'Nollie', 'Pop a clean nollie and roll away.', 250, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-nollie-kickflip', true, 'advanced', 'Nollie Kickflip', 'Land a nollie kickflip and ride away clean.', 750, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-switch-kickflip', true, 'advanced', 'Switch Kickflip', 'Land a switch kickflip and ride away switch.', 800, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-impossible', true, 'expert', 'Impossible', 'Wrap the board around the back foot, land it, and roll away.', 950, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-kickflip-5050', true, 'expert', 'Kickflip 50-50', 'Kickflip into a 50-50 grind and ride away.', 1100, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-kickflip-boardslide', true, 'expert', 'Kickflip Boardslide', 'Kickflip into a boardslide and exit clean.', 1200, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL),
  ('official-line-3', true, 'intermediate', 'Three-Trick Line', 'Film one continuous line with three landed tricks and no cuts.', 500, 'open', now() + interval '365 days', NULL, NULL, NULL, NULL)
ON CONFLICT (official_key) WHERE official_key IS NOT NULL DO UPDATE SET
  is_official = EXCLUDED.is_official,
  difficulty = EXCLUDED.difficulty,
  trick_name = EXCLUDED.trick_name,
  description = EXCLUDED.description,
  xp_reward = EXCLUDED.xp_reward,
  status = CASE WHEN public.bounties.status = 'claimed' THEN public.bounties.status ELSE 'open' END,
  expires_at = CASE WHEN public.bounties.status = 'claimed' THEN public.bounties.expires_at ELSE now() + interval '365 days' END;
