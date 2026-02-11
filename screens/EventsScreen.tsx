import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getUpcomingEvents, rsvpToEvent, type Event } from '../services/events';

export default function EventsScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await getUpcomingEvents();
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const rsvp = async (eventId: string) => {
    Alert.alert('RSVP', 'Confirm attendance for this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'RSVP',
        onPress: async () => {
          if (!user) return;
          try {
            await rsvpToEvent(eventId, user.id);
            Alert.alert('Success', 'RSVP confirmed!');
            loadEvents();
          } catch (error: any) {
            if (error.code === '23505') {
              Alert.alert('Already registered', 'You already RSVPed to this event!');
            } else {
              Alert.alert('Error', error.message);
            }
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <View className="bg-white rounded-xl p-[15px] mb-[15px] shadow-md flex-row">
      <View className="bg-[#FF6B35] rounded-lg p-[10px] items-center justify-center min-w-[70px] mr-[15px]">
        <Text className="text-white text-sm font-bold">{formatDate(item.date)}</Text>
        <Text className="text-white text-xs mt-1">{item.time}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-lg font-bold text-[#333] mb-[5px]">{item.title}</Text>
        {item.description && <Text className="text-sm text-[#666] mb-2">{item.description}</Text>}
        <Text className="text-sm text-[#888] mb-1">
          {'\u{1F4CD}'} {item.location}
        </Text>
        <Text className="text-[13px] text-[#aaa]">
          {'\u{1F465}'} {item.attendee_count} attending
        </Text>
      </View>

      <TouchableOpacity
        className="bg-[#4CAF50] px-[15px] py-[10px] rounded-lg self-start ml-[10px]"
        onPress={() => rsvp(item.id)}
      >
        <Text className="text-white font-bold text-sm">RSVP</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-[#f5f0ea]">
      <View className="bg-[#FF6B35] p-5 rounded-bl-[20px] rounded-br-[20px]">
        <Text className="text-[28px] font-bold text-white text-center">{'\u{1F4C5}'} Events</Text>
        <Text className="text-sm text-white opacity-90 text-center mt-[5px]">
          Upcoming skate sessions
        </Text>
      </View>

      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item: Event) => item.id}
        contentContainerStyle={{ padding: 15 }}
        refreshing={loading}
        onRefresh={loadEvents}
        ListEmptyComponent={
          <View className="items-center mt-[100px]">
            <Text className="text-lg font-bold text-[#999]">No upcoming events</Text>
            <Text className="text-sm text-[#aaa] mt-[5px] text-center">
              Check back later or create your own!
            </Text>
          </View>
        }
      />
    </View>
  );
}
