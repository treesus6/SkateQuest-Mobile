CREATE OR REPLACE FUNCTION public.review_hidden_qr_trick_proof(p_submission_id uuid,p_approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_user uuid:=auth.uid();
  v_sub public.qr_trick_submissions%rowtype;
  v_qr public.qr_codes%rowtype;
  v_profile record;
  v_inserted integer:=0;
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
  UPDATE public.qr_codes
  SET status='found',found_by=v_sub.finder_id,
      found_by_name=coalesce(v_profile.display_name,v_profile.username,'Skater'),found_at=now()
  WHERE id=v_qr.id AND status='hidden';
  IF NOT FOUND THEN RAISE EXCEPTION 'QR is no longer available'; END IF;

  INSERT INTO public.xp_reward_ledger(user_id,reward_key,source,xp_amount)
  VALUES(v_sub.finder_id,'qr:'||v_qr.id::text,'qr_trick_approved',50)
  ON CONFLICT(user_id,reward_key) DO NOTHING;
  GET DIAGNOSTICS v_inserted=ROW_COUNT;
  IF v_inserted>0 THEN PERFORM public.increment_user_xp(v_sub.finder_id,50); END IF;

  RETURN jsonb_build_object('approved',true,'xp_awarded',CASE WHEN v_inserted>0 THEN 50 ELSE 0 END,
    'finder_id',v_sub.finder_id,'qr_id',v_qr.id);
END;
$$;