-- Seeded shop rows were previously marked verified by default.
-- Verification now requires a current source confirming the shop and address.
alter table public.skate_shop_locations
  alter column verified set default false;

update public.skate_shop_locations
set verified = false;

delete from public.skate_shop_locations
where (shop_name = 'Cal''s Pharmacy Skateboards' and address = '1400 E Burnside St, Portland, OR 97214')
   or (shop_name = 'Five Stride Skate Shop' and address = '4515 NE MLK Jr Blvd, Portland, OR 97211');

update public.skate_shop_locations
set verified = true
where (shop_name = 'Cal Skate Skateboards' and address = '210 NW 6th Ave, Portland, OR 97209')
   or (shop_name = 'Tactics Portland' and address = '901 NW Davis St, Portland, OR 97209')
   or (shop_name = 'Commonwealth Skateboarding' and address = '1425 SE 20th Ave, Portland, OR 97214')
   or (shop_name = 'Daddies Board Shop' and address = '5909 NE 80th Ave, Portland, OR 97218')
   or (shop_name = 'Substunce Skate Shop' and address = '9950 SW Beaverton Hillsdale Hwy, Beaverton, OR 97005');
