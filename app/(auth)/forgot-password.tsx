import { useRouter } from 'expo-router';
import ForgotPasswordScreenComponent from '../../screens/ForgotPasswordScreen';

export default function ForgotPasswordRoute() {
  const router = useRouter();

  // ForgotPasswordScreen uses useNavigation() hook internally,
  // but it only calls navigation.goBack() — which expo-router handles
  // natively via the back button. No bridge needed.
  return <ForgotPasswordScreenComponent />;
}
