import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { showToast } from '../components/Toast';

interface LoginScreenProps {
  navigation: { navigate: (screen: string) => void };
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { signIn, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const { error } = await signIn(email.trim(), password);
    if (error) {
      showToast({ message: error.message || 'Sign in failed', type: 'error' });
    }
  };

  return (
    <View className="flex-1 p-5 bg-[#05070B]">
      <Text className="text-3xl font-black text-gray-100 mb-2">Welcome Back</Text>
      <Text className="text-base text-gray-400 mb-5">Sign in to continue your SkateQuest</Text>

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
        onPress={handleLogin}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Loading' : 'Sign In'}
        accessibilityState={{ disabled: loading }}
      >
        <Text className="text-gray-100 font-bold text-base">{loading ? 'Loading...' : 'Sign In'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Signup')}
        accessibilityRole="link"
        accessibilityLabel="Go to sign up"
      >
        <Text className="text-[#FF5A3C] mt-4 text-center">Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}
