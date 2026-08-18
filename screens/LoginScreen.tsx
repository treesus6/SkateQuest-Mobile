import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/useAuthStore';
import { signInWithGoogle } from '../lib/googleAuth';

export default function LoginScreen({ navigation }: any) {
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
      const { error: googleError } = await signInWithGoogle();
      if (googleError) setError(googleError.message || 'Google sign-in failed');
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={s.flex} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logoWrap}>
            <Text style={s.logoEmoji}>🛹</Text>
            <Text style={s.logoText}>SKATEQUEST</Text>
            <Text style={s.tagline}>Find Your Spot</Text>
          </View>

          <Text style={s.emailHint}>Sign in with your email and password</Text>

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor="#6B7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[s.loginBtn, (loading || googleLoading) && s.btnDis]}
            onPress={handleLogin}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={s.loginTxt}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={s.orRow}>
            <View style={s.orLine} />
            <Text style={s.orText}>OR</Text>
            <View style={s.orLine} />
          </View>

          <TouchableOpacity
            style={[s.googleBtn, (loading || googleLoading) && s.btnDis]}
            onPress={handleGoogleLogin}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#F3F4F6" size="small" />
            ) : (
              <Text style={s.googleTxt}>Continue with Google</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={s.forgotTxt}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={s.signupRow}>
            <Text style={s.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={s.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070B' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 36 },
  logoEmoji: { fontSize: 56, marginBottom: 8 },
  logoText: { fontSize: 32, fontWeight: '900', color: '#F3F4F6', letterSpacing: 4 },
  tagline: { fontSize: 14, color: '#d2673d', marginTop: 4 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: { color: '#FCA5A5', fontSize: 14, textAlign: 'center' },
  emailHint: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  input: {
    backgroundColor: '#111827',
    color: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  loginBtn: {
    backgroundColor: '#d2673d',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDis: { opacity: 0.5 },
  loginTxt: { color: 'white', fontWeight: '700', fontSize: 16 },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: '#1F2937' },
  orText: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  googleBtn: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  googleTxt: { color: '#F3F4F6', fontWeight: '700', fontSize: 16 },
  forgotTxt: { color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 12 },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  signupText: { color: '#6B7280', fontSize: 14 },
  signupLink: { color: '#d2673d', fontSize: 14, fontWeight: '700' },
});
