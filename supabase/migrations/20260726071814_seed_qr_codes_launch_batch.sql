INSERT INTO qr_codes (code, status, xp_reward, trick_challenge, challenge_message, proof_required, expires_at) VALUES
('SQ-LURK-001','active',100,'Ollie','Found it. Now land an ollie right where you''re standing.',false, now() + interval '365 days'),
('SQ-LURK-002','active',100,'Kickflip','You found this one. Kickflip to claim it properly.',false, now() + interval '365 days'),
('SQ-LURK-003','active',150,'Manual','Roll away in a manual from this spot.',false, now() + interval '365 days'),
('SQ-LURK-004','active',100,'Pop Shove-it','Pop shove-it here and it''s yours.',false, now() + interval '365 days'),
('SQ-LURK-005','active',150,'Heelflip','Heelflip. Right here. Go.',false, now() + interval '365 days'),
('SQ-LURK-006','active',200,'50-50 Grind','Find something to grind and put a 50-50 on it.',false, now() + interval '365 days'),
('SQ-LURK-007','active',100,'Frontside 180','Frontside 180 out of wherever this was hiding.',false, now() + interval '365 days'),
('SQ-LURK-008','active',100,'Backside 180','Backside 180 to lock this in.',false, now() + interval '365 days'),
('SQ-LURK-009','active',200,'Boardslide','Boardslide something nearby. Anything counts.',false, now() + interval '365 days'),
('SQ-LURK-010','active',250,'Tre Flip (360 Flip)','Tre flip. Land it or don''t — you still found the code.',false, now() + interval '365 days'),
('SQ-LURK-011','active',150,'Nollie','Nollie out of this spot.',false, now() + interval '365 days'),
('SQ-LURK-012','active',200,'Varial Kickflip','Varial kickflip to claim it.',false, now() + interval '365 days'),
('SQ-LURK-013','active',150,'Nose Manual','Nose manual. Balance up.',false, now() + interval '365 days'),
('SQ-LURK-014','active',250,'Hardflip','Hardflip. Good luck.',false, now() + interval '365 days'),
('SQ-LURK-015','active',200,'Tailslide','Tailslide something here.',false, now() + interval '365 days'),
('SQ-LURK-016','active',100,'Shove-it','Simple shove-it and you''re good.',false, now() + interval '365 days'),
('SQ-LURK-017','active',300,'Smith Grind','Smith grind. Real one.',false, now() + interval '365 days'),
('SQ-LURK-018','active',150,'Boneless','Boneless. Old school, still counts.',false, now() + interval '365 days'),
('SQ-LURK-019','active',200,'Noseslide','Noseslide to claim.',false, now() + interval '365 days'),
('SQ-LURK-020','active',500,'Any','Golden code. Land anything you''re proud of and log it.',false, now() + interval '365 days')
ON CONFLICT DO NOTHING;

