import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import NativeAddSpot from '../../screens/AddSpotScreen.native';
import WebAddSpot from '../../screens/AddSpotScreen.web';
import { getBrowserLocation } from '../../lib/browserLocation';
import { useRoute } from '../../lib/useNavigation';

jest.mock('../../lib/useNavigation', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: jest.fn(() => ({ params: {} })),
}));
jest.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (selector?: (state: unknown) => unknown) => {
    const state = { user: { id: 'test-user' } };
    return selector ? selector(state) : state;
  },
}));
jest.mock('../../lib/spotsService', () => ({ spotsService: {} }));
jest.mock('../../lib/mediaUpload', () => ({}));
jest.mock('../../lib/browserLocation', () => ({ getBrowserLocation: jest.fn() }));
jest.mock('../../lib/mapboxSetup', () => ({ isMapboxConfigured: true }));
jest.mock('../../lib/logger', () => ({ Logger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock('@rnmapbox/maps', () => ({
  __esModule: true,
  default: {
    MapView: (props: any) =>
      require('react').createElement(require('react-native').View, {
        ...props,
        testID: 'spot-map',
      }),
    Camera: () => null,
    PointAnnotation: 'PointAnnotation',
    UserLocation: 'UserLocation',
    StyleURL: { Street: 'street' },
  },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useRoute as jest.Mock).mockReturnValue({ params: {} });
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
    status: 'granted',
  });
});

it.each(['resolve', 'reject'] as const)(
  'native manual pin survives a stale GPS %s',
  async outcome => {
    const gps = deferred<unknown>();
    (Location.getCurrentPositionAsync as jest.Mock).mockReturnValue(gps.promise);
    const view = await render(<NativeAddSpot />);
    await waitFor(() => expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1));
    await fireEvent(view.getByTestId('spot-map'), 'press', {
      geometry: { coordinates: [-122.66, 45.63] },
    });
    await act(async () => {
      if (outcome === 'resolve') gps.resolve({ coords: { longitude: -118, latitude: 34 } });
      else gps.reject(new Error('GPS timed out'));
    });
    expect(view.getByText('45.63000, -122.66000')).toBeTruthy();
    expect(view.queryByText('GPS timed out')).toBeNull();
    expect(view.getByLabelText('Use my location')).not.toBeDisabled();
  }
);

it('native pin selection during permission prompt prevents a GPS request', async () => {
  const permission = deferred<unknown>();
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockReturnValue(permission.promise);
  const view = await render(<NativeAddSpot />);
  await fireEvent(view.getByTestId('spot-map'), 'press', {
    geometry: { coordinates: [-122.66, 45.63] },
  });
  await act(async () => permission.resolve({ status: 'granted' }));
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  expect(view.getByText('45.63000, -122.66000')).toBeTruthy();
});

it.each([
  { latitude: '', longitude: '' },
  { latitude: null, longitude: null },
  { latitude: '91', longitude: '0' },
  { latitude: '0', longitude: '181' },
])('native rejects invalid route coordinates %p', async params => {
  (useRoute as jest.Mock).mockReturnValue({ params });
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
  const view = await render(<NativeAddSpot />);
  expect(view.getByText('Choose a real location')).toBeTruthy();
  expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
});

it('native preserves explicit zero coordinates without requesting GPS', async () => {
  (useRoute as jest.Mock).mockReturnValue({ params: { latitude: '0', longitude: '0' } });
  const view = await render(<NativeAddSpot />);
  expect(view.getByText('0.00000, 0.00000')).toBeTruthy();
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
});

it.each(['resolve', 'reject'] as const)(
  'web manual coordinates survive a stale GPS %s',
  async outcome => {
    const gps = deferred<unknown>();
    (getBrowserLocation as jest.Mock).mockReturnValue(gps.promise);
    const view = await render(<WebAddSpot />);
    await fireEvent.press(view.getByText('USE MY REAL LOCATION'));
    await fireEvent.changeText(view.getByLabelText('Latitude'), '45.63');
    await fireEvent.changeText(view.getByLabelText('Longitude'), '-122.66');
    await fireEvent.press(view.getByText('LOCK THESE COORDINATES'));
    await act(async () => {
      if (outcome === 'resolve') gps.resolve({ longitude: -118, latitude: 34 });
      else gps.reject(new Error('GPS timed out'));
    });
    expect(view.getByText('45.630000, -122.660000')).toBeTruthy();
    expect(view.queryByText('GPS timed out')).toBeNull();
  }
);

it('web uses the most recent GPS request when responses arrive out of order', async () => {
  const first = deferred<unknown>();
  const second = deferred<unknown>();
  (getBrowserLocation as jest.Mock)
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const view = await render(<WebAddSpot />);
  await fireEvent.press(view.getByText('USE MY REAL LOCATION'));
  await fireEvent.press(view.getByText('USE MY REAL LOCATION'));
  await act(async () => second.resolve({ latitude: 45.63, longitude: -122.66 }));
  await act(async () => first.resolve({ latitude: 34, longitude: -118 }));
  expect(view.getByText('45.630000, -122.660000')).toBeTruthy();
});
