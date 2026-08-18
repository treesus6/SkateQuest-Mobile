-- Remove legacy activity that was inserted by the old production seed migration.
-- This targets exact seed signatures only; genuine user-created bounties are not
-- deleted merely because they use the same trick name.

DELETE FROM public.bounties
WHERE status = 'open'
  AND park_name IS NULL
  AND (
    (trick_name = 'Ollie' AND description = 'First ollie on film. If you''re new, this one''s yours.' AND xp_reward = 150) OR
    (trick_name = 'Kickflip' AND description = 'Land a kickflip and film it. Any spot, any surface.' AND xp_reward = 250) OR
    (trick_name = 'Manual' AND description = 'Manual for 10 feet or more. Measure it however you want.' AND xp_reward = 300) OR
    (trick_name = '50-50 Grind' AND description = '50-50 on anything that isn''t a curb.' AND xp_reward = 350) OR
    (trick_name = 'Boardslide' AND description = 'Boardslide a real rail. Ledges don''t count for this one.' AND xp_reward = 500) OR
    (trick_name = 'Tre Flip (360 Flip)' AND description = 'Tre flip, landed and rolled away. The big one.' AND xp_reward = 1000) OR
    (trick_name = 'Any' AND description = 'Skate a spot nobody else on the map has checked into yet.' AND xp_reward = 400) OR
    (trick_name = 'Any' AND description = 'Film a line — three tricks, no cuts, one take.' AND xp_reward = 600)
  );

DELETE FROM public.trick_of_week
WHERE (trick_name, week_start, week_end) IN (
  ('Kickflip', date '2026-07-27', date '2026-08-02'),
  ('Frontside 180', date '2026-08-03', date '2026-08-09'),
  ('50-50 Grind', date '2026-08-10', date '2026-08-16'),
  ('Manual', date '2026-08-17', date '2026-08-23'),
  ('Heelflip', date '2026-08-24', date '2026-08-30'),
  ('Boardslide', date '2026-08-31', date '2026-09-06'),
  ('Pop Shove-it', date '2026-09-07', date '2026-09-13'),
  ('Nollie', date '2026-09-14', date '2026-09-20'),
  ('Varial Kickflip', date '2026-09-21', date '2026-09-27'),
  ('Tre Flip (360 Flip)', date '2026-09-28', date '2026-10-04')
);

DELETE FROM public.seasonal_events
WHERE (name, start_date, end_date) IN (
  ('Summer Sessions', timestamptz '2026-07-27 00:00:00+00', timestamptz '2026-08-31 23:59:59+00'),
  ('Back to Concrete', timestamptz '2026-09-01 00:00:00+00', timestamptz '2026-09-30 23:59:59+00'),
  ('Rain Season', timestamptz '2026-10-01 00:00:00+00', timestamptz '2027-03-31 23:59:59+00'),
  ('Go Skateboarding Day', timestamptz '2027-06-21 00:00:00+00', timestamptz '2027-06-21 23:59:59+00')
);
