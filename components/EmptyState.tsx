import React from 'react';
import { View, Text } from 'react-native';
import { MapPin, Video, Trophy, Search, Users, Bell, Wifi } from 'lucide-react-native';
import Button from './ui/Button';

interface EmptyStateProps {
  icon?: string;
  iconComponent?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  iconComponent,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <View className="flex-1 justify-center items-center p-10">
      {iconComponent ? (
        <View className="mb-5">{iconComponent}</View>
      ) : icon ? (
        <Text className="text-[64px] mb-5">{icon}</Text>
      ) : null}
      <Text className="text-xl font-bold text-white mb-3 text-center">{title}</Text>
      <Text className="text-sm text-gray-400 text-center leading-5 mb-6">{description}</Text>
      {actionText && onAction && (
        <Button title={actionText} onPress={onAction} variant="primary" size="md" />
      )}
    </View>
  );
};

export const EmptyStates = {
  NoSkateparks: () => (
    <EmptyState
      iconComponent={<MapPin color="#d2673d" size={64} />}
      title="No Skateparks Nearby"
      description="Try expanding your search radius or add a new skatepark to the map."
    />
  ),
  NoTricks: () => (
    <EmptyState
      iconComponent={<Video color="#d2673d" size={64} />}
      title="No Tricks Yet"
      description="Start recording your tricks to build your portfolio and track your progress."
    />
  ),
  NoChallenges: () => (
    <EmptyState
      iconComponent={<Trophy color="#d2673d" size={64} />}
      title="No Active Challenges"
      description="Check back later for new challenges, or create a custom challenge for yourself."
    />
  ),
  NoResults: () => (
    <EmptyState
      iconComponent={<Search color="#d2673d" size={64} />}
      title="No Results Found"
      description="Try adjusting your search terms or filters."
    />
  ),
  NoFollowers: () => (
    <EmptyState
      iconComponent={<Users color="#d2673d" size={64} />}
      title="No Followers Yet"
      description="Share your best tricks to attract followers and build your skate community."
    />
  ),
  NoNotifications: () => (
    <EmptyState
      iconComponent={<Bell color="#d2673d" size={64} />}
      title="No Notifications"
      description="You're all caught up! New notifications will appear here."
    />
  ),
  Offline: () => (
    <EmptyState
      iconComponent={<Wifi color="#d2673d" size={64} />}
      title="No Internet Connection"
      description="Connect to the internet to load fresh content."
    />
  ),
};

export default EmptyState;
