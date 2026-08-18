-- Bust risk must come from an actual report. Do not assign an invented 20%
-- when a skater only reports surface/crowd conditions.
alter table public.spot_conditions
  alter column bust_risk drop default;
