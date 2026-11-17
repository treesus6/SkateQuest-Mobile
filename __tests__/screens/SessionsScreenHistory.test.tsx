import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SessionsScreen from '../../screens/SessionsScreen';

const mockUserRef: { current: { id: string } | null } = { current: { id: 'skater-a' } };
const mockFetchSessions = jest.fn();
const mockListFinished = jest.fn();

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
jest.mock('../../lib/activitySessionsService', () => ({
  activitySessionsService: { listFinished: (...args: unknown[]) => mockListFinished(...args) },
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

function finishedSession(id: string, spotName: string) {
  return {
    id,
    spot_name: spotName,
    started_at: '2026-11-16T18:00:00.000Z',
    ended_at: '2026-11-16T18:45:00.000Z',
    duration_minutes: 45,
    trick_count: 7,
    xp_awarded: 90,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUserRef.current = { id: 'skater-a' };
  mockFetchSessions.mockResolvedValue({ data: [], error: null });
});

it('shows finished activity sessions on the Past Sessions tab', async () => {
  mockListFinished.mockResolvedValue([finishedSession('past-1', 'Downtown Plaza')]);

  const view = await render(<SessionsScreen />);
  await waitFor(() => expect(view.getByText('Past Sessions')).toBeTruthy());

  // History is lazy: nothing is read until the tab opens.
  expect(mockListFinished).not.toHaveBeenCalled();

  fireEvent.press(view.getByText('Past Sessions'));

  await waitFor(() => expect(mockListFinished).toHaveBeenCalled());
  await waitFor(() => expect(view.getByText('Downtown Plaza')).toBeTruthy());
  expect(view.getByText('45 min · 7 tricks')).toBeTruthy();
  expect(view.getByText('+90 XP')).toBeTruthy();
});

it('shows the real failure state when the history read fails', async () => {
  mockListFinished.mockRejectedValue(new Error('Failed to load past sessions'));

  const view = await render(<SessionsScreen />);
  await waitFor(() => expect(view.getByText('Past Sessions')).toBeTruthy());
  fireEvent.press(view.getByText('Past Sessions'));

  await waitFor(() => expect(view.getByText('Could not load past sessions')).toBeTruthy());
  expect(view.getByText('Failed to load past sessions')).toBeTruthy();
});

it('shows an honest empty state when there is no finished-session history', async () => {
  mockListFinished.mockResolvedValue([]);

  const view = await render(<SessionsScreen />);
  await waitFor(() => expect(view.getByText('Past Sessions')).toBeTruthy());
  fireEvent.press(view.getByText('Past Sessions'));

  await waitFor(() => expect(view.getByText('No past sessions yet')).toBeTruthy());
});
