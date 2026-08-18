UPDATE public.qr_codes
SET status='expired'
WHERE funding_type='free'
  AND COALESCE(purchase_price,0)=0
  AND purchased_by IS NULL
  AND hidden_location_lat IS NULL
  AND hidden_location_lng IS NULL
  AND status IN ('active','hidden');