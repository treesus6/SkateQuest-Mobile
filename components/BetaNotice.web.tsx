import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';

const configuredSupportEmail =
  (Constants.expoConfig?.extra?.supportEmail as string | undefined) ??
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL ??
  '';

const supportEmail = configuredSupportEmail.trim();
const issueSubject = encodeURIComponent('SkateQuest beta issue');
const mailtoUrl = supportEmail ? `mailto:${supportEmail}?subject=${issueSubject}` : '';

export default function BetaNotice() {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel="SkateQuest beta notice"
      style={{
        position: 'fixed' as any,
        top: 'calc(12px + env(safe-area-inset-top))' as any,
        left: 12,
        right: 12,
        zIndex: 1001,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(17, 24, 39, 0.96)',
        padding: 14,
        boxShadow: '0 16px 44px rgba(0,0,0,.45)',
      }}
    >
      <Text selectable style={{ color: '#FEF3C7', fontWeight: '900', fontSize: 15 }}>
        SkateQuest is still in beta.
      </Text>
      <Text selectable style={{ color: '#FDE68A', marginTop: 5, lineHeight: 19 }}>
        Some features are still being tested. If something breaks, report it so it can be fixed.
      </Text>
      {supportEmail ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Email SkateQuest support at ${supportEmail}`}
          onPress={() => Linking.openURL(mailtoUrl)}
          style={{ alignSelf: 'flex-start', marginTop: 8, paddingVertical: 3 }}
        >
          <Text selectable style={{ color: '#FDBA74', fontWeight: '900' }}>
            Report issues: {supportEmail}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
