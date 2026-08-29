import { useRouter } from 'expo-router';
import LoginScreenComponent from '../../screens/LoginScreen';
import { getAuthReturnPath } from '../../lib/authReturnPath';

// Bridge: gives LoginScreen a navigation prop shaped like @react-navigation
// so we don't have to touch the screen itself
export default function LoginRoute() {
  const router = useRouter();
  const safeReturnTo = getAuthReturnPath();

  const navigation = {
    navigate: (screen: string) => {
      if (screen === 'Signup') router.push('/signup');
      else if (screen === 'ForgotPassword') router.push('/forgot-password');
    },
    goBack: () => router.back(),
  };

  return <LoginScreenComponent navigation={navigation} returnTo={safeReturnTo} />;
}
