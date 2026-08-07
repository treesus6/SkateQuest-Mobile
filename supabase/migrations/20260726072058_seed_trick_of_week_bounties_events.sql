-- Trick of the Week: 10 weeks out, Monday to Sunday
INSERT INTO trick_of_week (trick_name, description, week_start, week_end)
VALUES
('Kickflip','Post your cleanest kickflip. Style counts more than height.', date '2026-07-27', date '2026-08-02'),
('Frontside 180','Any frontside 180. Curb, flat, off something — your call.', date '2026-08-03', date '2026-08-09'),
('50-50 Grind','Longest 50-50 wins. Ledge, curb, rail, whatever you''ve got.', date '2026-08-10', date '2026-08-16'),
('Manual','Hold it as long as you can. Distance is the whole game this week.', date '2026-08-17', date '2026-08-23'),
('Heelflip','Heelflips only. Show us the ones that don''t hit your shin.', date '2026-08-24', date '2026-08-30'),
('Boardslide','First rail or hundredth, doesn''t matter. Get one on film.', date '2026-08-31', date '2026-09-06'),
('Pop Shove-it','Clean pop shove. No toe drag, no primo.', date '2026-09-07', date '2026-09-13'),
('Nollie','Nollie anything. Flat, off a curb, into a bank.', date '2026-09-14', date '2026-09-20'),
('Varial Kickflip','Varial flips. Post the make, not the twelve slams before it.', date '2026-09-21', date '2026-09-27'),
('Tre Flip (360 Flip)','Tre flip week. Attempts count too — post the progress.', date '2026-09-28', date '2026-10-04')
ON CONFLICT DO NOTHING;

-- Open bounties: not tied to a specific park, anyone anywhere can claim
INSERT INTO bounties (trick_name, description, xp_reward, status, expires_at) VALUES
('Ollie','First ollie on film. If you''re new, this one''s yours.',150,'open', now() + interval '90 days'),
('Kickflip','Land a kickflip and film it. Any spot, any surface.',250,'open', now() + interval '90 days'),
('Manual','Manual for 10 feet or more. Measure it however you want.',300,'open', now() + interval '90 days'),
('50-50 Grind','50-50 on anything that isn''t a curb.',350,'open', now() + interval '90 days'),
('Boardslide','Boardslide a real rail. Ledges don''t count for this one.',500,'open', now() + interval '90 days'),
('Tre Flip (360 Flip)','Tre flip, landed and rolled away. The big one.',1000,'open', now() + interval '90 days'),
('Any','Skate a spot nobody else on the map has checked into yet.',400,'open', now() + interval '90 days'),
('Any','Film a line — three tricks, no cuts, one take.',600,'open', now() + interval '90 days')
ON CONFLICT DO NOTHING;

-- Seasonal events on the real skate calendar
INSERT INTO seasonal_events (name, description, start_date, end_date, rewards) VALUES
('Summer Sessions',
 'Long days, dry ground. Check into as many parks as you can before the rain comes back.',
 timestamptz '2026-07-27 00:00:00+00', timestamptz '2026-08-31 23:59:59+00',
 '{"xp_multiplier": 1.5, "badge": "Summer Sessions"}'::jsonb),
('Back to Concrete',
 'School''s back, parks empty out during the day. Take advantage.',
 timestamptz '2026-09-01 00:00:00+00', timestamptz '2026-09-30 23:59:59+00',
 '{"xp_multiplier": 1.25, "badge": "Back to Concrete"}'::jsonb),
('Rain Season',
 'PNW winter. Covered spots, parking garages, and anyone still skating in the wet earns it.',
 timestamptz '2026-10-01 00:00:00+00', timestamptz '2027-03-31 23:59:59+00',
 '{"xp_multiplier": 2.0, "badge": "Rain Skater"}'::jsonb),
('Go Skateboarding Day',
 'June 21. Everybody skates. Check in anywhere and log something.',
 timestamptz '2027-06-21 00:00:00+00', timestamptz '2027-06-21 23:59:59+00',
 '{"xp_multiplier": 3.0, "badge": "Go Skateboarding Day"}'::jsonb)
ON CONFLICT DO NOTHING;

