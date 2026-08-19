begin;

create table if not exists public.shop_deals (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.skate_shops(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  description text,
  xp_cost integer not null check (xp_cost > 0 and xp_cost <= 100000),
  active boolean not null default true,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemptions_count integer not null default 0 check (redemptions_count >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shop_deals enable row level security;
drop policy if exists "Authenticated users can view active shop deals" on public.shop_deals;
create policy "Authenticated users can view active shop deals"
on public.shop_deals for select to authenticated
using (active = true and (expires_at is null or expires_at > now()));
revoke all on public.shop_deals from anon, authenticated;
grant select on public.shop_deals to authenticated;

create table if not exists public.deal_redemptions (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.shop_deals(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  redemption_code text not null unique,
  xp_cost_paid integer not null check (xp_cost_paid > 0),
  redeemed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used boolean not null default false,
  used_at timestamptz,
  unique (deal_id, user_id)
);
alter table public.deal_redemptions enable row level security;
drop policy if exists "Users can view own deal redemptions" on public.deal_redemptions;
create policy "Users can view own deal redemptions"
on public.deal_redemptions for select to authenticated
using (user_id = (select auth.uid()));
revoke all on public.deal_redemptions from anon, authenticated;
grant select on public.deal_redemptions to authenticated;

drop function if exists public.redeem_shop_deal(uuid,uuid,integer);

create or replace function public.redeem_shop_deal(
  p_user_id uuid,
  p_deal_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_deal public.shop_deals%rowtype;
  v_code text;
  v_expires timestamptz := now() + interval '24 hours';
  v_redemption_id uuid;
  v_remaining_xp integer;
begin
  if v_user is null or v_user is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  select * into v_deal
  from public.shop_deals
  where id = p_deal_id
  for update;
  if not found then raise exception 'Deal not found'; end if;
  if not v_deal.active then raise exception 'Deal is not active'; end if;
  if v_deal.expires_at is not null and v_deal.expires_at <= now() then
    raise exception 'Deal has expired';
  end if;
  if v_deal.max_redemptions is not null and v_deal.redemptions_count >= v_deal.max_redemptions then
    raise exception 'Deal is sold out';
  end if;
  if exists (
    select 1 from public.deal_redemptions dr
    where dr.deal_id = p_deal_id and dr.user_id = v_user
  ) then
    raise exception 'You already redeemed this deal';
  end if;

  update public.profiles
  set xp = xp - v_deal.xp_cost,
      level = public.calculate_level(xp - v_deal.xp_cost),
      updated_at = now()
  where id = v_user and coalesce(xp,0) >= v_deal.xp_cost
  returning xp into v_remaining_xp;
  if not found then raise exception 'Insufficient XP'; end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    exit when not exists (
      select 1 from public.deal_redemptions where redemption_code = v_code
    );
  end loop;

  insert into public.deal_redemptions(
    deal_id,user_id,redemption_code,xp_cost_paid,expires_at
  ) values (
    p_deal_id,v_user,v_code,v_deal.xp_cost,v_expires
  ) returning id into v_redemption_id;

  update public.shop_deals
  set redemptions_count = redemptions_count + 1,
      updated_at = now()
  where id = p_deal_id;

  return jsonb_build_object(
    'id',v_redemption_id,
    'deal_id',p_deal_id,
    'code',v_code,
    'redemption_code',v_code,
    'xp_cost_paid',v_deal.xp_cost,
    'remaining_xp',v_remaining_xp,
    'expires_at',v_expires
  );
end;
$$;
revoke all on function public.redeem_shop_deal(uuid,uuid) from public, anon;
grant execute on function public.redeem_shop_deal(uuid,uuid) to authenticated, service_role;

commit;
