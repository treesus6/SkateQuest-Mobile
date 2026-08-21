export const WEBGL_UNAVAILABLE_MESSAGE =
  'This browser cannot start the interactive map because WebGL is unavailable or blocked.';

export function getMapboxAvailabilityError(
  mapbox: MapboxGLGlobal | undefined,
  token: string | undefined
): string | null {
  if (!mapbox) {
    return 'The interactive map library did not load. Check your connection and try again.';
  }
  if (!token) {
    return 'The interactive map is not configured.';
  }

  try {
    if (typeof mapbox.supported === 'function' && !mapbox.supported()) {
      return WEBGL_UNAVAILABLE_MESSAGE;
    }
  } catch {
    return WEBGL_UNAVAILABLE_MESSAGE;
  }

  return null;
}

export function getMapInitializationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes('webgl')) {
    return WEBGL_UNAVAILABLE_MESSAGE;
  }

  return 'The interactive map could not be started. Check your browser graphics settings and try again.';
}