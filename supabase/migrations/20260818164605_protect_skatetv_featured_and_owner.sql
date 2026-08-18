create or replace function public.protect_skatetv_counters()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null then
    new.user_id := old.user_id;
    new.featured := old.featured;

    if coalesce(current_setting('skatequest.trusted_counter_update', true), '') <> '1' then
      new.likes := old.likes;
      new.views := old.views;
    end if;
  end if;
  return new;
end;
$$;
