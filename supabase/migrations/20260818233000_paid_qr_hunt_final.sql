-- Paid-only QR Hunt: $2 support purchase -> hide physical QR -> finder scans ->
-- lands required trick -> uploads proof -> hider approves -> 50 XP paid once.

CREATE TABLE IF NOT EXISTS public.qr_support_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded','canceled')),
  provider text,
  provider_payment_id text UNIQUE,
  provider_checkout_id text UNIQUE,
  purpose text NOT NULL DEFAULT 'skateboard_support_fund',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  refunded_at timestamptz
);
ALTER TABLE public.qr_support_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qr_support_purchases_read_own ON public.qr_support_purchases;
CREATE POLICY qr_support_purchases_read_own ON public.qr_support_purchases
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.qr_support_purchases FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.support_fund_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.qr_support_purchases(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'usd',
  entry_type text NOT NULL DEFAULT 'qr_support_purchase'
    CHECK (entry_type IN ('qr_support_purchase','refund','disbursement','adjustment')),
  purpose text NOT NULL DEFAULT 'skateboard_support_fund',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_fund_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS support_fund_ledger_read_own ON public.support_fund_ledger;
CREATE POLICY support_fund_ledger_read_own ON public.support_fund_ledger
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.support_fund_ledger FROM anon, authenticated;
DROP INDEX IF EXISTS support_fund_one_purchase_credit;
DROP INDEX IF EXISTS support_fund_one_refund_debit;
CREATE UNIQUE INDEX support_fund_one_purchase_credit
  ON public.support_fund_ledger(purchase_id) WHERE entry_type='qr_support_purchase';
CREATE UNIQUE INDEX support_fund_one_refund_debit
  ON public.support_fund_ledger(purchase_id) WHERE entry_type='refund';

ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS support_purchase_id uuid
  REFERENCES public.qr_support_purchases(id) ON DELETE SET NULL;
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS funding_type text NOT NULL DEFAULT 'free';
DO $$ BEGIN
  ALTER TABLE public.qr_codes ADD CONSTRAINT qr_codes_funding_type_check
    CHECK (funding_type IN ('free','support'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS qr_codes_one_per_support_purchase
  ON public.qr_codes(support_purchase_id) WHERE support_purchase_id IS NOT NULL;

ALTER TABLE public.qr_scans ADD COLUMN IF NOT EXISTS qr_id uuid
  REFERENCES public.qr_codes(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_qr_scans_user_qr_recent
  ON public.qr_scans(user_id,qr_id,scanned_at DESC);

CREATE TABLE IF NOT EXISTS public.qr_trick_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id uuid NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  finder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proof_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(qr_id,finder_id)
);
ALTER TABLE public.qr_trick_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qr_trick_submissions_view_participants ON public.qr_trick_submissions;
CREATE POLICY qr_trick_submissions_view_participants ON public.qr_trick_submissions
  FOR SELECT TO authenticated USING (
    finder_id=(SELECT auth.uid()) OR
    EXISTS(SELECT 1 FROM public.qr_codes q WHERE q.id=qr_id AND q.purchased_by=(SELECT auth.uid()))
  );
REVOKE INSERT, UPDATE, DELETE ON public.qr_trick_submissions FROM anon, authenticated;

CREATE OR REPLACE VIEW public.support_fund_summary WITH (security_invoker=true) AS
SELECT
  COALESCE(SUM(CASE WHEN entry_type IN ('qr_support_purchase','adjustment') THEN amount_cents ELSE -amount_cents END),0)::bigint AS net_cents,
  COALESCE(SUM(CASE WHEN entry_type='qr_support_purchase' THEN amount_cents ELSE 0 END),0)::bigint AS qr_purchase_cents,
  COALESCE(SUM(CASE WHEN entry_type='refund' THEN amount_cents ELSE 0 END),0)::bigint AS refunded_cents,
  COALESCE(SUM(CASE WHEN entry_type='disbursement' THEN amount_cents ELSE 0 END),0)::bigint AS disbursed_cents,
  COUNT(*) FILTER (WHERE entry_type='qr_support_purchase')::bigint AS paid_qr_count
FROM public.support_fund_ledger;

CREATE OR REPLACE FUNCTION public.get_unused_qr_support_purchase()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path=public,pg_temp
STABLE
AS $$
  SELECT p.id
  FROM public.qr_support_purchases p
  WHERE p.user_id=auth.uid()
    AND p.status='paid'
    AND p.amount_cents=200
    AND lower(p.currency)='usd'
    AND NOT EXISTS(SELECT 1 FROM public.qr_codes q WHERE q.support_purchase_id=p.id)
  ORDER BY p.paid_at DESC NULLS LAST, p.created_at DESC
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_unused_qr_support_purchase() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unused_qr_support_purchase() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_hidden_qr(
  p_latitude double precision,
  p_longitude double precision,
  p_location_description text DEFAULT NULL,
  p_trick_challenge text DEFAULT NULL,
  p_challenge_message text DEFAULT NULL,
  p_proof_required boolean DEFAULT true,
  p_support_purchase_id uuid DEFAULT NULL
)
RETURNS public.qr_codes
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile record;
  v_code text;
  v_row public.qr_codes%rowtype;
  v_purchase public.qr_support_purchases%rowtype;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid coordinates'; END IF;
  IF p_support_purchase_id IS NULL THEN RAISE EXCEPTION 'A confirmed $2 support purchase is required before hiding a QR'; END IF;
  IF nullif(trim(coalesce(p_trick_challenge,'')),'') IS NULL THEN RAISE EXCEPTION 'Every hidden QR must include a trick challenge'; END IF;

  SELECT * INTO v_purchase FROM public.qr_support_purchases
  WHERE id=p_support_purchase_id AND user_id=v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Support purchase not found'; END IF;
  IF v_purchase.status <> 'paid' THEN RAISE EXCEPTION 'The $2 support payment has not been confirmed'; END IF;
  IF v_purchase.amount_cents <> 200 OR lower(v_purchase.currency) <> 'usd' THEN RAISE EXCEPTION 'This is not a valid $2 QR support purchase'; END IF;
  IF EXISTS(SELECT 1 FROM public.qr_codes WHERE support_purchase_id=p_support_purchase_id) THEN RAISE EXCEPTION 'This support purchase has already been used for a QR'; END IF;

  SELECT username,display_name INTO v_profile FROM public.profiles WHERE id=v_user;
  LOOP
    v_code := 'SKQ-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.qr_codes WHERE code=v_code);
  END LOOP;

  INSERT INTO public.qr_codes(
    code,purchased_by,purchaser_name,purchase_price,status,hidden_at,
    hidden_location_lat,hidden_location_lng,hidden_location_description,
    xp_reward,trick_challenge,challenge_message,proof_required,
    support_purchase_id,funding_type
  ) VALUES(
    v_code,v_user,coalesce(v_profile.display_name,v_profile.username,'Skater'),2.00,'hidden',now(),
    p_latitude,p_longitude,nullif(trim(p_location_description),''),50,trim(p_trick_challenge),
    nullif(trim(p_challenge_message),''),true,p_support_purchase_id,'support'
  ) RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.create_hidden_qr(double precision,double precision,text,text,text,boolean,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_hidden_qr(double precision,double precision,text,text,text,boolean,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_hidden_qr(
  p_code text,
  p_latitude double precision,
  p_longitude double precision,
  p_spot_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_user uuid:=auth.uid();
  v_qr public.qr_codes%rowtype;
  v_distance double precision;
  v_spot public.skate_spots%rowtype;
  v_spot_distance double precision;
  v_qr_spot_distance double precision;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid coordinates'; END IF;
  SELECT * INTO v_qr FROM public.qr_codes WHERE upper(code)=upper(trim(p_code)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'QR code not recognized'; END IF;
  IF v_qr.status='found' THEN RAISE EXCEPTION 'This QR has already been completed'; END IF;
  IF v_qr.status<>'hidden' THEN RAISE EXCEPTION 'This QR is not currently hidden'; END IF;
  IF v_qr.expires_at<=now() THEN UPDATE public.qr_codes SET status='expired' WHERE id=v_qr.id; RAISE EXCEPTION 'This QR has expired'; END IF;
  IF v_qr.purchased_by=v_user THEN RAISE EXCEPTION 'You cannot claim your own hidden QR'; END IF;
  IF coalesce(v_qr.purchase_price,0)<>2.00 OR v_qr.support_purchase_id IS NULL OR v_qr.funding_type<>'support' THEN RAISE EXCEPTION 'This QR is not a valid paid support QR'; END IF;
  IF nullif(trim(coalesce(v_qr.trick_challenge,'')),'') IS NULL THEN RAISE EXCEPTION 'This QR has no valid trick challenge'; END IF;
  IF v_qr.hidden_location_lat IS NULL OR v_qr.hidden_location_lng IS NULL THEN RAISE EXCEPTION 'This QR has no verified hiding location'; END IF;

  v_distance:=6371000*2*asin(sqrt(power(sin(radians(p_latitude-v_qr.hidden_location_lat)/2),2)+cos(radians(v_qr.hidden_location_lat))*cos(radians(p_latitude))*power(sin(radians(p_longitude-v_qr.hidden_location_lng)/2),2)));
  IF v_distance>25 THEN RAISE EXCEPTION 'Move within 25 meters of the hidden QR location (currently % meters away)',round(v_distance); END IF;

  IF p_spot_id IS NOT NULL THEN
    SELECT * INTO v_spot FROM public.skate_spots WHERE id=p_spot_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Spot not found'; END IF;
    v_spot_distance:=6371000*2*asin(sqrt(power(sin(radians(p_latitude-v_spot.latitude)/2),2)+cos(radians(v_spot.latitude))*cos(radians(p_latitude))*power(sin(radians(p_longitude-v_spot.longitude)/2),2)));
    v_qr_spot_distance:=6371000*2*asin(sqrt(power(sin(radians(v_qr.hidden_location_lat-v_spot.latitude)/2),2)+cos(radians(v_spot.latitude))*cos(radians(v_qr.hidden_location_lat))*power(sin(radians(v_qr.hidden_location_lng-v_spot.longitude)/2),2)));
    IF v_spot_distance>150 OR v_qr_spot_distance>150 THEN RAISE EXCEPTION 'This QR is not verified for this skate spot'; END IF;
  END IF;

  INSERT INTO public.qr_scans(qr_id,spot_id,user_id,latitude,longitude,distance_from_spot,success)
  SELECT v_qr.id,p_spot_id,v_user,p_latitude,p_longitude,round(v_distance)::integer,true
  WHERE NOT EXISTS(
    SELECT 1 FROM public.qr_scans WHERE user_id=v_user AND qr_id=v_qr.id AND success=true AND scanned_at>now()-interval '5 minutes'
  );

  RETURN jsonb_build_object('claimed',false,'requires_proof',true,'qr_id',v_qr.id,
    'trick_challenge',v_qr.trick_challenge,'challenge_message',v_qr.challenge_message,
    'xp_reward',50,'distance_meters',round(v_distance));
END;
$$;
REVOKE ALL ON FUNCTION public.claim_hidden_qr(text,double precision,double precision,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_hidden_qr(text,double precision,double precision,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_hidden_qr_trick_proof(p_qr_id uuid,p_proof_url text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_user uuid:=auth.uid();
  v_qr public.qr_codes%rowtype;
  v_id uuid;
  v_expected_path text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF nullif(trim(coalesce(p_proof_url,'')),'') IS NULL THEN RAISE EXCEPTION 'Video proof is required'; END IF;
  SELECT * INTO v_qr FROM public.qr_codes WHERE id=p_qr_id;
  IF NOT FOUND OR v_qr.status<>'hidden' THEN RAISE EXCEPTION 'QR is not available for proof'; END IF;
  IF v_qr.purchased_by=v_user THEN RAISE EXCEPTION 'You cannot submit proof for your own QR'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.qr_scans s WHERE s.user_id=v_user AND s.qr_id=p_qr_id AND s.success=true AND s.scanned_at>now()-interval '30 minutes') THEN
    RAISE EXCEPTION 'Scan this exact physical QR at its hiding location before submitting trick proof';
  END IF;
  v_expected_path := '/skatetv-clips/qr_proofs/' || v_user::text || '/';
  IF position(v_expected_path IN p_proof_url)=0 THEN RAISE EXCEPTION 'Proof must be a SkateQuest video uploaded by the signed-in finder'; END IF;

  INSERT INTO public.qr_trick_submissions(qr_id,finder_id,proof_url,status)
  VALUES(p_qr_id,v_user,trim(p_proof_url),'pending')
  ON CONFLICT(qr_id,finder_id) DO UPDATE SET proof_url=excluded.proof_url,status='pending',submitted_at=now(),reviewed_at=NULL
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_hidden_qr_trick_proof(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_hidden_qr_trick_proof(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_hidden_qr_trick_proof(p_submission_id uuid,p_approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_user uuid:=auth.uid();
  v_sub public.qr_trick_submissions%rowtype;
  v_qr public.qr_codes%rowtype;
  v_profile record;
  v_paid boolean:=false;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_sub FROM public.qr_trick_submissions WHERE id=p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proof submission not found'; END IF;
  SELECT * INTO v_qr FROM public.qr_codes WHERE id=v_sub.qr_id FOR UPDATE;
  IF v_qr.purchased_by<>v_user THEN RAISE EXCEPTION 'Only the QR hider can review this trick proof'; END IF;
  IF v_sub.status<>'pending' THEN RAISE EXCEPTION 'This proof has already been reviewed'; END IF;

  IF NOT p_approve THEN
    UPDATE public.qr_trick_submissions SET status='rejected',reviewed_at=now() WHERE id=v_sub.id;
    RETURN jsonb_build_object('approved',false,'xp_awarded',0);
  END IF;

  UPDATE public.qr_trick_submissions SET status='approved',reviewed_at=now() WHERE id=v_sub.id;
  SELECT username,display_name INTO v_profile FROM public.profiles WHERE id=v_sub.finder_id;
  UPDATE public.qr_codes SET status='found',found_by=v_sub.finder_id,
    found_by_name=coalesce(v_profile.display_name,v_profile.username,'Skater'),found_at=now()
  WHERE id=v_qr.id AND status='hidden';
  IF NOT FOUND THEN RAISE EXCEPTION 'QR is no longer available'; END IF;

  INSERT INTO public.xp_reward_ledger(user_id,reward_key,source,xp_amount)
  VALUES(v_sub.finder_id,'qr:'||v_qr.id::text,'qr_trick_approved',50)
  ON CONFLICT(user_id,reward_key) DO NOTHING;
  GET DIAGNOSTICS v_paid=ROW_COUNT;
  IF v_paid THEN PERFORM public.increment_user_xp(v_sub.finder_id,50); END IF;

  RETURN jsonb_build_object('approved',true,'xp_awarded',CASE WHEN v_paid THEN 50 ELSE 0 END,
    'finder_id',v_sub.finder_id,'qr_id',v_qr.id);
END;
$$;
REVOKE ALL ON FUNCTION public.review_hidden_qr_trick_proof(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_hidden_qr_trick_proof(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_qr_trick_reviews()
RETURNS TABLE(
  submission_id uuid, qr_id uuid, qr_code text, trick_challenge text,
  proof_url text, submitted_at timestamptz, finder_id uuid, finder_name text
)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp STABLE AS $$
  SELECT s.id,q.id,q.code,q.trick_challenge,s.proof_url,s.submitted_at,s.finder_id,
    coalesce(p.display_name,p.username,'Skater')
  FROM public.qr_trick_submissions s
  JOIN public.qr_codes q ON q.id=s.qr_id
  LEFT JOIN public.profiles p ON p.id=s.finder_id
  WHERE q.purchased_by=auth.uid() AND s.status='pending'
  ORDER BY s.submitted_at ASC;
$$;
REVOKE ALL ON FUNCTION public.get_my_qr_trick_reviews() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_qr_trick_reviews() TO authenticated;
