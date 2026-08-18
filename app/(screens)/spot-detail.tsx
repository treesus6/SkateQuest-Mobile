import { useLocalSearchParams, useRouter } from 'expo-router';
import SpotDetailScreen from '../../screens/SpotDetailScreen';

export default function SpotDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ spotId?: string | string[] }>();
  const spotId = Array.isArray(params.spotId) ? params.spotId[0] : params.spotId;

  const navigation = {
    navigate: (screen: string, routeParams: Record<string, unknown> = {}) => {
      if (screen === 'Map') {
        router.push('/(tabs)/map');
        return;
      }
      if (screen === 'ChallengesTab') {
        router.push('/(tabs)/quests');
        return;
      }
      if (screen === 'SpotReviews') {
        router.push({ pathname: '/(screens)/spot-reviews', params: routeParams as any });
        return;
      }
      if (screen === 'Sessions') {
        router.push({ pathname: '/(screens)/sessions', params: routeParams as any });
      }
    },
    goBack: () => router.back(),
  };

  return <SpotDetailScreen route={{ params: { spotId } }} navigation={navigation} />;
}
