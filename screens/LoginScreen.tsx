import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }: any) {
  const { signIn, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [oauthLoading, setOauthLoading] = useState('');

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

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setError('');
    setOauthLoading(provider);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'com.treesus6.skatequest',
        path: 'auth/callback',
      });

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) throw oauthError;
      if (!data.url) throw new Error('No OAuth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success') {
        const url = result.url;
        const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1] || '');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
        }
      } else if (result.type === 'cancel') {
        setError('Sign in was cancelled');
      }
    } catch (err: any) {
      setError(err.message || `${provider} sign in failed`);
    } finally {
      setOauthLoading('');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={s.flex} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.logoWrap}>
            <Text style={s.logoEmoji}>🛹</Text>
            <Text style={s.logoText}>SKATEQUEST</Text>
            <Text style={s.tagline}>Find Your Spot</Text>
          </View>

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* OAuth Buttons */}
          <TouchableOpacity
            style={s.googleBtn}
            onPress={() => handleOAuth('google')}
            disabled={!!oauthLoading}
          >
            {oauthLoading === 'google' ? (
              <ActivityIndicator color="#333" size="small" />
            ) : (
              <>
                <Text style={s.googleIcon}>G</Text>
                <Text style={s.googleTxt}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.facebookBtn}
            onPress={() => handleOAuth('facebook')}
            disabled={!!oauthLoading}
          >
            {oauthLoading === 'facebook' ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Text style={s.facebookIcon}>f</Text>
                <Text style={s.facebookTxt}>Continue with Facebook</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or sign in with email</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Email/Password */}
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
            style={[s.loginBtn, loading && s.btnDis]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={s.loginTxt}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={s.forgotTxt}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign Up */}
          <View style={s.signupRow}>
            <Text style={s.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
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
  logoText: {
    fontSize: 32, fontWeight: '900', color: '#F3F4F6',
    letterSpacing: 4,
  },
  tagline: { fontSize: 14, color: '#d2673d', marginTop: 4 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10,
    padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: { color: '#FCA5A5', fontSize: 14, textAlign: 'center' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'white', borderRadius: 12, padding: 14,
    marginBottom: 10, gap: 10,
  },
  googleIcon: {
    fontSize: 18, fontWeight: '900', color: '#4285F4',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  googleTxt: { color: '#333', fontWeight: '700', fontSize: 15 },
  facebookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1877F2', borderRadius: 12, padding: 14,
    marginBottom: 10, gap: 10,
  },
  facebookIcon: { fontSize: 20, fontWeight: '900', color: 'white' },
  facebookTxt: { color: 'white', fontWeight: '700', fontSize: 15 },
  divider: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 16, gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1F2937' },
  dividerText: { color: '#6B7280', fontSize: 13 },
  input: {
    backgroundColor: '#111827', color: '#F3F4F6',
    borderRadius: 12, padding: 14, fontSize: 15,
    marginBottom: 10, borderWidth: 1, borderColor: '#1F2937',
  },
  loginBtn: {
    backgroundColor: '#d2673d', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 4,
  },
  btnDis: { opacity: 0.5 },
  loginTxt: { color: 'white', fontWeight: '700', fontSize: 16 },
  forgotTxt: {
    color: '#6B7280', fontSize: 14,
    textAlign: 'center', marginTop: 12,
  },
  signupRow: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: 20,
  },
  signupText: { color: '#6B7280', fontSize: 14 },
  signupLink: { color: '#d2673d', fontSize: 14, fontWeight: '700' },
});
