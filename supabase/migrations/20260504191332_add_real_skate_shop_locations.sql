
-- Add location columns to skate_shops if missing
ALTER TABLE public.skate_shops ADD COLUMN IF NOT EXISTS shop_name_full text;
ALTER TABLE public.skate_shops ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.skate_shops ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.skate_shops ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.skate_shops ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.skate_shops ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.skate_shops ADD COLUMN IF NOT EXISTS country text DEFAULT 'US';
ALTER TABLE public.skate_shops ADD COLUMN IF NOT EXISTS google_place_id text;
ALTER TABLE public.skate_shops ADD COLUMN IF NOT EXISTS rating numeric;

-- Create a proper shops table for map display
CREATE TABLE IF NOT EXISTS public.skate_shop_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name text NOT NULL,
  address text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  phone text,
  website text,
  city text,
  state text,
  country text DEFAULT 'US',
  description text,
  google_place_id text,
  rating numeric,
  verified boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.skate_shop_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_view_shop_locations" ON public.skate_shop_locations FOR SELECT TO authenticated USING (true);

-- Seed with real Portland shops
INSERT INTO public.skate_shop_locations (shop_name, address, latitude, longitude, phone, website, city, state, description, google_place_id, rating) VALUES
  ('Cal''s Pharmacy Skateboards', '1400 E Burnside St, Portland, OR 97214', 45.5227327, -122.6513909, '503-233-1237', 'https://instagram.com/calspharmacy', 'Portland', 'OR', 'Legendary Portland skate shop. Core shop run by skaters. Since 1985.', 'ChIJUzJzK6WglVQRoSJnJArZS5k', 4.6),
  ('Tactics Portland', '901 NW Davis St, Portland, OR 97209', 45.5246021, -122.6803953, '503-224-0982', 'https://tactics.com', 'Portland', 'OR', 'Full service skate and snowboard shop in the Pearl District.', 'ChIJywgbrDsLlVQRyhdCRlYBMNo', 4.7),
  ('Cal Skate Skateboards', '210 NW 6th Ave, Portland, OR 97209', 45.52493, -122.6763702, '503-248-0495', 'https://calsk8.com', 'Portland', 'OR', 'Oldest skate shop in the world still operating. Established 1976.', 'ChIJnSPb_QAKlVQRKVQMD0DPX9A', 4.8),
  ('Commonwealth Skateboarding', '1425 SE 20th Ave, Portland, OR 97214', 45.512475, -122.6456972, '503-208-2080', 'https://cwskate.com', 'Portland', 'OR', 'Indoor concrete skatepark + full core skate shop. Bowl, mini ramp, street section.', 'ChIJVz5nP5mglVQRJU4CHfdHLUU', 4.9),
  ('Daddies Board Shop', '5909 NE 80th Ave, Portland, OR 97218', 45.5656393, -122.5810982, '503-281-5123', 'https://daddiesboardshop.com', 'Portland', 'OR', 'Large selection skate shop. Great for complete builds and parts.', 'ChIJW7_zz6mmlVQRi5Rf5tDbEyQ', 4.3),
  ('Five Stride Skate Shop', '4515 NE MLK Jr Blvd, Portland, OR 97211', 45.5557514, -122.6618651, '503-265-8170', null, 'Portland', 'OR', 'Core skate shop on MLK. Knowledgeable staff, community vibes.', 'ChIJW_phPEKhlVQRJUeywp7SL5U', 4.8),
  ('Substunce Skate Shop', '9950 SW Beaverton Hillsdale Hwy, Beaverton, OR 97005', 45.4861914, -122.7791744, '503-746-5809', null, 'Beaverton', 'OR', 'By skaters for skaters. Owner-operated core shop.', 'ChIJp0sjtbwOlVQRAe8DKbP3ewg', 4.9)
ON CONFLICT DO NOTHING;


