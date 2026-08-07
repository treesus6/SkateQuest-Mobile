drop policy if exists "Skate shops are viewable by everyone" on public.skate_shops;
create policy "Skate shops are viewable by everyone" on public.skate_shops
  for select
  to public
  using (true);

