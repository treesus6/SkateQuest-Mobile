import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform, Share } from 'react-native';
import SpotDetailScreen from '../../screens/SpotDetailScreen';
import { spotsService } from '../../lib/spotsService';

jest.mock('../../stores/useAuthStore', () => ({ useAuthStore: () => ({ user: null }) }));
jest.mock('../../lib/spotsService', () => ({ spotsService: { getById: jest.fn() } }));
jest.mock('../../lib/challengesService', () => ({
  challengesService: { getForSpot: jest.fn().mockResolvedValue({ data: [] }) },
}));
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [] }),
          }),
        }),
      }),
    }),
  },
}));
jest.mock('../../lib/mediaUpload', () => ({}));
jest.mock('../../lib/sessionsService', () => ({}));
jest.mock('../../components/KingOfTheHill', () => () => null);
jest.mock('../../components/TerritoryControl', () => () => null);
jest.mock('../../components/GhostClipViewer', () => () => null);
jest.mock('../../components/SpotMiniMap', () => () => null);
jest.mock('../../components/ui/LoadingSkeleton', () => () => null);

const SPOT_ID = '7f9d5ad6-e271-4ad2-8ca5-8e2537edb5bc';
const spot = { id: SPOT_ID, name: 'First spot', latitude: 45, longitude: -122 };
const getById = spotsService.getById as jest.Mock;
const screen = (spotId?: string) => (
  <SpotDetailScreen route={{ params: { spotId } }} navigation={{ navigate: jest.fn() }} />
);

beforeEach(() => {
  jest.clearAllMocks();
  getById.mockResolvedValue({ data: spot, error: null });
});

it.each([undefined, 'not-a-uuid'])('clears a loaded spot for invalid route %p', async spotId => {
  const view = await render(screen(SPOT_ID));
  await waitFor(() => expect(view.getByText('First spot')).toBeTruthy());
  await view.rerender(screen(spotId));
  expect(view.queryByText('First spot')).toBeNull();
  expect(view.getByText('This spot link is missing a valid spot ID.')).toBeTruthy();
  expect(getById).toHaveBeenCalledTimes(1);
  await view.rerender(screen(SPOT_ID));
  await waitFor(() => expect(view.getByText('First spot')).toBeTruthy());
  expect(getById).toHaveBeenCalledTimes(2);
});

it('does not restore an old spot when its request finishes after invalid navigation', async () => {
  let resolve!: (value: unknown) => void;
  getById.mockReturnValueOnce(
    new Promise(done => {
      resolve = done;
    })
  );
  const view = await render(screen(SPOT_ID));
  await view.rerender(screen());
  await act(async () => {
    resolve({ data: spot, error: null });
  });
  expect(view.queryByText('First spot')).toBeNull();
  expect(view.getByText('Spot unavailable')).toBeTruthy();
});

it.each([
  ['https://treesus6.github.io', 'https://treesus6.github.io/SkateQuest-Mobile'],
  ['null', 'https://skatequest.me'],
])('shares a usable link from browser origin %s', async (origin, expectedRoot) => {
  const previousLocation = Object.getOwnPropertyDescriptor(window, 'location');
  const previousOS = Platform.OS;
  const previousBase = process.env.EXPO_PUBLIC_BASE_URL;
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  try {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { origin },
    });
    process.env.EXPO_PUBLIC_BASE_URL = '/SkateQuest-Mobile/';
    const view = await render(screen(SPOT_ID));
    await waitFor(() => expect(view.getByLabelText('Share First spot')).toBeTruthy());
    await fireEvent.press(view.getByLabelText('Share First spot'));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${expectedRoot}/spot-detail?spotId=${SPOT_ID}`,
      })
    );
  } finally {
    if (previousLocation) Object.defineProperty(window, 'location', previousLocation);
    else Reflect.deleteProperty(window, 'location');
    Object.defineProperty(Platform, 'OS', { configurable: true, value: previousOS });
    if (previousBase === undefined) delete process.env.EXPO_PUBLIC_BASE_URL;
    else process.env.EXPO_PUBLIC_BASE_URL = previousBase;
    share.mockRestore();
  }
});
