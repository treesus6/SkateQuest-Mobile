import fs from 'fs';
import path from 'path';

const MIGRATION = '20261117060000_create_skate_activity_sessions_and_start.sql';

function readSource(...segments: string[]): string {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

function readMigration(): string {
  return readSource('supabase', 'migrations', MIGRATION);
}

describe('live activity session backend contract', () => {
  it('creates skate_activity_sessions with every column finish_skate_activity_session uses', () => {
    const migration = readMigration();
    expect(migration).toContain('create table if not exists public.skate_activity_sessions (');
    expect(migration).toContain('id uuid primary key default gen_random_uuid()');
    expect(migration).toContain(
      'user_id uuid not null references public.profiles(id) on delete cascade'
    );
    expect(migration).toContain('spot_id uuid');
    expect(migration).toContain('spot_name text');
    expect(migration).toContain('started_at timestamptz not null default now()');
    expect(migration).toContain('ended_at timestamptz');
    expect(migration).toContain('duration_minutes integer');
    expect(migration).toContain('trick_count integer not null default 0');
    expect(migration).toContain('xp_awarded integer not null default 0');
    expect(migration).toContain("status text not null default 'active'");
    expect(migration).toContain("check (status in ('active', 'completed'))");
  });

  it('enables RLS with owner-only reads and no direct writes', () => {
    const migration = readMigration();
    expect(migration).toContain(
      'alter table public.skate_activity_sessions enable row level security'
    );
    expect(migration).toContain(
      'create policy "users_view_own_skate_activity_sessions" on public.skate_activity_sessions for select to authenticated using (user_id = auth.uid())'
    );
    expect(migration).toContain('revoke all on public.skate_activity_sessions from anon');
    expect(migration).toContain(
      'revoke insert, update, delete on public.skate_activity_sessions from authenticated'
    );
    expect(migration).toContain('grant select on public.skate_activity_sessions to authenticated');
  });

  it('defines start_skate_activity_session with the exact signature the screen calls', () => {
    const migration = readMigration();
    expect(migration).toContain(
      'create or replace function public.start_skate_activity_session(p_spot_id uuid, p_spot_name text)'
    );
    expect(migration).toContain('returns jsonb');
    expect(migration).toContain('security definer');
    expect(migration).toContain("raise exception 'Authentication required'");
    expect(migration).toContain("'session_id', v_session.id");
    expect(migration).toContain("'started_at', v_session.started_at");
    expect(migration).toContain("'resumed', true");
    expect(migration).toContain("'resumed', false");
    expect(migration).toContain(
      'revoke all on function public.start_skate_activity_session(uuid, text) from public, anon'
    );
    expect(migration).toContain(
      'grant execute on function public.start_skate_activity_session(uuid, text) to authenticated'
    );
  });

  it('keeps one active session per user, resuming instead of duplicating', () => {
    const migration = readMigration();
    expect(migration).toContain(
      'create unique index if not exists skate_activity_sessions_one_active_per_user_idx'
    );
    expect(migration).toContain("where status = 'active'");
    expect(migration).toContain('exception when unique_violation then');
  });

  it('matches the ActiveSessionScreen start and finish call sites', () => {
    const screen = readSource('screens', 'ActiveSessionScreen.tsx');
    expect(screen).toContain(
      "supabase.rpc('start_skate_activity_session', { p_spot_id: spotId || null, p_spot_name: spotName })"
    );
    expect(screen).toContain(
      "supabase.rpc('finish_skate_activity_session', { p_session_id: serverSessionId, p_trick_count: trickCount })"
    );
    expect(screen).toContain('const result = (data ?? {}) as StartSessionResult;');
    expect(screen).toContain('if (!result.session_id) throw new Error');
  });

  it('covers the table the finish migrations already depend on', () => {
    const finishV1 = readSource(
      'supabase',
      'migrations',
      '20260819051202_ledger_activity_session_rewards_and_retire_legacy_session_api.sql'
    );
    const finishV2 = readSource(
      'supabase',
      'migrations',
      '20261003173452_make_activity_session_feed_server_verified.sql'
    );
    expect(finishV1).toContain('v_session public.skate_activity_sessions%rowtype');
    expect(finishV2).toContain('v_session public.skate_activity_sessions%rowtype');
    expect(finishV1).toContain('from public.skate_activity_sessions');
    expect(finishV2).toContain('from public.skate_activity_sessions');
  });
});
