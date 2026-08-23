import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

const configuredWebBaseUrl = (process.env.EXPO_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
const withConfiguredBase = (path: string) => `${configuredWebBaseUrl}${path}`;

const runtimePwaPathFix = `
(function () {
  var configured = ${JSON.stringify(configuredWebBaseUrl)};
  var base = configured;
  if (!base && location.hostname.endsWith('github.io')) {
    var first = location.pathname.split('/').filter(Boolean)[0];
    base = first ? '/' + first : '';
  }
  var manifest = document.getElementById('skatequest-manifest');
  var appleIcon = document.getElementById('skatequest-apple-icon');
  if (manifest) manifest.setAttribute('href', base + '/manifest.webmanifest');
  if (appleIcon) appleIcon.setAttribute('href', base + '/icon-192.svg');
})();
`;

const webMapTileFallback = `
(function () {
  if (!window.mapboxgl || window.__skatequestMapFallbackInstalled) return;
  window.__skatequestMapFallbackInstalled = true;

  var OriginalMap = window.mapboxgl.Map;
  var fallbackStyle = {
    version: 8,
    sources: {
      'openstreetmap': {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      }
    },
    layers: [
      {
        id: 'openstreetmap',
        type: 'raster',
        source: 'openstreetmap',
        minzoom: 0,
        maxzoom: 19
      }
    ]
  };

  function SkateQuestMap(options) {
    var nextOptions = options || {};
    if (typeof nextOptions.style === 'string' && nextOptions.style.indexOf('mapbox://') === 0) {
      nextOptions = Object.assign({}, nextOptions, { style: fallbackStyle });
    }
    return new OriginalMap(nextOptions);
  }

  SkateQuestMap.prototype = OriginalMap.prototype;
  Object.setPrototypeOf(SkateQuestMap, OriginalMap);
  window.mapboxgl.Map = SkateQuestMap;
})();
`;

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no"
        />
        <meta name="theme-color" content="#D2673D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SkateQuest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link
          id="skatequest-manifest"
          rel="manifest"
          href={withConfiguredBase('/manifest.webmanifest')}
        />
        <link
          id="skatequest-apple-icon"
          rel="apple-touch-icon"
          href={withConfiguredBase('/icon-192.svg')}
        />
        <script dangerouslySetInnerHTML={{ __html: runtimePwaPathFix }} />
        <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.css" />
        <script src="https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.js" />
        <script dangerouslySetInnerHTML={{ __html: webMapTileFallback }} />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `html,body,#root{height:100%;background:#05070B}body{margin:0;overscroll-behavior:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}#root{padding-top:env(safe-area-inset-top);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)}@media(min-width:900px){#root{max-width:900px;margin:0 auto;box-shadow:0 0 80px rgba(0,0,0,.55)}}.mapboxgl-map{font:12px/20px -apple-system,BlinkMacSystemFont,sans-serif}.mapboxgl-canvas{outline:none}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
