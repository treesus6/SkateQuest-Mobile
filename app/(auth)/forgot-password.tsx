import ForgotPasswordScreenComponent from '../../screens/ForgotPasswordScreen';

export default function ForgotPasswordRoute() {

  // ForgotPasswordScreen uses useNavigation() hook internally,
  // but it only calls navigation.goBack() — which expo-router handles
  // natively via the back button. No bridge needed.
  return <ForgotPasswordScreenComponent />;
}
