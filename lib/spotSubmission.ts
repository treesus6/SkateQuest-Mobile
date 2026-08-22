const COORDINATE_EPSILON = 0.000001;

function parseFiniteCoordinate(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;

  const normalized = String(value).trim();
  if (!normalized) return null;

  const coordinate = Number(normalized);
  return Number.isFinite(coordinate) ? coordinate : null;
}

export function parseSpotCoordinates(
  latitudeInput: unknown,
  longitudeInput: unknown
): [number, number] | null {
  const latitude = parseFiniteCoordinate(latitudeInput);
  const longitude = parseFiniteCoordinate(longitudeInput);

  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return [longitude, latitude];
}

export interface PersistedSpotExpectation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  addedBy: string;
}

export function getSpotPersistenceError(
  saved: unknown,
  expected: PersistedSpotExpectation
): string | null {
  if (!saved || typeof saved !== 'object') {
    return 'The saved spot could not be read back.';
  }

  const row = saved as Record<string, unknown>;
  if (row.id !== expected.id) {
    return 'The saved spot returned a different ID.';
  }
  if (row.added_by !== expected.addedBy) {
    return 'The saved spot owner could not be verified.';
  }
  if (row.name !== expected.name) {
    return 'The saved spot name could not be verified.';
  }

  const latitude = parseFiniteCoordinate(row.latitude);
  const longitude = parseFiniteCoordinate(row.longitude);
  if (
    latitude === null ||
    longitude === null ||
    Math.abs(latitude - expected.latitude) > COORDINATE_EPSILON ||
    Math.abs(longitude - expected.longitude) > COORDINATE_EPSILON
  ) {
    return 'The saved spot coordinates could not be verified.';
  }

  return null;
}
