import { useLocalSearchParams } from 'expo-router';
import SpotDetailScreen from '../../screens/SpotDetailScreen';
import { useNavigation } from '../../lib/useNavigation';

export default function SpotDetailRoute() {
  const navigation = useNavigation<any>();
  const params = useLocalSearchParams<{ spotId?: string | string[] }>();
  const spotId = Array.isArray(params.spotId) ? params.spotId[0] : params.spotId;

  return <SpotDetailScreen route={{ params: { spotId } }} navigation={navigation} />;
}
