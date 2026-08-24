import React, { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';

const configuredSupportEmail =
  (Constants.expoConfig?.extra?.supportEmail as string | undefined) ??
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL ??
  '';

const supportEmail = configuredSupportEmail.trim();
const issueSubject = encodeURIComponent('SkateQuest beta issue');
const mailtoUrl = supportEmail ? `mailto:${supportEmail}?subject=${issueSubject}` : '';
const SESSION_KEY = 'skatequest-beta-notice-dismissed';

export default function BetaNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.sessionStorage.getItem(SESSION_KEY) !== '1');
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // Keep dismissal working even when browser storage is unavailable.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel="SkateQuest beta notice"
      style={{
        position: 'fixed' as any,
        top: 'calc(8px + env(safe-area-inset-top))' as any,
        left: 10,
        right: 10,
        zIndex: 1001,
        minHeight: 44,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(17, 24, 39, 0.96)',
        paddingLeft: 12,
        paddingRight: 6,
        paddingVertical: 6,
        boxShadow: '0 8px 24px rgba(0,0,0,.32)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Text selectable style={{ color: '#FEF3C7', fontWeight: '900', fontSize: 13, flexShrink: 0 }}>
        SkateQuest Beta
      </Text>

      {supportEmail ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Email SkateQuest support at ${supportEmail}`}
          onPress={() => Linking.openURL(mailtoUrl)}
          style={{ flex: 1, minHeight: 32, justifyContent: 'center' }}
        >
          <Text
            numberOfLines={1}
            style={{ color: '#FDBA74', fontWeight: '900', fontSize: 12 }}
          >
            Report a bug
          </Text>
        </Pressable>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss beta notice"
        onPress={dismiss}
        hitSlop={10}
        style={{
          width: 34,
          height: 34,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
        }}
      >
        <Text style={{ color: '#FEF3C7', fontSize: 22, fontWeight: '700', lineHeight: 24 }}>×</Text>
      </Pressable>
    </View>
  );
}
