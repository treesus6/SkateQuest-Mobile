import React, { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';

const configuredSupportEmail =
  (Constants.expoConfig?.extra?.supportEmail as string | undefined) ??
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL ??
  '';

export default function BetaNotice() {
  const [visible, setVisible] = useState(true);
  const supportEmail = configuredSupportEmail.trim();
  const issueSubject = encodeURIComponent('SkateQuest web beta issue');
  const mailtoUrl = supportEmail ? `mailto:${supportEmail}?subject=${issueSubject}` : '';

  if (!visible) return null;

  const openSupportEmail = async () => {
    try {
      await Linking.openURL(mailtoUrl);
    } catch {
      Alert.alert('Could not open email', `Email ${supportEmail} directly to report the issue.`);
    }
  };

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel="SkateQuest beta notice"
      accessibilityLiveRegion="polite"
      style={styles.notice}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss beta notice"
        onPress={() => setVisible(false)}
        style={styles.closeButton}
      >
        <Text style={styles.closeText}>×</Text>
      </Pressable>

      <Text selectable style={styles.title}>
        SkateQuest is still in beta.
      </Text>
      <Text selectable style={styles.body}>
        Some features are still being tested. If something breaks, report it so it can be fixed.
      </Text>
      {supportEmail ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Email SkateQuest support at ${supportEmail}`}
          onPress={() => void openSupportEmail()}
          style={styles.emailLink}
        >
          <Text selectable style={styles.emailText}>
            Report issues: {supportEmail}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
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
    paddingRight: 42,
    boxShadow: '0 16px 44px rgba(0,0,0,.45)',
  },
  closeButton: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#273142',
  },
  closeText: { color: '#FEF3C7', fontSize: 23, lineHeight: 24, fontWeight: '700' },
  title: { color: '#FEF3C7', fontWeight: '900', fontSize: 15 },
  body: { color: '#FDE68A', marginTop: 5, lineHeight: 19 },
  emailLink: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 3 },
  emailText: { color: '#FDBA74', fontWeight: '900' },
});
