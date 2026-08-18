-- Trick Bingo is a verified weekly challenge, not a tap-to-claim XP screen.
-- Cells are completed only after owned video proof passes the Judge's Booth.

alter table public.bingo_cards
  add column if not exists week_start date,
  add column if not exists updated_at timestamptz not null default now();

update public.bingo_cards
set week_start = date_trunc('week', created_at)::date
where week_start is null;

create unique index if not exists idx_bingo_cards_user_week
  on public.bingo_cards(user_id, week_start)
  where week_start is not null;

create table if not exists public.bingo_cell_submissions (
  id uuid primary key default gen_random_uuid(),
  bingo_card_id uuid not null references public.bingo_cards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  cell_index integer not null check (cell_index between 0 and 24),
  trick_name text not null,
  media_id uuid not null references public.media(id) on delete cascade,
  video_url text not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  stomped_votes integer not null default 0,
  bail_votes integer not null default 0,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (bingo_card_id, user_id, cell_index)
);

create table if not exists public.bingo_cell_submission_votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.bingo_cell_submissions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote text not null check (vote in ('stomped','bail')),
  created_at timestamptz not null default now(),
  unique (submission_id, user_id)
);

create table if not exists public.bingo_rewards (
  id uuid primary key default gen_random_uuid(),
  bingo_card_id uuid not null references public.bingo_cards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_key text not null,
  xp_awarded integer not null check (xp_awarded >= 0),
  created_at timestamptz not null default now(),
  unique (bingo_card_id, reward_key)
);

create index if not exists idx_bingo_cell_submissions_pending
  on public.bingo_cell_submissions(status, submitted_at);
create index if not exists idx_bingo_cell_votes_user
  on public.bingo_cell_submission_votes(user_id, submission_id);

alter table public.bingo_cell_submissions enable row level security;
alter table public.bingo_cell_submission_votes enable row level security;
alter table public.bingo_rewards enable row level security;

-- Retire direct card mutation. Clients can read their card but only verified RPCs
-- may create cards or change completed cells.
drop policy if exists "users_manage_own_bingo" on public.bingo_cards;
drop policy if exists "users_read_own_bingo" on public.bingo_cards;
create policy "users_read_own_bingo"
on public.bingo_cards for select to authenticated
using (user_id = auth.uid());

drop policy if exists "bingo_submissions_read" on public.bingo_cell_submissions;
create policy "bingo_submissions_read"
on public.bingo_cell_submissions for select to authenticated
using (true);

drop policy if exists "bingo_votes_read_own" on public.bingo_cell_submission_votes;
create policy "bingo_votes_read_own"
on public.bingo_cell_submission_votes for select to authenticated
using (user_id = auth.uid());

drop policy if exists "bingo_rewards_read_own" on public.bingo_rewards;
create policy "bingo_rewards_read_own"
on public.bingo_rewards for select to authenticated
using (user_id = auth.uid());

create or replace function public.get_or_create_weekly_bingo_card()
returns public.bingo_cards
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_week_start date := date_trunc('week', now())::date;
  v_card public.bingo_cards;
  v_tricks jsonb := jsonb_build_array(
    'Ollie','Frontside 180','Backside 180','Pop Shove-it','Fakie Ollie',
    'Kickflip','Heelflip','Half Cab','50-50 Grind','Boardslide',
    'Manual','Nose Manual','Varial Kickflip','Noseslide','5-0 Grind',
    'Frontside Boardslide','Bigspin','Tre Flip (360 Flip)','Crooked Grind','Tailslide',
    'Nollie','Frontside Flip','Backside Flip','Hardflip','Switch Kickflip'
  );
begin
  if v_user_id is null then raise exception 'not authorized'; end if;

  select * into v_card
  from public.bingo_cards
  where user_id = v_user_id and week_start = v_week_start
  limit 1;

  if found then return v_card; end if;

  insert into public.bingo_cards (
    user_id, card_data, completed_cells, completed, week_start, updated_at
  ) values (
    v_user_id,
    jsonb_build_object('tricks', v_tricks, 'week_start', v_week_start),
    '{}'::integer[],
    false,
    v_week_start,
    now()
  )
  returning * into v_card;

  return v_card;
end;
$$;

create or replace function public.submit_bingo_cell_proof(
  p_bingo_card_id uuid,
  p_cell_index integer,
  p_media_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_video_url text;
  v_media_type text;
  v_card_owner uuid;
  v_week_start date;
  v_tricks jsonb;
  v_trick_name text;
  v_submission_id uuid;
  v_existing_status text;
begin
  if v_user_id is null then raise exception 'not authorized'; end if;
  if p_cell_index not between 0 and 24 then raise exception 'invalid bingo cell'; end if;

  select user_id, week_start, card_data->'tricks'
  into v_card_owner, v_week_start, v_tricks
  from public.bingo_cards
  where id = p_bingo_card_id;

  if not found or v_card_owner <> v_user_id then raise exception 'bingo card not found'; end if;
  if v_week_start <> date_trunc('week', now())::date then raise exception 'this bingo card has expired'; end if;

  v_trick_name := v_tricks->>p_cell_index;
  if v_trick_name is null or btrim(v_trick_name) = '' then raise exception 'bingo trick not found'; end if;

  if p_cell_index = any(coalesce((select completed_cells from public.bingo_cards where id = p_bingo_card_id), '{}'::integer[])) then
    raise exception 'this bingo cell is already verified';
  end if;

  select m.url, m.type into v_video_url, v_media_type
  from public.media m
  where m.id = p_media_id and m.user_id = v_user_id;

  if not found or v_video_url is null then raise exception 'owned media proof not found'; end if;
  if v_media_type is distinct from 'video' then raise exception 'bingo proof must be a video'; end if;

  select id, status into v_submission_id, v_existing_status
  from public.bingo_cell_submissions
  where bingo_card_id = p_bingo_card_id
    and user_id = v_user_id
    and cell_index = p_cell_index
  for update;

  if found then
    if v_existing_status = 'PENDING' then raise exception 'this bingo proof is already pending'; end if;
    if v_existing_status = 'APPROVED' then raise exception 'this bingo cell is already approved'; end if;

    delete from public.bingo_cell_submission_votes where submission_id = v_submission_id;
    update public.bingo_cell_submissions
    set media_id = p_media_id,
        video_url = v_video_url,
        trick_name = v_trick_name,
        status = 'PENDING',
        stomped_votes = 0,
        bail_votes = 0,
        submitted_at = now(),
        reviewed_at = null
    where id = v_submission_id;
  else
    insert into public.bingo_cell_submissions (
      bingo_card_id, user_id, cell_index, trick_name, media_id, video_url
    ) values (
      p_bingo_card_id, v_user_id, p_cell_index, v_trick_name, p_media_id, v_video_url
    ) returning id into v_submission_id;
  end if;

  return jsonb_build_object('success', true, 'submission_id', v_submission_id, 'status', 'PENDING', 'trick_name', v_trick_name);
end;
$$;

create or replace function public.judge_bingo_cell_submission(
  p_submission_id uuid,
  p_vote text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_judge_id uuid := auth.uid();
  v_submitter_id uuid;
  v_card_id uuid;
  v_cell_index integer;
  v_media_id uuid;
  v_trick_name text;
  v_status text;
  v_stomped integer;
  v_bail integer;
  v_cells integer[];
  v_line integer[];
  v_line_index integer := 0;
  v_reward_key text;
  v_reward integer := 0;
  v_bonus integer := 0;
  v_result_status text := 'PENDING';
  v_total_judge_votes integer := 0;
  v_full boolean := false;
  v_winning_lines integer[][] := array[
    array[0,1,2,3,4], array[5,6,7,8,9], array[10,11,12,13,14], array[15,16,17,18,19], array[20,21,22,23,24],
    array[0,5,10,15,20], array[1,6,11,16,21], array[2,7,12,17,22], array[3,8,13,18,23], array[4,9,14,19,24],
    array[0,6,12,18,24], array[4,8,12,16,20]
  ];
begin
  if v_judge_id is null then raise exception 'not authorized'; end if;
  p_vote := lower(p_vote);
  if p_vote not in ('stomped','bail') then raise exception 'invalid vote'; end if;

  select user_id, bingo_card_id, cell_index, media_id, trick_name, status
  into v_submitter_id, v_card_id, v_cell_index, v_media_id, v_trick_name, v_status
  from public.bingo_cell_submissions
  where id = p_submission_id
  for update;

  if not found then raise exception 'submission not found'; end if;
  if v_submitter_id = v_judge_id then raise exception 'cannot judge own submission'; end if;
  if v_status <> 'PENDING' then raise exception 'submission is no longer pending'; end if;

  begin
    insert into public.bingo_cell_submission_votes (submission_id, user_id, vote)
    values (p_submission_id, v_judge_id, p_vote);
  exception when unique_violation then
    raise exception 'already voted';
  end;

  select
    count(*) filter (where vote = 'stomped')::integer,
    count(*) filter (where vote = 'bail')::integer
  into v_stomped, v_bail
  from public.bingo_cell_submission_votes
  where submission_id = p_submission_id;

  update public.bingo_cell_submissions
  set stomped_votes = v_stomped, bail_votes = v_bail
  where id = p_submission_id;

  perform public.increment_user_xp(v_judge_id, 10);
  select
    coalesce((select count(*) from public.submission_votes where user_id = v_judge_id), 0) +
    coalesce((select count(*) from public.bounty_submission_votes where user_id = v_judge_id), 0) +
    coalesce((select count(*) from public.spot_claim_submission_votes where user_id = v_judge_id), 0) +
    coalesce((select count(*) from public.bingo_cell_submission_votes where user_id = v_judge_id), 0)
  into v_total_judge_votes;

  if v_total_judge_votes > 0 and v_total_judge_votes % 5 = 0 then
    v_bonus := 50;
    perform public.increment_user_xp(v_judge_id, v_bonus);
  end if;

  if v_bail >= 3 then
    v_result_status := 'REJECTED';
    update public.bingo_cell_submissions set status = 'REJECTED', reviewed_at = now() where id = p_submission_id;
  elsif v_stomped >= 10 then
    update public.bingo_cell_submissions set status = 'APPROVED', reviewed_at = now() where id = p_submission_id;

    select completed_cells into v_cells from public.bingo_cards where id = v_card_id for update;
    v_cells := coalesce(v_cells, '{}'::integer[]);
    if not (v_cell_index = any(v_cells)) then
      v_cells := array_append(v_cells, v_cell_index);
      select array_agg(x order by x) into v_cells from unnest(v_cells) x;
      update public.bingo_cards
      set completed_cells = v_cells,
          completed = cardinality(v_cells) = 25,
          updated_at = now()
      where id = v_card_id;
    end if;

    foreach v_line slice 1 in array v_winning_lines loop
      v_line_index := v_line_index + 1;
      if not exists (
        select 1 from unnest(v_line) required_cell
        where not (required_cell = any(v_cells))
      ) then
        v_reward_key := 'line-' || v_line_index::text;
        begin
          insert into public.bingo_rewards (bingo_card_id, user_id, reward_key, xp_awarded)
          values (v_card_id, v_submitter_id, v_reward_key, 50);
          v_reward := v_reward + 50;
        exception when unique_violation then null;
        end;
      end if;
    end loop;

    v_full := cardinality(v_cells) = 25;
    if v_full then
      begin
        insert into public.bingo_rewards (bingo_card_id, user_id, reward_key, xp_awarded)
        values (v_card_id, v_submitter_id, 'full-card', 500);
        v_reward := v_reward + 500;
      exception when unique_violation then null;
      end;
    end if;

    if v_reward > 0 then
      perform public.increment_user_xp(v_submitter_id, v_reward);
      insert into public.activity_feed (user_id, activity_type, title, description, xp_earned, media_id)
      values (
        v_submitter_id,
        'bingo_verified',
        case when v_full then 'Completed Trick Bingo card' else 'Completed Trick Bingo line' end,
        'Community judges approved ' || v_trick_name || ' proof.',
        v_reward,
        v_media_id
      );
    end if;
    v_result_status := 'APPROVED';
  end if;

  return jsonb_build_object(
    'success', true,
    'status', v_result_status,
    'judge_xp', 10,
    'bonus_xp', v_bonus,
    'bingo_xp_awarded', v_reward,
    'stomped_votes', v_stomped,
    'bail_votes', v_bail
  );
end;
$$;

revoke all on function public.get_or_create_weekly_bingo_card() from public, anon;
revoke all on function public.submit_bingo_cell_proof(uuid, integer, uuid) from public, anon;
revoke all on function public.judge_bingo_cell_submission(uuid, text) from public, anon;
grant execute on function public.get_or_create_weekly_bingo_card() to authenticated;
grant execute on function public.submit_bingo_cell_proof(uuid, integer, uuid) to authenticated;
grant execute on function public.judge_bingo_cell_submission(uuid, text) to authenticated;
