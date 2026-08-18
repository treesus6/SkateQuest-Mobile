ALTER TABLE public.support_fund_ledger DROP CONSTRAINT IF EXISTS support_fund_ledger_entry_type_check;
ALTER TABLE public.support_fund_ledger ADD CONSTRAINT support_fund_ledger_entry_type_check
  CHECK (entry_type IN ('qr_support_purchase','refund','disbursement','adjustment','processing_fee'));

CREATE UNIQUE INDEX IF NOT EXISTS support_fund_one_processing_fee
  ON public.support_fund_ledger(purchase_id) WHERE entry_type='processing_fee';

DROP VIEW IF EXISTS public.support_fund_summary;
CREATE VIEW public.support_fund_summary WITH (security_invoker=true) AS
SELECT
  COALESCE(SUM(CASE WHEN entry_type IN ('qr_support_purchase','adjustment') THEN amount_cents ELSE -amount_cents END),0)::bigint AS net_cents,
  COALESCE(SUM(CASE WHEN entry_type='qr_support_purchase' THEN amount_cents ELSE 0 END),0)::bigint AS qr_purchase_cents,
  COALESCE(SUM(CASE WHEN entry_type='processing_fee' THEN amount_cents ELSE 0 END),0)::bigint AS processing_fee_cents,
  COALESCE(SUM(CASE WHEN entry_type='refund' THEN amount_cents ELSE 0 END),0)::bigint AS refunded_cents,
  COALESCE(SUM(CASE WHEN entry_type='disbursement' THEN amount_cents ELSE 0 END),0)::bigint AS disbursed_cents,
  COUNT(*) FILTER (WHERE entry_type='qr_support_purchase')::bigint AS paid_qr_count
FROM public.support_fund_ledger;