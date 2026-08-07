
-- QR Geocaching: hidden trick challenges skaters find IRL
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                        TEXT UNIQUE NOT NULL,
  purchased_by                UUID REFERENCES public.users(id) ON DELETE SET NULL,
  purchaser_name              TEXT,
  purchase_price              NUMERIC(10,2) DEFAULT 0,
  status                      TEXT NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'found', 'expired', 'hidden')),
  hidden_at                   TIMESTAMPTZ,
  hidden_location_lat         DOUBLE PRECISION,
  hidden_location_lng         DOUBLE PRECISION,
  hidden_location_description TEXT,
  found_by                    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  found_by_name               TEXT,
  found_at                    TIMESTAMPTZ,
  xp_reward                   INTEGER NOT NULL DEFAULT 100,
  bonus_reward                TEXT,
  trick                       TEXT,           -- used by scanner screen
  trick_challenge             TEXT,           -- alias in types/index.ts
  challenge_message           TEXT,
  proof_required              BOOLEAN DEFAULT false,
  expires_at                  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can look up a QR code while scanning
CREATE POLICY "qr_codes_public_select"
  ON public.qr_codes FOR SELECT USING (true);

-- Auth users can place (create) QR codes
CREATE POLICY "qr_codes_auth_insert"
  ON public.qr_codes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Auth users can update (mark found, expire, etc.)
CREATE POLICY "qr_codes_auth_update"
  ON public.qr_codes FOR UPDATE USING (auth.uid() IS NOT NULL);


