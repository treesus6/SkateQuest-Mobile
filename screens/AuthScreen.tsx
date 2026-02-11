import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useAuthStore } from '../stores/useAuthStore';
import Button from '../components/ui/Button';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuthStore();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    if (isSignUp) {
      const { error: signUpError } = await signUp(email, password);

      if (signUpError) {
        setLoading(false);
        console.error('Signup error:', signUpError);
        Alert.alert(
          'Signup Failed',
          signUpError.message +
            '\n\nMake sure you:\n1. Disabled email confirmation in Supabase\n2. Ran the SQL migrations'
        );
        return;
      }

      const { error: signInError } = await signIn(email, password);
      setLoading(false);

      if (signInError) {
        Alert.alert(
          'Signup Successful!',
          'Account created but auto-login failed. Please sign in manually.'
        );
      }
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);

      if (error) {
        console.error('Login error:', error);
        Alert.alert('Login Failed', error.message);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-brand-beige dark:bg-gray-900"
    >
      <View className="flex-1 justify-center px-5">
        <Text className="text-[42px] font-bold text-brand-terracotta text-center mb-2.5">
          SkateQuest
        </Text>
        <Text className="text-base text-gray-500 dark:text-gray-400 text-center mb-10">
          Discover. Skate. Connect.
        </Text>

        <TextInput
          className="bg-white dark:bg-gray-800 p-4 rounded-lg mb-4 text-base border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100"
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          className="bg-white dark:bg-gray-800 p-4 rounded-lg mb-4 text-base border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100"
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <Button
          title={loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          onPress={handleAuth}
          variant="primary"
          size="lg"
          disabled={loading}
        />

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} disabled={loading}>
          <Text className="text-brand-terracotta text-center mt-5 text-sm">
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
