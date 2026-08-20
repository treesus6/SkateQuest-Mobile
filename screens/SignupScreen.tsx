import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, CheckCircle2, Crosshair, Mail, ShieldCheck, Sparkles, UserPlus } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { SkateEvents } from '../lib/analytics';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

export default function SignupScreen({ navigation }: any) {
  const { signUp, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleSignup = async () => {
    setError('');
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError('Please enter both email and password');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    const { error: signUpError } = await signUp(normalizedEmail, password);
    if (signUpError) {
      setError(signUpError.message || 'Failed to create account');
    } else {
      SkateEvents.signedUp();
      setSubmittedEmail(normalizedEmail);
      setPassword('');
    }
  };

  if (submittedEmail) {
    return (
      <SafeAreaView style={s.container}>
        <View pointerEvents="none" style={s.successBackdrop}>
          <View style={s.successSlashA} />
          <View style={s.successSlashB} />
        </View>
        <View style={s.successWrap}>
          <View style={s.successMark}>
            <CheckCircle2 color={INK} size={34} strokeWidth={2.8} />
          </View>
          <Text style={s.successKicker}>YOU'RE ALMOST IN</Text>
          <Text style={s.successTitle}>Check Your Email</Text>
          <Text style={s.successCopy}>We sent a SkateQuest confirmation link to:</Text>
          <View style={s.emailTicket}>
            <Mail color={ORANGE} size={18} />
            <Text style={s.emailTicketText}>{submittedEmail}</Text>
          </View>
          <Text style={s.successFinePrint}>
            Open the newest confirmation email on this device. The link will bring you back into SkateQuest.
          </Text>
          <Pressable style={s.primaryButton} onPress={() => navigation.navigate('Login')}>
            <Text style={s.primaryButtonText}>Go to Sign In</Text>
            <View style={s.primaryArrow}>
              <ArrowRight color={INK} size={19} strokeWidth={3} />
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.poster}>
            <View style={s.posterOrange} />
            <View style={s.posterAcid} />
            <View style={s.posterBlue} />

            <View style={s.posterTop}>
              <View style={s.brandStamp}>
                <Crosshair color={INK} size={18} strokeWidth={3} />
                <Text style={s.brandStampText}>SQ</Text>
              </View>
              <View style={s.posterChip}>
                <Sparkles color={ACID} size={13} />
                <Text style={s.posterChipText}>MAKE YOUR MARK</Text>
              </View>
            </View>

            <View style={s.posterCopy}>
              <Text style={s.posterTitle}>JOIN THE{`\n`}SCENE.</Text>
              <Text style={s.posterLine}>SPOTS // QUESTS // CLIPS // CREWS</Text>
            </View>

            <View style={s.posterFooter}>
              <View style={s.posterFooterItem}>
                <ShieldCheck color={PAPER} size={15} />
                <Text style={s.posterFooterText}>REAL ACTIVITY</Text>
              </View>
              <View style={s.posterFooterItem}>
                <UserPlus color={PAPER} size={15} />
                <Text style={s.posterFooterText}>YOUR PROFILE</Text>
              </View>
            </View>
          </View>

          <View style={s.formSheet}>
            <View style={s.formHeadingRow}>
              <View>
                <Text style={s.formKicker}>NEW SKATER // 01</Text>
                <Text style={s.formTitle}>Create Account</Text>
              </View>
              <View style={s.formNumber}>
                <Text style={s.formNumberText}>02</Text>
              </View>
            </View>
            <Text style={s.formIntro}>Start your SkateQuest journey and build your own scene history.</Text>

            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>EMAIL</Text>
              <TextInput
                style={s.input}
                placeholder="Email"
                placeholderTextColor="#777D87"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>PASSWORD</Text>
              <TextInput
                style={s.input}
                placeholder="Password (min 8 characters)"
                placeholderTextColor="#777D87"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <Pressable
              style={[s.primaryButton, loading && s.disabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={INK} />
              ) : (
                <>
                  <Text style={s.primaryButtonText}>Sign Up</Text>
                  <View style={s.primaryArrow}>
                    <ArrowRight color={INK} size={19} strokeWidth={3} />
                  </View>
                </>
              )}
            </Pressable>

            <View style={s.ruleRow}>
              <View style={s.rule} />
              <Text style={s.ruleText}>ALREADY ROLLING?</Text>
              <View style={s.rule} />
            </View>

            <Pressable style={s.signInLink} onPress={() => navigation.navigate('Login')}>
              <Text style={s.signInLinkText}>Already have an account? Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 28 },
  poster: {
    height: 286,
    margin: 14,
    marginBottom: 0,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#11141A',
    borderWidth: 1,
    borderColor: '#2A2E36',
    position: 'relative',
  },
  posterOrange: { position: 'absolute', width: 255, height: 84, right: -94, top: 30, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  posterAcid: { position: 'absolute', width: 238, height: 26, left: -94, bottom: 64, backgroundColor: ACID, transform: [{ rotate: '-11deg' }] },
  posterBlue: { position: 'absolute', width: 118, height: 118, borderRadius: 59, right: 18, bottom: 10, backgroundColor: BLUE, opacity: 0.18 },
  posterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  brandStamp: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACID, borderRadius: 12, paddingHorizontal: 10, minHeight: 38, transform: [{ rotate: '-3deg' }] },
  brandStampText: { color: INK, fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  posterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 9, minHeight: 31, borderRadius: 999 },
  posterChipText: { color: PAPER, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  posterCopy: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 2 },
  posterTitle: { color: PAPER, fontSize: 48, lineHeight: 43, fontWeight: '900', letterSpacing: -2.8 },
  posterLine: { color: ORANGE, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 12 },
  posterFooter: { flexDirection: 'row', gap: 8, padding: 18, paddingTop: 0 },
  posterFooterItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.46)', paddingHorizontal: 9, minHeight: 31, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  posterFooterText: { color: PAPER, fontSize: 8, fontWeight: '900', letterSpacing: 0.65 },
  formSheet: { marginTop: -8, marginHorizontal: 14, backgroundColor: PAPER, borderRadius: 27, padding: 19, borderWidth: 2, borderColor: INK, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  formHeadingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  formKicker: { color: ORANGE, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.6 },
  formTitle: { color: INK, fontSize: 30, fontWeight: '900', letterSpacing: -1.3, marginTop: 2 },
  formNumber: { width: 42, height: 42, borderRadius: 13, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '5deg' }] },
  formNumberText: { color: INK, fontSize: 15, fontWeight: '900' },
  formIntro: { color: '#666C75', fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 7, marginBottom: 16 },
  errorBox: { backgroundColor: '#FFE5E1', borderRadius: 13, padding: 12, marginBottom: 13, borderWidth: 1, borderColor: ORANGE },
  errorText: { color: '#8D2F24', fontSize: 12, fontWeight: '800' },
  fieldWrap: { marginBottom: 11 },
  fieldLabel: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1.35, marginBottom: 6, marginLeft: 2 },
  input: { backgroundColor: '#E9E4DA', color: INK, borderRadius: 14, minHeight: 52, paddingHorizontal: 14, fontSize: 15, fontWeight: '700', borderWidth: 1.5, borderColor: '#CFC8BB' },
  primaryButton: { minHeight: 55, backgroundColor: ACID, borderRadius: 15, borderWidth: 2, borderColor: INK, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, transform: [{ rotate: '-0.4deg' }] },
  primaryButtonText: { color: INK, fontWeight: '900', fontSize: 15, letterSpacing: 0.4 },
  primaryArrow: { width: 34, height: 34, borderRadius: 11, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.55 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 17 },
  rule: { flex: 1, height: 1, backgroundColor: '#CBC4B8' },
  ruleText: { color: '#777066', fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  signInLink: { alignItems: 'center', paddingVertical: 14 },
  signInLinkText: { color: ORANGE, fontSize: 12, fontWeight: '900' },
  successBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  successSlashA: { position: 'absolute', width: 420, height: 88, backgroundColor: ORANGE, right: -170, top: 96, transform: [{ rotate: '29deg' }], opacity: 0.9 },
  successSlashB: { position: 'absolute', width: 350, height: 36, backgroundColor: ACID, left: -150, bottom: 118, transform: [{ rotate: '-13deg' }] },
  successWrap: { flex: 1, justifyContent: 'center', margin: 20, padding: 22, borderRadius: 28, backgroundColor: PAPER, borderWidth: 2, borderColor: INK },
  successMark: { width: 72, height: 72, borderRadius: 20, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  successKicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.7, marginTop: 22 },
  successTitle: { color: INK, fontSize: 34, fontWeight: '900', letterSpacing: -1.4, marginTop: 3 },
  successCopy: { color: '#666C75', fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 9 },
  emailTicket: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#E9E4DA', borderRadius: 14, padding: 13, marginTop: 14, borderWidth: 1, borderColor: '#CEC7BA' },
  emailTicketText: { color: INK, fontWeight: '900', flex: 1 },
  successFinePrint: { color: '#777066', fontSize: 11, lineHeight: 17, marginTop: 13, marginBottom: 18 },
});