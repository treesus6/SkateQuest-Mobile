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

const PAUSE_MIGRATION = '20261117070000_live_session_pause_resume_tricks.sql';

function readPauseMigration(): string {
  return readSource('supabase', 'migrations', PAUSE_MIGRATION);
}

describe('live activity session pause / resume / trick records', () => {
  it('adds real pause columns to skate_activity_sessions', () => {
    const migration = readPauseMigration();
    expect(migration).toContain('alter table public.skate_activity_sessions');
    expect(migration).toContain('paused_total_seconds integer not null default 0');
    expect(migration).toContain('paused_at timestamptz');
  });

  it('creates a real per-trick table with owner-only reads and no direct writes', () => {
    const migration = readPauseMigration();
    expect(migration).toContain('create table if not exists public.skate_session_tricks (');
    expect(migration).toContain(
      'session_id uuid not null references public.skate_activity_sessions(id) on delete cascade'
    );
    expect(migration).toContain('logged_at timestamptz not null default now()');
    expect(migration).toContain(
      'alter table public.skate_session_tricks enable row level security'
    );
    expect(migration).toContain(
      'create policy "users_view_own_skate_session_tricks" on public.skate_session_tricks for select to authenticated using (user_id = auth.uid())'
    );
    expect(migration).toContain(
      'revoke insert, update, delete on public.skate_session_tricks from authenticated'
    );
  });

  it('defines the pause, resume, trick-log and active-session RPCs', () => {
    const migration = readPauseMigration();
    for (const fn of [
      'create or replace function public.get_active_skate_activity_session()',
      'create or replace function public.pause_skate_activity_session(p_session_id uuid)',
      'create or replace function public.resume_skate_activity_session(p_session_id uuid)',
      'create or replace function public.log_skate_session_trick(p_session_id uuid)',
    ]) {
      expect(migration).toContain(fn);
    }
    expect(migration).toContain('security definer');
    // The trick RPC inserts the record and bumps the count in one transaction.
    expect(migration).toContain('insert into public.skate_session_tricks (session_id, user_id)');
    expect(migration).toContain('set trick_count = trick_count + 1');
    // A trick cannot be logged while the session is paused.
    expect(migration).toContain("raise exception 'session is paused'");
    // Resume accumulates the open pause into the total.
    expect(migration).toContain('paused_total_seconds = v_session.paused_total_seconds');
    expect(migration).toContain('extract(epoch from (now() - v_session.paused_at))');
  });

  it('makes finish bill active time only and keep server-persisted tricks', () => {
    const migration = readPauseMigration();
    expect(migration).toContain('create or replace function public.finish_skate_activity_session(');
    expect(migration).toContain('- coalesce(v_session.paused_total_seconds, 0)');
    expect(migration).toContain(
      'v_tricks := greatest(v_tricks, coalesce(v_session.trick_count, 0))'
    );
    expect(migration).toContain('v_active_seconds');
    // The server feed insert stays the single feed entry for a finish.
    expect(migration).toContain('insert into public.activity_feed(');
  });

  it('makes start return the resume state so a resumed session restores exactly', () => {
    const migration = readPauseMigration();
    expect(migration).toContain("'paused_total_seconds', v_session.paused_total_seconds");
    expect(migration).toContain("'paused_at', v_session.paused_at");
    expect(migration).toContain("'trick_count', v_session.trick_count");
  });

  it('wires the screen to real pause, resume, recovery and persisted tricks — with no second feed write', () => {
    const screen = readSource('screens', 'ActiveSessionScreen.tsx');
    expect(screen).not.toContain('feedService');
    expect(screen).not.toContain('feedService.create');
    expect(screen).toContain(
      "import { activitySessionsService, ActiveSessionSummary } from '../lib/activitySessionsService'"
    );
    expect(screen).toContain('activitySessionsService.getActive()');
    expect(screen).toContain('activitySessionsService.pause(serverSessionId)');
    expect(screen).toContain('activitySessionsService.resume(serverSessionId)');
    expect(screen).toContain('activitySessionsService.logTrick(serverSessionId)');
    expect(screen).toContain('Resume your session?');
    expect(screen).toContain('timerRef.current.pause()');
    expect(screen).toContain('timerRef.current.resume(result.paused_total_seconds)');
    expect(screen).toContain('attachToServerSession');
  });

  it('adds the history read in a new module and leaves sessionsService untouched', () => {
    const service = readSource('lib', 'activitySessionsService.ts');
    expect(service).toContain('listFinished');
    expect(service).toContain(".from('skate_activity_sessions')");
    expect(service).toContain(".eq('status', 'completed')");
    expect(service).toContain("order('ended_at', { ascending: false })");
    const sessionsService = readSource('lib', 'sessionsService.ts');
    expect(sessionsService).not.toContain('skate_activity_sessions');
    expect(sessionsService).not.toContain('activitySessionsService');
    const sessionsScreen = readSource('screens', 'SessionsScreen.tsx');
    expect(sessionsScreen).toContain('Past Sessions');
    expect(sessionsScreen).toContain('activitySessionsService.listFinished()');
  });
});
