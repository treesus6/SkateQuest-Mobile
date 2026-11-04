import React from 'react';
import { render } from '@testing-library/react-native';
import LeaderboardScreen from '../../screens/LeaderboardScreen';

let mockLeaders: Record<string, unknown>[] = [];
const mockRefetch = jest.fn();
jest.mock('../../hooks/useSupabaseQuery', () => ({
  useSupabaseQuery: () => ({ data: mockLeaders, loading: false, refetch: mockRefetch }),
}), { virtual: true });
jest.mock('../../lib/useNavigation', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}), { virtual: true });
jest.mock('../../lib/supabase', () => ({
  supabase: {
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: jest.fn() }) }),
    }),
  },
}));

describe('Leaderboard profile schema compatibility', () => {
  it('shows actual level and XP without inventing a missing spot count', async () => {
    mockLeaders = [{ id: 'user-1', username: 'Skater', level: 2, xp: 100 }];
    const screen = await render(<LeaderboardScreen />);
    expect(screen.getByText('Level 2')).toBeTruthy();
    expect(screen.queryByText(/undefined spots|0 spots/)).toBeNull();
  });

  it('preserves a supplied legacy spot count, including zero', async () => {
    mockLeaders = [{ id: 'user-1', username: 'Skater', level: 2, xp: 100, spots_added: 0 }];
    const screen = await render(<LeaderboardScreen />);
    expect(screen.getByText('Level 2 · 0 spots')).toBeTruthy();
  });
});
