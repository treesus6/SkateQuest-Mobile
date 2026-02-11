import React from 'react';
import { View, Text } from 'react-native';
import {
  MapPin, Video, Trophy, Search, Users, Bell, Wifi,
  Calendar, Music, Target,
} from 'lucide-react-native';
import Button from './ui/Button';
import Card from './ui/Card';

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
      <Text className="text-xl font-bold text-gray-800 dark:text-white mb-3 text-center">{title}</Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400 text-center leading-5 mb-6">{description}</Text>
      {actionText && onAction && (
        <Button title={actionText} onPress={onAction} variant="primary" size="md" />
      )}
    </View>
  );
};

/**
 * Branded empty state with card wrapper, icon ring, and optional CTA.
 * Uses brand colors and shared UI components for consistency.
 */
const BrandedEmptyState: React.FC<EmptyStateProps & { accentColor?: string }> = ({
  iconComponent,
  title,
  description,
  actionText,
  onAction,
  accentColor = '#d2673d',
}) => {
  return (
    <View className="flex-1 justify-center items-center px-8 py-12">
      <Card className="w-full items-center py-10 px-6 bg-white dark:bg-gray-800">
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          {iconComponent}
        </View>
        <Text className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 text-center">
          {title}
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 text-center leading-5 mb-6">
          {description}
        </Text>
        {actionText && onAction && (
          <Button title={actionText} onPress={onAction} variant="primary" size="md" />
        )}
      </Card>
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

  // ── Branded empty states (Phase 20) ──────────────────────

  NoCrews: ({ onAction }: { onAction?: () => void }) => (
    <BrandedEmptyState
      iconComponent={<Users color="#6B4CE6" size={48} />}
      accentColor="#6B4CE6"
      title="No Crews Yet"
      description="Start a crew with your skate homies. Share sessions, compete together, and build your squad."
      actionText={onAction ? 'Create a Crew' : undefined}
      onAction={onAction}
    />
  ),

  NoEvents: ({ onAction }: { onAction?: () => void }) => (
    <BrandedEmptyState
      iconComponent={<Calendar color="#FF6B35" size={48} />}
      accentColor="#FF6B35"
      title="No Upcoming Events"
      description="No skate sessions or meetups on the calendar. Check back soon or organize your own event."
      actionText={onAction ? 'Browse Past Events' : undefined}
      onAction={onAction}
    />
  ),

  NoPlaylists: ({ onAction }: { onAction?: () => void }) => (
    <BrandedEmptyState
      iconComponent={<Music color="#d2673d" size={48} />}
      accentColor="#d2673d"
      title="No Session Playlists"
      description="Share your favorite skating playlists with the community. Spotify, Apple Music, and YouTube supported."
      actionText={onAction ? 'Share a Playlist' : undefined}
      onAction={onAction}
    />
  ),

  NoChallengesActive: ({ onAction }: { onAction?: () => void }) => (
    <BrandedEmptyState
      iconComponent={<Target color="#4CAF50" size={48} />}
      accentColor="#4CAF50"
      title="All Caught Up!"
      description="You've completed all active challenges. New challenges drop regularly — keep pushing your skills."
      actionText={onAction ? 'View Completed' : undefined}
      onAction={onAction}
    />
  ),
};

export { BrandedEmptyState };
export default EmptyState;
