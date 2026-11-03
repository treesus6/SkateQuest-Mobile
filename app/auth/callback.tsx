import { Platform } from 'react-native';
import NativeAuthCallback from '../../components/auth/NativeAuthCallback';
import WebAuthCallback from '../(auth)/callback';

export default Platform.OS === 'web' ? WebAuthCallback : NativeAuthCallback;
