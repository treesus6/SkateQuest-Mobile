import React from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';

const configuredSupportEmail =
  (Constants.expoConfig?.extra?.supportEmail as string | undefined) ??
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL ??
  '';

const supportEmail = configuredSupportEmail.trim();
const issueSubject = encodeURIComponent('SkateQuest Android beta issue');
const mailtoUrl = supportEmail ? `mailto:${supportEmail}?subject=${issueSubject}` : '';

export default function BetaNotice() {
  if (Platform.OS !== 'android') return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel="SkateQuest Android beta notice"
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        zIndex: 1001,
        elevation: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F59E0B',
        backgroundColor: '#111827',
        padding: 14,
      }}
    >
      <Text selectable style={{ color: '#FEF3C7', fontWeight: '900', fontSize: 15 }}>
        SkateQuest Android is still in beta.
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