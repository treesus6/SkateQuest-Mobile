CREATE OR REPLACE FUNCTION public.get_public_qr_support_fund_summary()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path=public,pg_temp
STABLE
AS $$
  SELECT jsonb_build_object(
    'paid_qr_count', count(*) FILTER (WHERE entry_type='qr_support_purchase'),
    'gross_cents', COALESCE(sum(amount_cents) FILTER (WHERE entry_type='qr_support_purchase'),0),
    'processing_fee_cents', COALESCE(sum(amount_cents) FILTER (WHERE entry_type='processing_fee'),0),
    'refunded_cents', COALESCE(sum(amount_cents) FILTER (WHERE entry_type='refund'),0),
    'disbursed_cents', COALESCE(sum(amount_cents) FILTER (WHERE entry_type='disbursement'),0),
    'tracked_balance_cents', COALESCE(sum(CASE WHEN entry_type IN ('qr_support_purchase','adjustment') THEN amount_cents ELSE -amount_cents END),0)
  )
  FROM public.support_fund_ledger;
$$;
REVOKE ALL ON FUNCTION public.get_public_qr_support_fund_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_qr_support_fund_summary() TO authenticated;