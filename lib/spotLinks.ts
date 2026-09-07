const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeSpotId(value: unknown): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== 'string') return null;
  const spotId = candidate.trim();
  return UUID_PATTERN.test(spotId) ? spotId : null;
}

export function getSpotDetailPath(spotId: string): string {
  const normalized = normalizeSpotId(spotId);
  if (!normalized) throw new Error('A valid spot ID is required to create a spot link.');
  return `/spot-detail?spotId=${encodeURIComponent(normalized)}`;
}

export function getSpotShareUrl(spotId: string, origin = 'https://skatequest.me'): string {
  const safeOrigin = origin.replace(/\/+$/, '');
  return `${safeOrigin}${getSpotDetailPath(spotId)}`;
}
