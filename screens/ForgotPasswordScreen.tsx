import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../stores/useAuthStore';
import Button from '../components/ui/Button';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const { resetPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) { Alert.alert('Error', 'Please enter your email'); return; }
    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setSent(true);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="flex-1 justify-center px-5">
        <Text className="text-3xl font-bold text-brand-terracotta text-center mb-2">Reset Password</Text>
        <Text className="text-base text-gray-500 text-center mb-8">
          {sent ? 'Check your email for a reset link.' : 'Enter your email to receive a reset link.'}
        </Text>
        {!sent && (
          <>
            <TextInput
              className="bg-white dark:bg-gray-800 p-4 rounded-lg mb-4 text-base border border-gray-200 text-gray-800 dark:text-gray-100"
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            <Button title={loading ? 'Sending...' : 'Send Reset Link'} onPress={handleReset} variant="primary" size="lg" disabled={loading} />
          </>
        )}
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-5">
          <Text className="text-brand-terracotta text-center text-sm">← Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

