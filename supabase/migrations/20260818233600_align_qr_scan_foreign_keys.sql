ALTER TABLE public.qr_scans DROP CONSTRAINT IF EXISTS qr_scans_user_id_fkey;
ALTER TABLE public.qr_scans DROP CONSTRAINT IF EXISTS qr_scans_spot_id_fkey;
ALTER TABLE public.qr_scans
  ADD CONSTRAINT qr_scans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.qr_scans
  ADD CONSTRAINT qr_scans_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES public.skate_spots(id) ON DELETE CASCADE;