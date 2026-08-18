ALTER TABLE public.qr_codes DROP CONSTRAINT IF EXISTS qr_codes_purchased_by_fkey;
ALTER TABLE public.qr_codes DROP CONSTRAINT IF EXISTS qr_codes_found_by_fkey;
ALTER TABLE public.qr_codes
  ADD CONSTRAINT qr_codes_purchased_by_fkey FOREIGN KEY (purchased_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.qr_codes
  ADD CONSTRAINT qr_codes_found_by_fkey FOREIGN KEY (found_by) REFERENCES public.profiles(id) ON DELETE SET NULL;