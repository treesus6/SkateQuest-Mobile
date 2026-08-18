import fs from 'node:fs';
import path from 'node:path';

describe('web/native platform selection', () => {
  it.each(['MapScreen', 'AddSpotScreen'] as const)(
    'provides native and web %s implementations',
    screen => {
      expect(fs.existsSync(path.join(__dirname, '..', 'screens', `${screen}.native.tsx`))).toBe(
        true
      );
      expect(fs.existsSync(path.join(__dirname, '..', 'screens', `${screen}.web.tsx`))).toBe(true);
    }
  );

  it('keeps the native Mapbox package out of web map sources', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'screens', 'MapScreen.web.tsx'),
      'utf8'
    );
    expect(source).not.toContain('@rnmapbox/maps');
    expect(source).toContain('window.mapboxgl');
  });

  it('uses URL session detection only in the web auth adapter', () => {
    const web = fs.readFileSync(path.join(__dirname, '..', 'lib', 'authStorage.web.ts'), 'utf8');
    const native = fs.readFileSync(
      path.join(__dirname, '..', 'lib', 'authStorage.native.ts'),
      'utf8'
    );
    expect(web).toContain('detectSessionInUrl = true');
    expect(native).toContain('detectSessionInUrl = false');
  });
});
