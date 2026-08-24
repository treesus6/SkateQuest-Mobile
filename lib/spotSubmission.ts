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
  potentialRating?: number;
  difficultyRating?: number;
  qualityRating?: number;
  ratingCount?: number;
  photoUrl?: string | null;
}

function readNumber(row: Record<string, unknown>, key: string): number | null {
  return parseFiniteCoordinate(row[key]);
}

function hasPersistedPhoto(row: Record<string, unknown>, expectedUrl: string): boolean {
  if (row.image_url === expectedUrl) return true;
  if (!Array.isArray(row.spot_photos)) return false;

  return row.spot_photos.some(photo => {
    if (!photo || typeof photo !== 'object') return false;
    const media = (photo as Record<string, unknown>).media;
    return (
      !!media && typeof media === 'object' && (media as Record<string, unknown>).url === expectedUrl
    );
  });
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

  const ratingChecks: Array<[keyof PersistedSpotExpectation, string, string]> = [
    ['potentialRating', 'potential_rating', 'potential'],
    ['difficultyRating', 'difficulty_rating', 'difficulty'],
    ['qualityRating', 'rating', 'quality'],
  ];
  for (const [expectedKey, persistedKey, label] of ratingChecks) {
    const expectedRating = expected[expectedKey];
    if (typeof expectedRating !== 'number') continue;
    const persistedRating = readNumber(row, persistedKey);
    if (persistedRating === null || Math.abs(persistedRating - expectedRating) > 0.01) {
      return `The saved spot ${label} rating could not be verified.`;
    }
  }

  if (typeof expected.ratingCount === 'number') {
    const ratingCount = readNumber(row, 'rating_count');
    if (ratingCount !== expected.ratingCount) {
      return 'The saved spot rating count could not be verified.';
    }
  }

  if (expected.photoUrl && !hasPersistedPhoto(row, expected.photoUrl)) {
    return 'The saved spot photo could not be read back.';
  }

  return null;
}

export function getSpotSubmissionErrorMessage(
  error: unknown,
  fallback = 'The spot could not be saved. Please try again.'
): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.trim()) return record.message;
    if (record.cause && typeof record.cause === 'object') {
      const causeMessage = (record.cause as Record<string, unknown>).message;
      if (typeof causeMessage === 'string' && causeMessage.trim()) return causeMessage;
    }
  }
  return fallback;
}
