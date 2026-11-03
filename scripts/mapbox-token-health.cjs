'use strict';

// Validate the exact EAS preview public token without printing it in CI logs.
const token = (process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '').trim();
if (!token.startsWith('pk.')) {
  console.error('Mapbox preview token missing or not a public (pk.) token.');
  process.exitCode = 1;
} else {
  const encoded = encodeURIComponent(token);
  const probes = [
    ['streets style', `https://api.mapbox.com/styles/v1/mapbox/streets-v11?access_token=${encoded}`],
    ['streets tileset', `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8.json?secure&access_token=${encoded}`],
  ];

  (async () => {
    for (const [label, url] of probes) {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      console.log(`Mapbox ${label}: HTTP ${response.status}`);
      await response.body?.cancel();
      if (!response.ok) {
        console.error(
          `Mapbox ${label} access failed. Check token status, styles:read/tilesets:read scopes, and URL restrictions.`
        );
        process.exitCode = 1;
      }
    }
  })().catch(error => {
    // Never print the request URL or the token, including inside fetch error objects.
    console.error(`Mapbox preview connectivity probe failed (${error?.name || 'network error'}).`);
    process.exitCode = 1;
  });
}
