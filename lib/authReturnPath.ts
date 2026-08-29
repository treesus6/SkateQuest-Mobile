const AUTH_ROUTES = new Set([
  '/callback',
  '/forgot-password',
  '/login',
  '/reset-password',
  '/signup',
]);
const STORAGE_KEY = 'skatequest.auth.returnTo';
let pendingReturnPath = '/';

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
  if (typeof window !== 'undefined') {
    window.sessionStorage?.setItem(STORAGE_KEY, pendingReturnPath);
  }
  return pendingReturnPath;
}

export function getAuthReturnPath(): string {
  if (typeof window !== 'undefined') {
    const stored = window.sessionStorage?.getItem(STORAGE_KEY);
    if (stored) pendingReturnPath = sanitizeAuthReturnPath(stored);
  }
  return pendingReturnPath;
}
