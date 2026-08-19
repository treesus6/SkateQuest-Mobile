revoke execute on function public.judge_spot_claim_submission(uuid, text) from public;
revoke execute on function public.judge_spot_claim_submission(uuid, text) from anon;
grant execute on function public.judge_spot_claim_submission(uuid, text) to authenticated;
grant execute on function public.judge_spot_claim_submission(uuid, text) to service_role;
