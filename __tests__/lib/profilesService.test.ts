import { profilesService } from '../../lib/profilesService';
import type { UserProfile } from '../../types';

const mockFetch = jest.fn();
jest.mock('../../lib/supabase', () => {
  const { createClient } = jest.requireActual('@supabase/supabase-js');
  return {
    supabase: createClient('https://example.supabase.co', 'test-publishable-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (...args: unknown[]) => mockFetch(...args) },
    }),
  };
});
jest.mock('../../lib/logger', () => ({ Logger: { error: jest.fn() } }));

const publicProfile = { id: 'user-1', username: 'Skater', xp: 100, level: 2 };
const sensitiveColumns = [
  'birthdate', 'is_minor', 'parent_email', 'parental_consent_given',
  'account_verified', 'push_token', 'push_token_updated_at',
];

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Forbidden',
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  };
}

describe('profilesService public projection compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockImplementation(async (url: string, options: { headers: Headers }) => {
      const selection = new URL(url).searchParams.get('select') || '*';
      const columns = selection.split(',');
      // Model the planned column-level grants at the actual HTTP boundary.
      // Wildcards fail even for the owner; RLS cannot override column permissions.
      if (columns.includes('*') || columns.some(column => sensitiveColumns.includes(column))) {
        return response({ code: '42501', message: 'permission denied for table profiles' }, 403);
      }
      const single = options.headers.get('Accept')?.includes('object');
      return response(single ? publicProfile : [publicProfile]);
    });
  });

  it('loads an owner or public profile without requiring sensitive-column SELECT', async () => {
    const result = await profilesService.getById('user-1');
    // Compile-time caller contract: the live schema has no spots_added column.
    const profile: UserProfile | null = result.data;
    expect(result.error).toBeNull();
    expect(profile?.id).toBe('user-1');
    expect(result.data).toMatchObject({ id: 'user-1', username: 'Skater', xp: 100, level: 2 });
    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get('id')).toBe('eq.user-1');
    expect(url.searchParams.get('select')?.split(',')).toEqual(expect.arrayContaining([
      'id', 'username', 'display_name', 'avatar_url', 'xp', 'level', 'tricks_landed',
      'total_sessions', 'current_streak', 'charity_points', 'is_public',
    ]));
  });

  it('loads the XP-ordered leaderboard with the same safe projection', async () => {
    const result = await profilesService.getLeaderboard(12);
    const profiles: UserProfile[] | null = result.data;
    expect(result.error).toBeNull();
    expect(profiles?.[0].id).toBe('user-1');
    expect(result.data).toEqual([publicProfile]);
    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get('order')).toBe('xp.desc');
    expect(url.searchParams.get('limit')).toBe('12');
  });

  it('reads back profile creation without selecting sensitive columns', async () => {
    const result = await profilesService.create({
      id: 'user-1', username: 'Skater', level: 1, xp: 0, spots_added: 0,
      challenges_completed: [],
    });
    expect(result.error).toBeNull();
    expect(result.data?.id).toBe('user-1');
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)[0].username).toBe('Skater');
  });

  it('reads back owner updates without selecting sensitive columns', async () => {
    const result = await profilesService.update('user-1', { display_name: 'Skater' });
    expect(result.error).toBeNull();
    expect(result.data?.id).toBe('user-1');
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ display_name: 'Skater' });
    expect(new URL(mockFetch.mock.calls[0][0]).searchParams.get('id')).toBe('eq.user-1');
  });

  it('preserves real API errors instead of treating a denied read as success', async () => {
    mockFetch.mockResolvedValue(response({ code: '42501', message: 'access denied' }, 403));
    const result = await profilesService.getById('user-1');
    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({ code: '42501', message: 'access denied' });
  });
});
