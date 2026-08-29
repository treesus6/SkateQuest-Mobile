import { sanitizeAuthReturnPath } from '../../lib/authReturnPath';

describe('sanitizeAuthReturnPath', () => {
  it.each(['/add-spot', '/spot-detail?id=123', '/quests#daily'])(
    'preserves safe app path %s',
    path => {
      expect(sanitizeAuthReturnPath(path)).toBe(path);
    }
  );

  it.each([
    undefined,
    '',
    'add-spot',
    '//evil.example/path',
    '/\\evil.example/path',
    'https://evil.example/path',
    '/login',
    '/callback?code=secret',
  ])('falls back to home for unsafe or looping value %p', value => {
    expect(sanitizeAuthReturnPath(value)).toBe('/');
  });

  it('uses the first Expo Router search parameter value', () => {
    expect(sanitizeAuthReturnPath(['/crews', '//evil.example'])).toBe('/crews');
  });
});
