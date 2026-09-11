import { buildAuthReturnPath, sanitizeAuthReturnPath } from '../../lib/authReturnPath';

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

describe('buildAuthReturnPath', () => {
  it('preserves the spot ID needed after login', () => {
    expect(
      buildAuthReturnPath('/spot-detail', {
        spotId: '7f9d5ad6-e271-4ad2-8ca5-8e2537edb5bc',
      })
    ).toBe('/spot-detail?spotId=7f9d5ad6-e271-4ad2-8ca5-8e2537edb5bc');
  });

  it('preserves repeated values and ignores undefined values', () => {
    expect(buildAuthReturnPath('/map', { type: ['park', 'diy'], ignored: undefined })).toBe(
      '/map?type=park&type=diy'
    );
  });

  it('still blocks authentication loops and external destinations', () => {
    expect(buildAuthReturnPath('/login', { returnTo: '//evil.example' })).toBe('/');
    expect(buildAuthReturnPath('//evil.example', {})).toBe('/');
  });
});
