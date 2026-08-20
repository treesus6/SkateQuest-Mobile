import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, CheckCircle2, Crosshair, MapPin, Sparkles } from 'lucide-react-native';
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
        <View style={s.confirmWrap}>
          <View style={s.confirmPoster}>
            <View style={s.confirmOrangeSlash} />
            <View style={s.confirmStamp}><CheckCircle2 color={INK} size={31} strokeWidth={2.7} /></View>
            <Text style={s.confirmKicker}>ONE MORE STEP</Text>
            <Text style={s.confirmTitle}>Check Your Email</Text>
            <Text style={s.confirmBody}>We sent a SkateQuest confirmation link to:</Text>
            <View style={s.emailTicket}><Text style={s.emailTicketText}>{submittedEmail}</Text></View>
            <Text style={s.confirmFoot}>
              Open the newest confirmation email on this device. The link will bring you back into SkateQuest.
            </Text>
          </View>

          <Pressable style={s.confirmButton} onPress={() => navigation.navigate('Login')}>
            <Text style={s.confirmButtonText}>Go to Sign In</Text>
            <ArrowRight color={INK} size={19} strokeWidth={3} />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.poster}>
          <View style={s.posterOrange} />
          <View style={s.posterAcid} />
          <View style={s.posterBlue} />

          <View style={s.posterTop}>
            <View style={s.brandStamp}>
              <Crosshair color={INK} size={18} strokeWidth={3} />
              <Text style={s.brandStampText}>JOIN SQ</Text>
            </View>
            <View style={s.posterTag}><Sparkles color={PAPER} size={14} /><Text style={s.posterTagText}>YOUR RUN STARTS HERE</Text></View>
          </View>

          <View style={s.posterCopy}>
            <Text style={s.posterTitle}>GET OUT.{`\n`}FIND SPOTS.{`\n`}STACK XP.</Text>
            <View style={s.posterLine}>
              <MapPin color={ORANGE} size={15} />
              <Text style={s.posterLineText}>REAL WORLD SKATE GAME</Text>
            </View>
          </View>
        </View>

        <View style={s.sheet}>
          <View style={s.sheetHeading}>
            <View>
              <Text style={s.sheetKicker}>NEW SKATER</Text>
              <Text style={s.title}>Create Account</Text>
            </View>
            <View style={s.sheetNumber}><Text style={s.sheetNumberText}>02</Text></View>
          </View>
          <Text style={s.subtitle}>Start your SkateQuest journey</Text>

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
            <View style={s.fieldLabelRow}>
              <Text style={s.fieldLabel}>PASSWORD</Text>
              <Text style={s.fieldHint}>8+ CHARACTERS</Text>
            </View>
            <TextInput
              style={s.input}
              placeholder="Password (min 8 characters)"
              placeholderTextColor="#777D87"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Pressable style={[s.signupButton, loading && s.disabled]} onPress={handleSignup} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={INK} size="small" />
            ) : (
              <>
                <Text style={s.signupButtonText}>Sign Up</Text>
                <View style={s.signupArrow}><ArrowRight color={INK} size={19} strokeWidth={3} /></View>
              </>
            )}
          </Pressable>

          <View style={s.rule} />

          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={s.loginLink}>Already have an account? Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  scroll: { flexGrow: 1, paddingBottom: 28 },

  poster: { height: 310, margin: 14, marginBottom: 0, borderRadius: 30, overflow: 'hidden', backgroundColor: '#11141A', borderWidth: 1, borderColor: '#2A2E36', position: 'relative' },
  posterOrange: { position: 'absolute', width: 260, height: 88, right: -92, top: 30, backgroundColor: ORANGE, transform: [{ rotate: '34deg' }] },
  posterAcid: { position: 'absolute', width: 210, height: 24, left: -70, bottom: 49, backgroundColor: ACID, transform: [{ rotate: '-12deg' }] },
  posterBlue: { position: 'absolute', width: 120, height: 120, borderRadius: 60, right: 15, bottom: -36, backgroundColor: BLUE, opacity: 0.17 },
  posterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  brandStamp: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACID, borderRadius: 12, paddingHorizontal: 10, minHeight: 38, transform: [{ rotate: '-3deg' }] },
  brandStampText: { color: INK, fontWeight: '900', fontSize: 12, letterSpacing: 0.8 },
  posterTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 9, minHeight: 31, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  posterTagText: { color: PAPER, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.9 },
  posterCopy: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  posterTitle: { color: PAPER, fontSize: 39, lineHeight: 36, fontWeight: '900', letterSpacing: -2 },
  posterLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 15 },
  posterLineText: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.25 },

  sheet: { marginTop: -8, marginHorizontal: 14, backgroundColor: PAPER, borderRadius: 27, padding: 19, borderWidth: 2, borderColor: INK, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  sheetHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sheetKicker: { color: ORANGE, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: INK, fontSize: 31, fontWeight: '900', letterSpacing: -1.3, marginTop: 2 },
  sheetNumber: { width: 42, height: 42, borderRadius: 13, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '5deg' }] },
  sheetNumberText: { color: INK, fontSize: 15, fontWeight: '900' },
  subtitle: { color: '#666C75', fontSize: 11, fontWeight: '700', marginTop: 6, marginBottom: 18 },
  errorBox: { backgroundColor: '#FFE5E1', borderRadius: 13, padding: 12, marginBottom: 13, borderWidth: 1, borderColor: ORANGE },
  errorText: { color: '#8D2F24', fontSize: 12, fontWeight: '800' },
  fieldWrap: { marginBottom: 12 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1.35, marginBottom: 6, marginLeft: 2 },
  fieldHint: { color: ORANGE, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8, marginBottom: 6 },
  input: { backgroundColor: '#E9E4DA', color: INK, borderRadius: 14, minHeight: 52, paddingHorizontal: 14, fontSize: 15, fontWeight: '700', borderWidth: 1.5, borderColor: '#CFC8BB' },
  signupButton: { minHeight: 55, backgroundColor: ACID, borderRadius: 15, borderWidth: 2, borderColor: INK, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3, transform: [{ rotate: '-0.5deg' }] },
  signupButtonText: { color: INK, fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  signupArrow: { width: 34, height: 34, borderRadius: 11, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  rule: { height: 1, backgroundColor: '#D7D0C3', marginVertical: 16 },
  loginLink: { color: ORANGE, fontSize: 12, fontWeight: '900', textAlign: 'center' },

  confirmWrap: { flex: 1, justifyContent: 'center', padding: 14 },
  confirmPoster: { minHeight: 360, backgroundColor: PAPER, borderRadius: 28, borderWidth: 2, borderColor: INK, padding: 22, overflow: 'hidden', position: 'relative' },
  confirmOrangeSlash: { position: 'absolute', width: 230, height: 62, right: -82, top: 35, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  confirmStamp: { width: 64, height: 64, borderRadius: 18, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: INK, transform: [{ rotate: '-4deg' }] },
  confirmKicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.6, marginTop: 25 },
  confirmTitle: { color: INK, fontSize: 35, fontWeight: '900', letterSpacing: -1.4, marginTop: 3 },
  confirmBody: { color: '#5E625F', fontSize: 13, lineHeight: 18, marginTop: 12 },
  emailTicket: { backgroundColor: INK, borderRadius: 14, padding: 13, marginTop: 12, transform: [{ rotate: '-0.5deg' }] },
  emailTicketText: { color: ACID, fontSize: 13, fontWeight: '900', textAlign: 'center' },
  confirmFoot: { color: '#6B6F70', fontSize: 11, lineHeight: 17, marginTop: 17 },
  confirmButton: { minHeight: 56, marginTop: 12, backgroundColor: ACID, borderRadius: 16, borderWidth: 2, borderColor: INK, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  confirmButtonText: { color: INK, fontSize: 14, fontWeight: '900' },
});
