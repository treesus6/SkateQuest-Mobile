import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import SessionsScreen from '../../screens/SessionsScreen';

const mockUserRef: { current: { id: string } | null } = { current: { id: 'skater-a' } };
const mockFetchSessions = jest.fn();

jest.mock('../../stores/useAuthStore', () => ({
  useAuthStore: () => ({ user: mockUserRef.current }),
}));
jest.mock('../../lib/useNavigation', () => ({
  useRoute: () => ({ params: {} }),
}));
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () =>
        table === 'skate_sessions'
          ? { gte: () => ({ order: () => mockFetchSessions() }) }
          : { in: () => Promise.resolve({ data: [], error: null }) },
    }),
  },
}));
jest.mock('../../components/ui', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ScreenFadeIn: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    AnimatedListItem: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

function session(id: string, title: string, creatorId: string) {
  return {
    id,
    title,
    creator_id: creatorId,
    scheduled_time: '2026-11-07T21:00:00.000Z',
    participants: [creatorId],
    max_participants: null,
    spot_id: null,
    spot_name: null,
    description: null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUserRef.current = { id: 'skater-a' };
});

it('clears the previous account sessions immediately after logout', async () => {
  mockFetchSessions.mockResolvedValue({
    data: [session('session-a', 'Session from account A', 'skater-a')],
    error: null,
  });

  const view = await render(<SessionsScreen />);
  await waitFor(() => expect(view.getByText('Session from account A')).toBeTruthy());

  mockUserRef.current = null;
  await view.rerender(<SessionsScreen />);

  await waitFor(() => expect(view.queryByText('Session from account A')).toBeNull());
});

it('ignores an old account response after switching to a different account', async () => {
  let resolveOld!: (value: unknown) => void;
  mockFetchSessions
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveOld = resolve;
        })
    )
    .mockResolvedValueOnce({
      data: [session('session-b', 'Session from account B', 'skater-b')],
      error: null,
    });

  const view = await render(<SessionsScreen />);
  mockUserRef.current = { id: 'skater-b' };
  await view.rerender(<SessionsScreen />);

  await waitFor(() => expect(view.getByText('Session from account B')).toBeTruthy());

  await act(async () => {
    resolveOld({
      data: [session('session-a', 'Session from account A', 'skater-a')],
      error: null,
    });
  });

  expect(view.getByText('Session from account B')).toBeTruthy();
  expect(view.queryByText('Session from account A')).toBeNull();
});
