-- Official bounty rows are product-owned. Community bounties may be created by
-- real signed-in skaters, but clients cannot forge claims, official status, or
-- arbitrary reward values.

create or replace function public.protect_bounty_client_mutations()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user = 'authenticated' then
    if auth.uid() is null then raise exception 'authentication required'; end if;

    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
      new.is_official := false;
      new.official_key := null;
      new.claimed_by := null;
      new.claim_video_url := null;
      new.status := 'open';
      new.xp_reward := greatest(50, least(coalesce(new.xp_reward, 100), 2000));
      new.expires_at := least(
        coalesce(new.expires_at, now() + interval '30 days'),
        now() + interval '90 days'
      );
    else
      new.created_by := old.created_by;
      new.is_official := old.is_official;
      new.official_key := old.official_key;
      new.claimed_by := old.claimed_by;
      new.claim_video_url := old.claim_video_url;
      new.status := old.status;
      new.xp_reward := old.xp_reward;
      new.expires_at := old.expires_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_bounty_client_mutations on public.bounties;
create trigger trg_protect_bounty_client_mutations
before insert or update on public.bounties
for each row execute function public.protect_bounty_client_mutations();

do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bounties'
      and cmd in ('INSERT','UPDATE','DELETE')
  loop
    execute format('drop policy if exists %I on public.bounties', r.policyname);
  end loop;
end $$;

create policy "bounties_insert_own"
on public.bounties
for insert
to authenticated
with check (
  created_by = auth.uid()
  and coalesce(is_official, false) = false
  and official_key is null
  and status = 'open'
  and claimed_by is null
);

create policy "bounties_update_own_open"
on public.bounties
for update
to authenticated
using (
  created_by = auth.uid()
  and coalesce(is_official, false) = false
  and status = 'open'
)
with check (
  created_by = auth.uid()
  and coalesce(is_official, false) = false
);

create policy "bounties_delete_own_open"
on public.bounties
for delete
to authenticated
using (
  created_by = auth.uid()
  and coalesce(is_official, false) = false
  and status = 'open'
);
