import { useRouter } from 'expo-router';
import SignupScreenComponent from '../../screens/SignupScreen';

export default function SignupRoute() {
  const router = useRouter();

  const navigation = {
    navigate: (screen: string) => {
      if (screen === 'Login') router.push('/(auth)/login');
    },
    goBack: () => router.back(),
  };

  return <SignupScreenComponent navigation={navigation} />;
}
