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
  ratings?: {
    potential: number;
    difficulty: number;
    quality: number;
  };
}

function matchesRating(value: unknown, expected: number): boolean {
  const rating = parseFiniteCoordinate(value);
  return rating !== null && Math.abs(rating - expected) <= COORDINATE_EPSILON;
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

  if (expected.ratings) {
    if (!matchesRating(row.potential_rating, expected.ratings.potential)) {
      return 'The saved spot potential rating could not be verified.';
    }
    if (!matchesRating(row.difficulty_rating, expected.ratings.difficulty)) {
      return 'The saved spot difficulty rating could not be verified.';
    }
    if (!matchesRating(row.rating, expected.ratings.quality)) {
      return 'The saved spot quality rating could not be verified.';
    }
    const ratingCount = parseFiniteCoordinate(row.rating_count);
    if (ratingCount === null || ratingCount < 1) {
      return 'The saved spot rating count could not be verified.';
    }
  }

  return null;
}

export function getSpotCreationErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Please try again.';

  const record = error as Record<string, unknown>;
  const code = typeof record.code === 'string' ? record.code : '';
  const message = typeof record.message === 'string' ? record.message : '';
  if (code === '23505' || message.toLowerCase().includes('already exists here')) {
    return message || 'A skate spot already exists at this pin. Open the existing spot instead.';
  }

  return message || 'Please try again.';
}
