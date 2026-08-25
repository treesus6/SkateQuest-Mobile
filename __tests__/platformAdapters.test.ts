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
    expect(source).toContain("const hasPhoto = typeof spot.image_url === 'string'");
    expect(source).toContain('style={s.spotThumb}');
  });

  it('keeps photo-backed spot markers and the live photo RPC migration on both platforms', () => {
    const nativeMap = fs.readFileSync(
      path.join(__dirname, '..', 'screens', 'MapScreen.native.tsx'),
      'utf8'
    );
    const service = fs.readFileSync(path.join(__dirname, '..', 'lib', 'spotsService.ts'), 'utf8');
    const migration = fs.readFileSync(
      path.join(
        __dirname,
        '..',
        'supabase',
        'migrations',
        '20260824193608_create_spots_with_primary_photos.sql'
      ),
      'utf8'
    );
    const blankFallbackMigration = fs.readFileSync(
      path.join(
        __dirname,
        '..',
        'supabase',
        'migrations',
        '20260825064200_fix_blank_spot_photo_fallback.sql'
      ),
      'utf8'
    );
    const retirementMigration = fs.readFileSync(
      path.join(
        __dirname,
        '..',
        'supabase',
        'migrations',
        '20260824195855_retire_unrated_spot_creation_rpc.sql'
      ),
      'utf8'
    );

    expect(nativeMap).toContain('<PhotoSpotAnnotation');
    expect(nativeMap).toContain('selectedSpot.image_url');
    expect(nativeMap).toContain('saved={savedSpotIds.has(spot.id)}');
    expect(nativeMap).toContain("saved ? '#FFD700'");
    expect(service).toContain("supabase.rpc('add_spot_photo'");
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.add_spot_photo');
    expect(migration).toContain('(storage.foldername(object.name))[2] = caller_id::text');
    expect(migration).toContain('COALESCE(\n      spot.image_url,');
    expect(blankFallbackMigration).toContain("NULLIF(btrim(spot.image_url), '')");
    expect(retirementMigration).toContain(
      'REVOKE EXECUTE ON FUNCTION public.create_spot_with_photo'
    );
    expect(retirementMigration).toContain('FROM authenticated');
  });

  it('keeps web Add Spot accessible and included in the exported route gate', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'screens', 'AddSpotScreen.web.tsx'),
      'utf8'
    );
    const route = path.join(__dirname, '..', 'app', '(screens)', 'add-spot.tsx');
    const workflow = fs.readFileSync(
      path.join(__dirname, '..', '.github', 'workflows', 'full-quality-gate.yml'),
      'utf8'
    );

    expect(fs.existsSync(route)).toBe(true);
    expect(source).toContain('accessibilityLabel="Use my location"');
    expect(source).toContain(
      'accessibilityHint="Uses your browser location to place the spot pin"'
    );
    expect(source).toContain('style={[s.sectionTitle, s.sectionTitleLight]}');
    expect(source).toContain('sectionTitleLight: { color: PAPER }');
    expect(workflow).toContain('test -f dist-quality/add-spot.html');
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

  it('keeps PWA assets compatible with custom-domain root hosting', () => {
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
    expect(workflow).toContain('actions/deploy-pages@v4');
  });

  it('shows the beta/support notice on web and Android only', () => {
    const web = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'BetaNotice.web.tsx'),
      'utf8'
    );
    const base = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'BetaNotice.tsx'),
      'utf8'
    );
    const native = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'BetaNotice.native.tsx'),
      'utf8'
    );
    const appConfig = fs.readFileSync(path.join(__dirname, '..', 'app.config.js'), 'utf8');

    expect(web).toContain('SkateQuest Beta');
    expect(web).toContain('Report a bug');
    expect(web).toContain('Dismiss beta notice');
    expect(web).toContain('sessionStorage');
    expect(native).toContain("Platform.OS !== 'android'");
    expect(native).toContain('SkateQuest Android is still in beta.');
    expect(base).toContain("export { default } from './BetaNotice.native'");
    expect(web).toContain('EXPO_PUBLIC_SUPPORT_EMAIL');
    expect(native).toContain('EXPO_PUBLIC_SUPPORT_EMAIL');
    expect(web).toContain('mailto:');
    expect(native).toContain('mailto:');
    expect(appConfig).toContain(
      "supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@skatequest.me'"
    );
    expect(appConfig).not.toContain('treevanderveer@gmail.com');
    expect(appConfig).not.toContain('support@sk8.quest');
  });
});
