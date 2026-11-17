/// <reference path="../../types/testEnvShims.d.ts" />
import React from 'react';
import { Alert } from 'react-native';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import ActiveSessionScreen from '../../screens/ActiveSessionScreen';

const mockRpc = jest.fn();
const mockGetActive = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockLogTrick = jest.fn();
const mockGoBack = jest.fn();

jest.mock('../../stores/useAuthStore', () => ({
  useAuthStore: () => ({ user: { id: 'skater-a' } }),
}));
jest.mock('../../lib/useNavigation', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { spotId: 'spot-1', spotName: 'Downtown Plaza' } }),
}));
jest.mock('../../lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));
jest.mock('../../lib/activitySessionsService', () => ({
  activitySessionsService: {
    getActive: (...args: unknown[]) => mockGetActive(...args),
    pause: (...args: unknown[]) => mockPause(...args),
    resume: (...args: unknown[]) => mockResume(...args),
    logTrick: (...args: unknown[]) => mockLogTrick(...args),
  },
}));

const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

// The first test in this file pays a one-time ~6s render/setup cost on this
// VM (the repo's other screen test files show the same first-test cost);
// the default 5s timeout would fail it for environment reasons, not
// behavior. Assertions below are unchanged.
jest.setTimeout(30000);

// Explicit cleanup: the session screen runs a 1-second timer interval and
// an animation loop while live — unmount between tests so a previous
// test's live session can never leak into the next render.
afterEach(() => cleanup());

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function startRpcResult() {
  return {
    data: {
      session_id: 's-1',
      started_at: new Date().toISOString(),
      resumed: false,
    },
    error: null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAlert.mockClear();
  mockGetActive.mockResolvedValue(null);
  mockPause.mockResolvedValue({ paused_total_seconds: 0 });
  mockResume.mockResolvedValue({ paused_total_seconds: 0 });
  mockRpc.mockImplementation((name: string) => {
    if (name === 'start_skate_activity_session') return Promise.resolve(startRpcResult());
    if (name === 'finish_skate_activity_session')
      return Promise.resolve({
        data: { session_id: 's-1', duration_minutes: 5, xp_awarded: 10, trick_count: 1 },
        error: null,
      });
    return Promise.resolve({ data: null, error: null });
  });
});

async function startSession(view: Awaited<ReturnType<typeof render>>) {
  await fireEvent.press(view.getByText('Start session'));
  await waitFor(() => expect(view.getByText('Pause')).toBeTruthy());
  expect(mockRpc).toHaveBeenCalledWith('start_skate_activity_session', {
    p_spot_id: 'spot-1',
    p_spot_name: 'Downtown Plaza',
  });
}

describe('ActiveSessionScreen trick queue races (PR #434 P1)', () => {
  it('drains queued trick writes before pausing and ignores taps during the drain', async () => {
    const trick1 = deferred<{ trick_count: number }>();
    mockLogTrick.mockReturnValueOnce(trick1.promise);

    const view = await render(<ActiveSessionScreen />);
    await startSession(view);

    await fireEvent.press(view.getByText('Landed one?'));
    await waitFor(() => expect(mockLogTrick).toHaveBeenCalledTimes(1));

    // Trick RPC is still in flight: pause must not be issued yet.
    await fireEvent.press(view.getByText('Pause'));
    expect(mockPause).not.toHaveBeenCalled();

    // A tap during the drain is ignored — no second trick write is queued.
    await fireEvent.press(view.getByText('Landed one?'));
    expect(mockLogTrick).toHaveBeenCalledTimes(1);

    // Once the trick lands, the pause goes through.
    trick1.resolve({ trick_count: 1 });
    await waitFor(() => expect(mockPause).toHaveBeenCalledWith('s-1'));
    await waitFor(() => expect(view.getByText('Resume')).toBeTruthy());
  });

  it('drains queued trick writes before finishing and reports the drained count', async () => {
    const trick1 = deferred<{ trick_count: number }>();
    mockLogTrick.mockReturnValueOnce(trick1.promise);

    const view = await render(<ActiveSessionScreen />);
    await startSession(view);

    await fireEvent.press(view.getByText('Landed one?'));
    await waitFor(() => expect(mockLogTrick).toHaveBeenCalledTimes(1));

    await fireEvent.press(view.getByText('End'));
    await waitFor(() => expect(view.getByText('Save & end')).toBeTruthy());
    await fireEvent.press(view.getByText('Save & end'));

    // Finish must wait for the trick write instead of overtaking it.
    expect(mockRpc).not.toHaveBeenCalledWith('finish_skate_activity_session', expect.anything());

    trick1.resolve({ trick_count: 1 });
    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith('finish_skate_activity_session', {
        p_session_id: 's-1',
        p_trick_count: 1,
      })
    );
  });

  it('keeps pending increments when an earlier trick response lands and a later one fails', async () => {
    const trick1 = deferred<{ trick_count: number }>();
    const trick2 = deferred<{ trick_count: number }>();
    mockLogTrick.mockReturnValueOnce(trick1.promise).mockReturnValueOnce(trick2.promise);

    const view = await render(<ActiveSessionScreen />);
    await startSession(view);

    // Two taps before the first RPC completes: display is 2, one RPC in flight.
    await fireEvent.press(view.getByText('Landed one?'));
    await fireEvent.press(view.getByText('Landed one?'));
    await waitFor(() => expect(mockLogTrick).toHaveBeenCalledTimes(1));
    expect(view.getByText('2')).toBeTruthy();

    // First success reconciles confirmed to 1 — the pending second tap
    // keeps the display at 2 instead of dropping it to 1.
    trick1.resolve({ trick_count: 1 });
    await waitFor(() => expect(mockLogTrick).toHaveBeenCalledTimes(2));
    expect(view.getByText('2')).toBeTruthy();

    // Second tap fails: only its own increment rolls back — display is 1,
    // matching the one trick the server actually saved.
    trick2.reject(new Error('offline'));
    await waitFor(() => expect(view.getByText('1')).toBeTruthy());
    expect(mockAlert).toHaveBeenCalledWith('Trick not saved', expect.any(String));
  });

  it('reconciles to the server count when both rapid taps succeed', async () => {
    const trick1 = deferred<{ trick_count: number }>();
    const trick2 = deferred<{ trick_count: number }>();
    mockLogTrick.mockReturnValueOnce(trick1.promise).mockReturnValueOnce(trick2.promise);

    const view = await render(<ActiveSessionScreen />);
    await startSession(view);

    await fireEvent.press(view.getByText('Landed one?'));
    await fireEvent.press(view.getByText('Landed one?'));
    await waitFor(() => expect(mockLogTrick).toHaveBeenCalledTimes(1));
    expect(view.getByText('2')).toBeTruthy();

    trick1.resolve({ trick_count: 1 });
    await waitFor(() => expect(mockLogTrick).toHaveBeenCalledTimes(2));
    trick2.resolve({ trick_count: 2 });
    await waitFor(() => expect(view.getByText('2')).toBeTruthy());
  });

  it('allows taps again after a pause fails', async () => {
    mockPause.mockRejectedValue(new Error('offline'));

    const view = await render(<ActiveSessionScreen />);
    await startSession(view);

    await fireEvent.press(view.getByText('Pause'));
    await waitFor(() =>
      expect(mockAlert).toHaveBeenCalledWith('Could not pause', expect.any(String))
    );
    // The timer kept running, so the session is still live and tappable.
    expect(view.getByText('Pause')).toBeTruthy();

    mockLogTrick.mockResolvedValue({ trick_count: 1 });
    await fireEvent.press(view.getByText('Landed one?'));
    await waitFor(() => expect(mockLogTrick).toHaveBeenCalledTimes(1));
  });

  it('allows taps again after pausing and resuming', async () => {
    const view = await render(<ActiveSessionScreen />);
    await startSession(view);

    await fireEvent.press(view.getByText('Pause'));
    await waitFor(() => expect(view.getByText('Resume')).toBeTruthy());

    await fireEvent.press(view.getByText('Resume'));
    await waitFor(() => expect(view.getByText('Pause')).toBeTruthy());

    mockLogTrick.mockResolvedValue({ trick_count: 1 });
    await fireEvent.press(view.getByText('Landed one?'));
    await waitFor(() => expect(mockLogTrick).toHaveBeenCalledTimes(1));
  });
});
