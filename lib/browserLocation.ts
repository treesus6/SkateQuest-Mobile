export interface BrowserCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export type BrowserLocationErrorCode =
  | 'unsupported'
  | 'insecure-context'
  | 'permission-denied'
  | 'unavailable'
  | 'timeout';

export class BrowserLocationError extends Error {
  constructor(
    public readonly code: BrowserLocationErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'BrowserLocationError';
  }
}

function requestPosition(options: PositionOptions): Promise<BrowserCoordinates> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      error => reject(error),
      options
    );
  });
}

function toBrowserLocationError(error: GeolocationPositionError): BrowserLocationError {
  const code: BrowserLocationErrorCode =
    error.code === error.PERMISSION_DENIED
      ? 'permission-denied'
      : error.code === error.TIMEOUT
        ? 'timeout'
        : 'unavailable';

  const message =
    code === 'permission-denied'
      ? 'Location access is blocked for SkateQuest. Allow location for this site in your browser settings, then tap the location button again.'
      : code === 'timeout'
        ? 'Your phone did not return a location yet. Make sure Location is turned on, then tap the location button again.'
        : 'Your current location is unavailable. Make sure Location is turned on and try again.';

  return new BrowserLocationError(code, message);
}

export async function getBrowserLocation(timeout = 30000): Promise<BrowserCoordinates> {
  if (typeof window === 'undefined' || !window.isSecureContext) {
    throw new BrowserLocationError(
      'insecure-context',
      'Location requires a secure HTTPS connection.'
    );
  }

  if (!navigator.geolocation) {
    throw new BrowserLocationError(
      'unsupported',
      'This browser does not provide location services.'
    );
  }

  // Mobile browsers can take a long time to satisfy a high-accuracy GPS request,
  // especially indoors. First accept a recent/coarse device position so the map
  // can center quickly, then fall back to a fresh high-accuracy request.
  try {
    return await requestPosition({
      enableHighAccuracy: false,
      timeout: Math.min(timeout, 12000),
      maximumAge: 5 * 60 * 1000,
    });
  } catch (firstError) {
    const geoError = firstError as GeolocationPositionError;
    if (geoError.code === geoError.PERMISSION_DENIED) {
      throw toBrowserLocationError(geoError);
    }
  }

  try {
    return await requestPosition({
      enableHighAccuracy: true,
      timeout: Math.max(timeout, 25000),
      maximumAge: 60 * 1000,
    });
  } catch (secondError) {
    throw toBrowserLocationError(secondError as GeolocationPositionError);
  }
}
