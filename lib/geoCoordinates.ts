/** Parse a real geographic point from navigation or Mapbox input. */
export function parseMapCoordinates(
  latitude: unknown,
  longitude: unknown
): [number, number] | null {
  if (
    (typeof latitude !== 'number' && typeof latitude !== 'string') ||
    (typeof longitude !== 'number' && typeof longitude !== 'string')
  ) {
    return null;
  }

  if (
    (typeof latitude === 'string' && !latitude.trim()) ||
    (typeof longitude === 'string' && !longitude.trim())
  ) {
    return null;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return [lng, lat];
}
