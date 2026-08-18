import { BrowserLocationError, getBrowserLocation } from '../lib/browserLocation';

describe('browser location adapter', () => {
  const originalGeolocation = navigator.geolocation;

  afterEach(() => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    });
  });

  it('returns browser coordinates without creating local app state', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) =>
          success({
            coords: { latitude: 37.7, longitude: -122.4, accuracy: 8 },
          } as GeolocationPosition),
      },
    });
    await expect(getBrowserLocation()).resolves.toEqual({
      latitude: 37.7,
      longitude: -122.4,
      accuracy: 8,
    });
  });

  it('provides an actionable Safari permission error', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) =>
          failure({
            code: 1,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
            message: 'denied',
          }),
      },
    });
    await expect(getBrowserLocation()).rejects.toMatchObject<BrowserLocationError>({
      code: 'permission-denied',
    });
  });
});
