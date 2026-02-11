import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { showToast } from '../components/Toast';

interface SignupScreenProps {
  navigation: { navigate: (screen: string) => void };
}

export default function SignupScreen({ navigation }: SignupScreenProps) {
  const { signUp, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = async () => {
    const { error } = await signUp(email.trim(), password);
    if (error) {
      showToast({ message: error.message || 'Sign up failed', type: 'error' });
    } else {
      showToast({ message: 'Account created! Check your email to verify.', type: 'success' });
    }
  };

  return (
    <View className="flex-1 p-5 bg-[#05070B]">
      <Text className="text-3xl font-black text-gray-100 mb-2">Create Account</Text>
      <Text className="text-base text-gray-400 mb-5">Start your SkateQuest journey</Text>

      <TextInput
        className="bg-[#121826] text-gray-100 p-3 rounded-lg mb-3"
        placeholder="Email"
        placeholderTextColor="#6B7280"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        accessibilityLabel="Email address"
        keyboardType="email-address"
      />

      <TextInput
        className="bg-[#121826] text-gray-100 p-3 rounded-lg mb-3"
        placeholder="Password"
        placeholderTextColor="#6B7280"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityLabel="Password"
      />

      <TouchableOpacity
        className={`bg-[#FF5A3C] py-3.5 rounded-lg items-center mt-2 ${loading ? 'opacity-50' : ''}`}
        onPress={handleSignup}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Loading' : 'Sign Up'}
        accessibilityState={{ disabled: loading }}
      >
        <Text className="text-gray-100 font-bold text-base">{loading ? 'Loading...' : 'Sign Up'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Login')}
        accessibilityRole="link"
        accessibilityLabel="Go to sign in"
      >
        <Text className="text-[#FF5A3C] mt-4 text-center">Already have an account? Sign in</Text>
      </TouchableOpacity>
    </View>
  );
}
