import { useRouter } from 'expo-router';
import LoginScreenComponent from '../../screens/LoginScreen';

// Bridge: gives LoginScreen a navigation prop shaped like @react-navigation
// so we don't have to touch the screen itself
export default function LoginRoute() {
  const router = useRouter();

  const navigation = {
    navigate: (screen: string) => {
      if (screen === 'Signup') router.push('/(auth)/signup');
      else if (screen === 'ForgotPassword') router.push('/(auth)/forgot-password');
    },
    goBack: () => router.back(),
  };

  return <LoginScreenComponent navigation={navigation} />;
}
