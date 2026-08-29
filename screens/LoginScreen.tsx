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
import { ArrowRight, Crosshair, MapPin, Play, Target } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { signInWithGoogle } from '../lib/googleAuth';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

export default function LoginScreen({ navigation, returnTo = '/' }: any) {
  const { signIn, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter both email and password');
      return;
    }
    const { error: signInError } = await signIn(email.trim(), password);
    if (signInError) {
      setError(signInError.message || 'Invalid email or password');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const { error: googleError } = await signInWithGoogle(returnTo);
      if (googleError) setError(googleError.message || 'Google sign-in failed');
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const disabled = loading || googleLoading;

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
              <View style={s.liveTag}>
                <View style={s.liveDot} />
                <Text style={s.liveTagText}>THE SCENE IS OUT THERE</Text>
              </View>
            </View>

            <View style={s.posterCopy}>
              <Text style={s.logoText}>SKATE{`\n`}QUEST</Text>
              <Text style={s.posterLine}>FIND IT. SKATE IT. PROVE IT.</Text>
            </View>

            <View style={s.posterStats}>
              <View style={s.posterStat}>
                <MapPin color={PAPER} size={14} />
                <Text style={s.posterStatText}>REAL SPOTS</Text>
              </View>
              <View style={s.posterStat}>
                <Target color={PAPER} size={14} />
                <Text style={s.posterStatText}>REAL QUESTS</Text>
              </View>
              <View style={s.posterStat}>
                <Play color={PAPER} fill={PAPER} size={13} />
                <Text style={s.posterStatText}>REAL CLIPS</Text>
              </View>
            </View>
          </View>

          <View style={s.formSheet}>
            <View style={s.formHeadingRow}>
              <View>
                <Text style={s.formKicker}>BACK TO THE SESSION</Text>
                <Text style={s.formTitle}>Sign in</Text>
              </View>
              <View style={s.formNumber}>
                <Text style={s.formNumberText}>01</Text>
              </View>
            </View>

            <Text style={s.emailHint}>Sign in with your email and password</Text>

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
                placeholder="Password"
                placeholderTextColor="#777D87"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <Pressable
              style={[s.loginBtn, disabled && s.btnDis]}
              onPress={handleLogin}
              disabled={disabled}
            >
              {loading ? (
                <ActivityIndicator color={INK} size="small" />
              ) : (
                <>
                  <Text style={s.loginTxt}>Sign In</Text>
                  <View style={s.loginArrow}>
                    <ArrowRight color={INK} size={19} strokeWidth={3} />
                  </View>
                </>
              )}
            </Pressable>

            <View style={s.orRow}>
              <View style={s.orLine} />
              <Text style={s.orText}>OR</Text>
              <View style={s.orLine} />
            </View>

            <Pressable
              style={[s.googleBtn, disabled && s.btnDis]}
              onPress={handleGoogleLogin}
              disabled={disabled}
            >
              {googleLoading ? (
                <ActivityIndicator color={PAPER} size="small" />
              ) : (
                <>
                  <View style={s.googleMark}>
                    <Text style={s.googleMarkText}>G</Text>
                  </View>
                  <Text style={s.googleTxt}>Continue with Google</Text>
                </>
              )}
            </Pressable>

            <View style={s.formFooter}>
              <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={s.forgotTxt}>Forgot password?</Text>
              </Pressable>

              <View style={s.signupRow}>
                <Text style={s.signupText}>Don't have an account? </Text>
                <Pressable onPress={() => navigation.navigate('Signup')}>
                  <Text style={s.signupLink}>Sign Up</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 26 },

  poster: {
    height: 330,
    margin: 14,
    marginBottom: 0,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#11141A',
    borderWidth: 1,
    borderColor: '#2A2E36',
    position: 'relative',
  },
  posterOrange: {
    position: 'absolute',
    width: 270,
    height: 94,
    right: -90,
    top: 24,
    backgroundColor: ORANGE,
    transform: [{ rotate: '34deg' }],
  },
  posterAcid: {
    position: 'absolute',
    width: 230,
    height: 28,
    left: -88,
    bottom: 66,
    backgroundColor: ACID,
    transform: [{ rotate: '-12deg' }],
  },
  posterBlue: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    right: 24,
    bottom: 16,
    backgroundColor: BLUE,
    opacity: 0.2,
  },
  posterTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  brandStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ACID,
    borderRadius: 12,
    paddingHorizontal: 10,
    minHeight: 38,
    transform: [{ rotate: '-3deg' }],
  },
  brandStampText: { color: INK, fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.58)',
    paddingHorizontal: 9,
    minHeight: 31,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACID },
  liveTagText: { color: PAPER, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  posterCopy: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 2 },
  logoText: { color: PAPER, fontSize: 56, lineHeight: 48, fontWeight: '900', letterSpacing: -3.3 },
  posterLine: {
    color: ORANGE,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.45,
    marginTop: 14,
  },
  posterStats: { flexDirection: 'row', gap: 7, padding: 18, paddingTop: 0 },
  posterStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderRadius: 10,
    paddingHorizontal: 8,
    minHeight: 31,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  posterStatText: { color: PAPER, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.65 },

  formSheet: {
    marginTop: -9,
    marginHorizontal: 14,
    backgroundColor: PAPER,
    borderRadius: 27,
    padding: 19,
    borderWidth: 2,
    borderColor: INK,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  formHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  formKicker: { color: ORANGE, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.6 },
  formTitle: { color: INK, fontSize: 32, fontWeight: '900', letterSpacing: -1.4, marginTop: 2 },
  formNumber: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '5deg' }],
  },
  formNumberText: { color: INK, fontSize: 15, fontWeight: '900' },
  emailHint: { color: '#666C75', fontSize: 11, fontWeight: '700', marginTop: 6, marginBottom: 17 },
  errorBox: {
    backgroundColor: '#FFE5E1',
    borderRadius: 13,
    padding: 12,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E36D3F',
  },
  errorText: { color: '#8D2F24', fontSize: 12, fontWeight: '800' },
  fieldWrap: { marginBottom: 11 },
  fieldLabel: {
    color: INK,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.35,
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    backgroundColor: '#E9E4DA',
    color: INK,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '700',
    borderWidth: 1.5,
    borderColor: '#CFC8BB',
  },
  loginBtn: {
    minHeight: 55,
    backgroundColor: ACID,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: INK,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    transform: [{ rotate: '-0.5deg' }],
  },
  loginTxt: { color: INK, fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  loginArrow: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDis: { opacity: 0.5 },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 15, gap: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: '#CBC4B8' },
  orText: { color: '#777066', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  googleBtn: {
    minHeight: 53,
    backgroundColor: INK,
    borderRadius: 15,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: INK,
  },
  googleMark: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: PAPER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleMarkText: { color: INK, fontWeight: '900', fontSize: 13 },
  googleTxt: { color: PAPER, fontWeight: '900', fontSize: 14 },
  formFooter: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#D7D0C3', paddingTop: 14 },
  forgotTxt: { color: '#666057', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  signupText: { color: '#666057', fontSize: 12, fontWeight: '700' },
  signupLink: { color: ORANGE, fontSize: 12, fontWeight: '900' },
});
