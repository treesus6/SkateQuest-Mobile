import React from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { eventsService, Event } from '../lib/eventsService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { AnimatedListItem, ScreenFadeIn } from '../components/ui';
import { EmptyStates } from '../components/EmptyState';
import RetryBanner from '../components/RetryBanner';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export default function EventsScreen() {
  const user = useAuthStore(s => s.user);
  const { data: events, loading, error: queryError, refetch } = useSupabaseQuery<Event[]>(
    () => eventsService.getUpcoming(),
    []
  );

  const rsvp = async (eventId: string) => {
    Alert.alert('RSVP', 'Confirm attendance for this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'RSVP',
        onPress: async () => {
          try {
            const { error } = await eventsService.rsvp(eventId, user?.id ?? '');
            if (error) {
              if (error.code === '23505') {
                Alert.alert('Already registered', 'You already RSVPed to this event!');
              } else {
                throw error;
              }
            } else {
              Alert.alert('Success', 'RSVP confirmed!');
              refetch();
            }
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const renderEvent = ({ item, index }: { item: Event; index: number }) => (
    <AnimatedListItem index={index}>
    <Card className="flex-row">
      <View className="bg-brand-orange rounded-lg p-3 items-center justify-center min-w-[70px] mr-4">
        <Text className="text-white text-sm font-bold">{formatDate(item.date)}</Text>
        <Text className="text-white text-xs mt-1">{item.time}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">{item.title}</Text>
        {item.description ? (
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">{item.description}</Text>
        ) : null}
        <Text className="text-sm text-gray-400 dark:text-gray-500 mb-1">{item.location}</Text>
        <Text className="text-xs text-gray-300 dark:text-gray-500">{item.attendee_count} attending</Text>
      </View>

      <View className="self-start ml-2">
        <Button title="RSVP" onPress={() => rsvp(item.id)} variant="primary" size="sm" className="bg-brand-green" />
      </View>
    </Card>
    </AnimatedListItem>
  );

  return (
    <ScreenFadeIn>
      <View className="flex-1 bg-brand-beige dark:bg-gray-900">
        <View className="bg-brand-orange p-5 rounded-b-2xl">
          <Text className="text-2xl font-bold text-white text-center">Events</Text>
          <Text className="text-sm text-white/90 text-center mt-1">Upcoming skate sessions</Text>
        </View>

        <RetryBanner error={queryError} onRetry={refetch} loading={loading} />
        <FlatList
          data={events ?? []}
          renderItem={renderEvent}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshing={loading}
          onRefresh={refetch}
          ListEmptyComponent={<EmptyStates.NoEvents />}
        />
      </View>
    </ScreenFadeIn>
  );
}
