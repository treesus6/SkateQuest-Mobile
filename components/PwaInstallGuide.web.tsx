import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

const DISMISSED_KEY = 'skatequest:pwa-install-dismissed';
const webBaseUrl = (process.env.EXPO_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
const serviceWorkerPath = `${webBaseUrl}/service-worker.js`;
const serviceWorkerScope = `${webBaseUrl || ''}/`;

export default function PwaInstallGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker
        .register(serviceWorkerPath, { scope: serviceWorkerScope, updateViaCache: 'none' })
        .then(registration => registration.update())
        .catch(error => console.error('Service worker registration failed', error));
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone;
    const isiPhone = /iPhone|iPod/.test(navigator.userAgent);
    setVisible(Boolean(isiPhone && !standalone && localStorage.getItem(DISMISSED_KEY) !== 'true'));
  }, []);

  if (!visible) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel="Install SkateQuest"
      style={{
        position: 'fixed' as any,
        left: 12,
        right: 12,
        bottom: 'calc(84px + env(safe-area-inset-bottom))' as any,
        zIndex: 1000,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#4B5563',
        backgroundColor: '#10151D',
        padding: 16,
        boxShadow: '0 16px 48px rgba(0,0,0,.55)',
      }}
    >
      <Text selectable style={{ color: 'white', fontWeight: '900', fontSize: 17 }}>
        Add SkateQuest to your Home Screen
      </Text>
      <Text selectable style={{ color: '#D1D5DB', marginTop: 7, lineHeight: 20 }}>
        In Safari, tap Share, then “Add to Home Screen” for a full-screen app experience.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          localStorage.setItem(DISMISSED_KEY, 'true');
          setVisible(false);
        }}
        style={{ alignSelf: 'flex-end', marginTop: 12, padding: 10 }}
      >
        <Text style={{ color: '#F09A78', fontWeight: '800' }}>Got it</Text>
      </Pressable>
    </View>
  );
}
