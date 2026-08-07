INSERT INTO badges (name, description, rarity, requirement_type, requirement_value) VALUES
('Pioneer','First ever check-in at a skatepark. You put it on the map.','rare','first_checkin',1),
('Local Legend','Most all-time XP earned at a single park. You run this spot.','epic','park_top_xp',1),
('King of the Park','Most XP logged at a park this week. Crown resets Mondays.','uncommon','park_weekly_top',1),
('Dawn Patrol','Checked in before 7am. First light, first tricks.','uncommon','dawn_checkin',1),
('Night Owl','Checked in after 9pm. Lights or no lights, you skate anyway.','uncommon','night_checkin',1),
('Rain Skater','Checked in during rain. PNW built different.','rare','rain_checkin',1),
('Line Builder','Landed a 3+ trick combo line in one run.','rare','combo_line',3),
('Combo King','Landed a 5+ trick combo line in one run.','epic','combo_line',5)
ON CONFLICT DO NOTHING;

