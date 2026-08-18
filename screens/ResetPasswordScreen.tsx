import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import { useNavigation } from '../lib/useNavigation';
import { supabase } from '../lib/supabase';

export default function ResetPasswordScreen() {
  const navigation = useNavigation<any>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const savePassword = async () => {
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Enter the same password twice.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (error) {
      Alert.alert(
        'Password not changed',
        error instanceof Error ? error.message : 'Open the newest reset link and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#05070B' }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <Text style={{ color: 'white', fontSize: 30, fontWeight: '900', textAlign: 'center' }}>
          Set New Password
        </Text>
        <Text style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 8, marginBottom: 28 }}>
          {done ? 'Your SkateQuest password has been changed.' : 'Choose a new password for your SkateQuest account.'}
        </Text>

        {done ? (
          <Pressable
            onPress={() => navigation.replace('Login')}
            style={{ minHeight: 52, borderRadius: 14, backgroundColor: '#D2673D', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>Back to Sign In</Text>
          </Pressable>
        ) : (
          <>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="New password"
              placeholderTextColor="#6B7280"
              secureTextEntry
              autoCapitalize="none"
              style={{ backgroundColor: '#111827', color: 'white', borderRadius: 12, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#1F2937' }}
            />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor="#6B7280"
              secureTextEntry
              autoCapitalize="none"
              style={{ backgroundColor: '#111827', color: 'white', borderRadius: 12, padding: 15, marginBottom: 16, borderWidth: 1, borderColor: '#1F2937' }}
            />
            <Pressable
              disabled={saving}
              onPress={savePassword}
              style={{ minHeight: 52, borderRadius: 14, backgroundColor: '#D2673D', opacity: saving ? 0.6 : 1, alignItems: 'center', justifyContent: 'center' }}
            >
              {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>Change Password</Text>}
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
