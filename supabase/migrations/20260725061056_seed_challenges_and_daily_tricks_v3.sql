INSERT INTO challenges (trick, title, description, challenge_type, mission_category, difficulty, xp_reward, requirement_type, requirement_value, is_auto_generated, template_key, active) VALUES
('Ollie','First Pop','Land your first clean ollie. Everyone starts here.','DAILY','trick',1,50,'trick_land',1,true,'first_pop',true),
('Kickflip','Flip It','Land a kickflip and post proof.','DAILY','trick',2,100,'trick_land',1,true,'flip_it',true),
('Manual','Manny Master','Hold a manual for at least 3 seconds.','DAILY','trick',1,60,'duration',3,true,'manny_master',true),
('50-50 Grind','Grind Time','Land a clean 50-50 on any ledge or rail.','DAILY','trick',2,100,'trick_land',1,true,'grind_time',true),
('Tre Flip (360 Flip)','Tre Flip Attempt','Post a clip of you going for a tre flip — landed or not, effort counts.','WEEKLY','trick',3,150,'clip_post',1,true,'tre_attempt',true),
('Any','Park Hopper','Check into 5 different skateparks in the app.','WEEKLY','exploration',1,150,'park_visits',5,true,'park_hopper',true),
('Any','Explorer','Check into 10 different skateparks.','WEEKLY','exploration',2,300,'park_visits',10,true,'explorer',true),
('Any','Crew Up','Join or create a crew.','DAILY','community',1,75,'crew_join',1,true,'crew_up',true),
('Any','First Clip','Upload your first video clip to the app.','DAILY','progression',1,75,'clip_post',1,true,'first_clip',true),
('Any','Session Starter','Log a session at any park for at least 30 minutes.','DAILY','exploration',1,80,'session_duration',30,true,'session_starter',true)
ON CONFLICT DO NOTHING;

INSERT INTO daily_tricks (trick_name, difficulty, description, xp_reward, date, frozen)
SELECT td.name, td.difficulty, td.description, td.xp_reward, (CURRENT_DATE + (n || ' days')::interval)::date, false
FROM generate_series(0,29) AS n
JOIN LATERAL (SELECT name, difficulty, description, xp_reward FROM trick_dictionary ORDER BY random() LIMIT 1) td ON true
ON CONFLICT DO NOTHING;

