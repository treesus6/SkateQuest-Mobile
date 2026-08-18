alter table public.quest_proof_submissions
  add column if not exists submission_date date not null default current_date;

alter table public.quest_proof_submissions
  drop constraint if exists quest_proof_submissions_user_id_quest_id_key;

create unique index if not exists quest_proof_submissions_user_quest_date_key
  on public.quest_proof_submissions (user_id, quest_id, submission_date);

create or replace function public.submit_quest_proof(
  p_user_id uuid,
  p_quest_id uuid,
  p_proof_type text,
  p_proof_url text default null,
  p_proof_note text default null,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quest public.daily_quests%rowtype;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    return jsonb_build_object('success', false, 'error', 'Not authorized');
  end if;

  select * into v_quest
  from public.daily_quests
  where id = p_quest_id
    and active = true
    and coalesce(frozen, false) = false;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Quest not found, inactive, or frozen');
  end if;

  if p_proof_type not in ('photo', 'video', 'location') then
    return jsonb_build_object('success', false, 'error', 'Unsupported proof type');
  end if;

  if p_proof_type in ('photo', 'video') and nullif(btrim(coalesce(p_proof_url, '')), '') is null then
    return jsonb_build_object('success', false, 'error', 'Media proof is required');
  end if;

  if p_proof_type = 'location' and (p_latitude is null or p_longitude is null) then
    return jsonb_build_object('success', false, 'error', 'Location proof is required');
  end if;

  if exists (
    select 1
    from public.quest_proof_submissions
    where user_id = p_user_id
      and quest_id = p_quest_id
      and submission_date = current_date
  ) then
    return jsonb_build_object('success', false, 'error', 'Already submitted proof for this quest today');
  end if;

  insert into public.quest_proof_submissions (
    user_id, quest_id, proof_type, proof_url, proof_note,
    latitude, longitude, status, xp_awarded, submission_date
  ) values (
    p_user_id, p_quest_id, p_proof_type, p_proof_url, p_proof_note,
    p_latitude, p_longitude, 'pending', false, current_date
  );

  insert into public.daily_quest_completions (
    user_id, quest_id, date, proof_type, proof_url, proof_note, status
  ) values (
    p_user_id, p_quest_id, current_date, p_proof_type, p_proof_url, p_proof_note, 'pending'
  )
  on conflict (user_id, quest_id, date)
  do update set
    proof_type = excluded.proof_type,
    proof_url = excluded.proof_url,
    proof_note = excluded.proof_note,
    status = 'pending';

  return jsonb_build_object(
    'success', true,
    'status', 'pending',
    'potential_xp', coalesce(v_quest.xp_reward, 0)
  );
end;
$$;

revoke all on function public.submit_quest_proof(uuid,uuid,text,text,text,double precision,double precision) from public, anon;
grant execute on function public.submit_quest_proof(uuid,uuid,text,text,text,double precision,double precision) to authenticated;
