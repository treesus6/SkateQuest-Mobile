const AUTH_ROUTES = new Set([
  '/callback',
  '/forgot-password',
  '/login',
  '/reset-password',
  '/signup',
]);
const STORAGE_KEY = 'skatequest.auth.returnTo';
let pendingReturnPath = '/';

type SearchParamValue = string | string[] | undefined;

/**
 * Build the exact in-app destination that should be restored after authentication.
 * Expo Router exposes the pathname and search params separately; keeping only the
 * pathname breaks deep links such as /spot-detail?spotId=<uuid>.
 */
export function buildAuthReturnPath(
  pathname: string,
  searchParams: Record<string, SearchParamValue> = {}
): string {
  const query = new URLSearchParams();

  Object.keys(searchParams)
    .sort()
    .forEach(key => {
      const value = searchParams[key];
      const values = Array.isArray(value) ? value : [value];
      values.forEach(item => {
        if (typeof item === 'string') query.append(key, item);
      });
    });

  const suffix = query.toString();
  return sanitizeAuthReturnPath(`${pathname}${suffix ? `?${suffix}` : ''}`);
}

export function sanitizeAuthReturnPath(value: unknown): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== 'string') return '/';

  const path = candidate.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return '/';

  const pathname = path.split(/[?#]/, 1)[0].replace(/\/$/, '') || '/';
  if (AUTH_ROUTES.has(pathname)) return '/';
  return path;
}

export function rememberAuthReturnPath(value: unknown): string {
  pendingReturnPath = sanitizeAuthReturnPath(value);
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage?.setItem(STORAGE_KEY, pendingReturnPath);
    }
  } catch {
    // Some privacy modes block sessionStorage; the in-memory path still works.
  }
  return pendingReturnPath;
}

export function getAuthReturnPath(): string {
  try {
    if (typeof window !== 'undefined') {
      const stored = window.sessionStorage?.getItem(STORAGE_KEY);
      if (stored) pendingReturnPath = sanitizeAuthReturnPath(stored);
    }
  } catch {
    // Fall back to the in-memory path when browser storage is unavailable.
  }
  return pendingReturnPath;
}
