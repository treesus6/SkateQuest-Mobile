CREATE OR REPLACE FUNCTION public.submit_hidden_qr_trick_proof(p_qr_id uuid,p_proof_url text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,storage,pg_temp AS $$
DECLARE
  v_user uuid:=auth.uid();
  v_qr public.qr_codes%rowtype;
  v_id uuid;
  v_marker constant text := '/skatetv-clips/';
  v_object_name text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF nullif(trim(coalesce(p_proof_url,'')),'') IS NULL THEN RAISE EXCEPTION 'Video proof is required'; END IF;
  SELECT * INTO v_qr FROM public.qr_codes WHERE id=p_qr_id;
  IF NOT FOUND OR v_qr.status<>'hidden' THEN RAISE EXCEPTION 'QR is not available for proof'; END IF;
  IF v_qr.purchased_by=v_user THEN RAISE EXCEPTION 'You cannot submit proof for your own QR'; END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.qr_scans s
    WHERE s.user_id=v_user AND s.qr_id=p_qr_id AND s.success=true AND s.scanned_at>now()-interval '30 minutes'
  ) THEN RAISE EXCEPTION 'Scan this exact physical QR at its hiding location before submitting trick proof'; END IF;

  IF position(v_marker IN p_proof_url)=0 THEN RAISE EXCEPTION 'Proof must be a SkateQuest video upload'; END IF;
  v_object_name := split_part(p_proof_url, v_marker, 2);
  IF v_object_name NOT LIKE 'qr_proofs/' || v_user::text || '/%' THEN
    RAISE EXCEPTION 'Proof must be uploaded by the signed-in finder';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id='skatetv-clips'
      AND o.name=v_object_name
      AND (o.owner=v_user OR o.owner_id=v_user::text)
  ) THEN RAISE EXCEPTION 'The proof video was not found in SkateQuest storage for this finder'; END IF;

  INSERT INTO public.qr_trick_submissions(qr_id,finder_id,proof_url,status)
  VALUES(p_qr_id,v_user,trim(p_proof_url),'pending')
  ON CONFLICT(qr_id,finder_id) DO UPDATE
    SET proof_url=excluded.proof_url,status='pending',submitted_at=now(),reviewed_at=NULL
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_hidden_qr_trick_proof(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_hidden_qr_trick_proof(uuid,text) TO authenticated;