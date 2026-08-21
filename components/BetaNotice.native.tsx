import React, { useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';

const configuredSupportEmail =
  (Constants.expoConfig?.extra?.supportEmail as string | undefined) ??
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL ??
  '';

export default function BetaNotice() {
  const [visible, setVisible] = useState(true);
  const supportEmail = configuredSupportEmail.trim();
  const issueSubject = encodeURIComponent('SkateQuest Android beta issue');
  const mailtoUrl = supportEmail ? `mailto:${supportEmail}?subject=${issueSubject}` : '';

  if (Platform.OS !== 'android' || !visible) return null;

  const openSupportEmail = async () => {
    try {
      await Linking.openURL(mailtoUrl);
    } catch {
      Alert.alert('Could not open email', `Email ${supportEmail} directly to report the issue.`);
    }
  };

  return (
    <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.safeArea}>
      <View
        accessibilityRole="alert"
        accessibilityLabel="SkateQuest Android beta notice"
        accessibilityLiveRegion="polite"
        style={styles.notice}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss beta notice"
          hitSlop={10}
          onPress={() => setVisible(false)}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>

        <Text selectable style={styles.title}>
          SkateQuest Android is still in beta.
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
    elevation: 8,
  },
  notice: {
    margin: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: '#111827',
    padding: 14,
    paddingRight: 42,
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
