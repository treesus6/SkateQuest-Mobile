import fs from 'node:fs';
import path from 'node:path';

describe('web/native platform selection', () => {
  it.each(['MapScreen', 'AddSpotScreen'] as const)(
    'provides native and web %s implementations',
    screen => {
      expect(fs.existsSync(path.join(__dirname, '..', 'screens', `${screen}.native.tsx`))).toBe(true);
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

  it('keeps PWA assets compatible with the SkateQuest.me apex domain', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'public', 'manifest.webmanifest'), 'utf8')
    );
    const serviceWorker = fs.readFileSync(
      path.join(__dirname, '..', 'public', 'service-worker.js'),
      'utf8'
    );
    const workflow = fs.readFileSync(
      path.join(__dirname, '..', '.github', 'workflows', 'deploy-web-pages.yml'),
      'utf8'
    );

    expect(manifest.start_url).toBe('.');
    expect(manifest.scope).toBe('.');
    expect(manifest.icons.every((icon: { src: string }) => !icon.src.startsWith('/'))).toBe(true);
    expect(serviceWorker).toContain('self.registration.scope');
    expect(workflow).toContain("EXPO_PUBLIC_BASE_URL: ''");
    expect(workflow).toContain('https://skatequest.me/');
    expect(workflow).toContain('actions/deploy-pages@v4');
  });
});
