import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionText && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  icon: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#d2673d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Pre-made empty states
export const EmptyStates = {
  NoSkateparks: () => (
    <EmptyState
      icon="🛹"
      title="No Skateparks Nearby"
      description="Try expanding your search radius or add a new skatepark to the map."
    />
  ),
  NoTricks: () => (
    <EmptyState
      icon="📹"
      title="No Tricks Yet"
      description="Start recording your tricks to build your portfolio and track your progress."
    />
  ),
  NoChallenges: () => (
    <EmptyState
      icon="🏆"
      title="No Active Challenges"
      description="Check back later for new challenges, or create a custom challenge for yourself."
    />
  ),
  NoResults: () => (
    <EmptyState
      icon="🔍"
      title="No Results Found"
      description="Try adjusting your search terms or filters."
    />
  ),
  NoFollowers: () => (
    <EmptyState
      icon="👥"
      title="No Followers Yet"
      description="Share your best tricks to attract followers and build your skate community."
    />
  ),
  NoNotifications: () => (
    <EmptyState
      icon="🔔"
      title="No Notifications"
      description="You're all caught up! New notifications will appear here."
    />
  ),
  Offline: () => (
    <EmptyState
      icon="📡"
      title="No Internet Connection"
      description="Connect to the internet to load fresh content."
    />
  ),
};

export default EmptyState;
