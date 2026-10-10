import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import HomeSceneScreen from '../../screens/HomeSceneScreen';

const mockNavigate = jest.fn();
let mockUser = { id: 'first-user' };
let mockResult: (table: string) => any;
jest.mock('../../stores/useAuthStore', () => ({ useAuthStore: () => ({ user: mockUser }) }));
jest.mock('../../lib/useNavigation', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../lib/logger', () => ({ Logger: { error: jest.fn() } }));
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const query: any = {};
      ['select', 'eq', 'gt', 'order'].forEach(method => {
        query[method] = () => query;
      });
      query.single = query.limit = () => mockResult(table);
      return query;
    },
  },
}));

const success = (table: string) =>
  Promise.resolve({
    data: table === 'profiles' ? { username: 'tree' } : [],
    error: null,
  });

describe('Home scene loading', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUser = { id: 'first-user' };
    mockResult = success;
    mockNavigate.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('opens the upload route from POST', async () => {
    const screen = await render(<HomeSceneScreen />);
    await fireEvent.press(screen.getByLabelText('POST. Drop a real clip'));
    expect(mockNavigate).toHaveBeenCalledWith('UploadMedia');
  });

  it('retains loaded content on refresh failure and recovers through retry', async () => {
    const screen = await render(<HomeSceneScreen />);
    expect(screen.getByText('Yo, @tree')).toBeTruthy();
    mockResult = () => Promise.resolve({ data: null, error: { message: 'offline' } });
    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    expect(screen.getByText('Couldn’t refresh the scene')).toBeTruthy();
    expect(screen.getByText('Yo, @tree')).toBeTruthy();
    mockResult = success;
    await fireEvent.press(screen.getByLabelText('Retry loading the scene'));
    expect(screen.queryByText('Couldn’t refresh the scene')).toBeNull();
  });

  it('shows a retryable failure for a rejected request instead of an empty scene', async () => {
    mockResult = () => Promise.reject(new Error('offline'));
    const screen = await render(<HomeSceneScreen />);
    expect(screen.getByText('Couldn’t refresh the scene')).toBeTruthy();
    expect(screen.queryByText('No active check-ins right now.')).toBeNull();
    mockResult = success;
    await fireEvent.press(screen.getByLabelText('Retry loading the scene'));
    expect(screen.getByText('Yo, @tree')).toBeTruthy();
  });

  it('clears the prior account when the next account cannot load', async () => {
    const screen = await render(<HomeSceneScreen />);
    mockUser = { id: 'second-user' };
    mockResult = () => Promise.resolve({ data: null, error: { message: 'offline' } });
    await screen.rerender(<HomeSceneScreen />);
    expect(screen.queryByText('Yo, @tree')).toBeNull();
    expect(screen.getByText('Couldn’t refresh the scene')).toBeTruthy();
  });

  it('refreshes successful sections when another section fails', async () => {
    const screen = await render(<HomeSceneScreen />);
    mockResult = table =>
      Promise.resolve(
        table === 'skatetv_clips'
          ? { data: null, error: { message: 'clip read failed' } }
          : { data: table === 'profiles' ? { username: 'updated-tree' } : [], error: null }
      );
    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    expect(screen.getByText('Yo, @updated-tree')).toBeTruthy();
    expect(screen.getByText('Couldn’t refresh the scene')).toBeTruthy();
  });

  it('ignores a late response from the previous account', async () => {
    let resolveProfile: (value: any) => void = () => {};
    mockResult = table =>
      table === 'profiles'
        ? new Promise(resolve => {
            resolveProfile = resolve;
          })
        : success(table);
    const screen = await render(<HomeSceneScreen />);
    mockUser = { id: 'second-user' };
    mockResult = table =>
      Promise.resolve({
        data: table === 'profiles' ? { username: 'new-skater' } : [],
        error: null,
      });
    await screen.rerender(<HomeSceneScreen />);
    await act(async () => {
      resolveProfile({ data: { username: 'old-skater' }, error: null });
    });
    expect(screen.getByText('Yo, @new-skater')).toBeTruthy();
    expect(screen.queryByText('Yo, @old-skater')).toBeNull();
  });
});
