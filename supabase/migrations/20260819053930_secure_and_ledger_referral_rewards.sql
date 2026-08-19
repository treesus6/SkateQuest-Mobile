begin;

create or replace function public.prepare_referral_code_row()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is not null then
    new.user_id:=v_user;
    new.activation_bonus_xp:=250;
    new.recruiter_bonus_xp:=500;
    new.active:=true;
    new.code:=upper('SQ'||substr(replace(gen_random_uuid()::text,'-',''),1,8));
  end if;
  return new;
end;
$$;
revoke all on function public.prepare_referral_code_row() from public,anon,authenticated;

drop trigger if exists trg_prepare_referral_code_row on public.referral_codes;
create trigger trg_prepare_referral_code_row
before insert on public.referral_codes
for each row execute function public.prepare_referral_code_row();

drop policy if exists "Users can create referral codes" on public.referral_codes;
drop policy if exists "Users can manage own referral codes" on public.referral_codes;
create policy "Users can create own normalized referral code"
on public.referral_codes for insert to authenticated
with check (user_id=(select auth.uid()));
revoke update,delete on public.referral_codes from anon,authenticated;
grant select,insert on public.referral_codes to authenticated;

revoke insert,update,delete on public.referral_uses from anon,authenticated;
grant select on public.referral_uses to authenticated;

create unique index if not exists referral_uses_one_new_user
  on public.referral_uses(new_user_id);

create or replace function public.apply_referral_code(
  p_referral_code text,
  p_new_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_code public.referral_codes%rowtype;
  v_use_id uuid;
  v_new_awarded integer:=0;
  v_recruiter_awarded integer:=0;
begin
  if v_user is null or v_user is distinct from p_new_user_id then raise exception 'Not authorized'; end if;
  select * into v_code
  from public.referral_codes
  where code=upper(btrim(coalesce(p_referral_code,''))) and active=true
  for update;
  if not found then raise exception 'Invalid or inactive referral code'; end if;
  if v_code.user_id=v_user then raise exception 'You cannot use your own referral code'; end if;
  if exists(select 1 from public.referral_uses where new_user_id=v_user) then raise exception 'A referral code has already been used on this account'; end if;
  insert into public.referral_uses(referral_code_id,recruiter_user_id,new_user_id,bonus_xp_awarded,recruiter_bonus_xp_awarded)
  values(v_code.id,v_code.user_id,v_user,v_code.activation_bonus_xp,v_code.recruiter_bonus_xp)
  returning id into v_use_id;
  v_new_awarded:=private.award_ledgered_xp(v_user,'referral:'||v_use_id::text||':new_user','referral_new_user',greatest(0,coalesce(v_code.activation_bonus_xp,0)));
  v_recruiter_awarded:=private.award_ledgered_xp(v_code.user_id,'referral:'||v_use_id::text||':recruiter','referral_recruiter',greatest(0,coalesce(v_code.recruiter_bonus_xp,0)));
  return jsonb_build_object('success',true,'new_user_xp',v_new_awarded,'recruiter_xp',v_recruiter_awarded,'recruiter_name',(select username from public.profiles where id=v_code.user_id));
end;
$$;
revoke all on function public.apply_referral_code(text,uuid) from public,anon;
grant execute on function public.apply_referral_code(text,uuid) to authenticated,service_role;

commit;
