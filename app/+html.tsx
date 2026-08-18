import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

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
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.css" />
        <script defer src="https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.js" />
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
