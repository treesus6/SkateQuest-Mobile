import { useLocalSearchParams } from 'expo-router';
import SpotDetailScreen from '../../screens/SpotDetailScreen';
import { useNavigation } from '../../lib/useNavigation';
import { normalizeSpotId } from '../../lib/spotLinks';

export default function SpotDetailRoute() {
  const navigation = useNavigation<any>();
  const params = useLocalSearchParams<{ spotId?: string | string[] }>();
  const spotId = normalizeSpotId(params.spotId);

  return <SpotDetailScreen route={{ params: { spotId } }} navigation={navigation} />;
}
