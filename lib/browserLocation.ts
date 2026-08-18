export interface BrowserCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export type BrowserLocationErrorCode =
  'unsupported' | 'insecure-context' | 'permission-denied' | 'unavailable' | 'timeout';

export class BrowserLocationError extends Error {
  constructor(
    public readonly code: BrowserLocationErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'BrowserLocationError';
  }
}

export function getBrowserLocation(timeout = 15000): Promise<BrowserCoordinates> {
  if (typeof window === 'undefined' || !window.isSecureContext) {
    return Promise.reject(
      new BrowserLocationError('insecure-context', 'Location requires a secure HTTPS connection.')
    );
  }
  if (!navigator.geolocation) {
    return Promise.reject(
      new BrowserLocationError('unsupported', 'This browser does not provide location services.')
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      error => {
        const code: BrowserLocationErrorCode =
          error.code === error.PERMISSION_DENIED
            ? 'permission-denied'
            : error.code === error.TIMEOUT
              ? 'timeout'
              : 'unavailable';
        const message =
          code === 'permission-denied'
            ? 'Location access was denied. Enable it in Safari Settings to show nearby spots.'
            : code === 'timeout'
              ? 'Location took too long. Check your connection and try again.'
              : 'Your current location is unavailable. Try again outdoors or check Location Services.';
        reject(new BrowserLocationError(code, message));
      },
      { enableHighAccuracy: true, timeout, maximumAge: 30000 }
    );
  });
}
