import React, { useState } from 'react';
import { View, Text, FlatList, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CalendarDays, MapPin, Users, Clock, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { eventsService, Event } from '../lib/eventsService';
import { ScreenFadeIn } from '../components/ui';
import RetryBanner from '../components/RetryBanner';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export default function EventsScreen() {
  const user = useAuthStore(s => s.user);
  const [rsvpingId, setRsvpingId] = useState<string | null>(null);
  const {
    data: events,
    loading,
    error: queryError,
    refetch,
  } = useSupabaseQuery<Event[]>(() => eventsService.getUpcoming(user?.id), [user?.id]);

  const rsvp = async (event: Event) => {
    const attending = !event.is_attending;
    Alert.alert(
      attending ? 'Join session?' : 'Leave session?',
      attending
        ? 'Confirm your attendance for this session.'
        : 'Remove your RSVP from this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: attending ? 'Join' : 'Leave',
          style: attending ? 'default' : 'destructive',
          onPress: async () => {
            if (!user || rsvpingId) return;
            setRsvpingId(event.id);
            try {
              const { data, error } = await eventsService.setRsvp(event.id, attending);
              if (error) throw error;
              const result = data as { error?: string } | null;
              if (result?.error) throw new Error(result.error);
              await refetch();
            } catch (error: any) {
              Alert.alert('RSVP failed', error?.message ?? 'Your RSVP was not saved.');
            } finally {
              setRsvpingId(null);
            }
          },
        },
      ]
    );
  };

  const upcoming = events ?? [];
  const totalAttending = upcoming.reduce(
    (sum, event) => sum + Number(event.attendee_count || 0),
    0
  );

  const renderEvent = ({ item }: { item: Event }) => (
    <View className="bg-[#10151D] border border-[#252D39] rounded-[20px] p-4 mb-3">
      <View className="flex-row items-start gap-3">
        <View className="w-[64px] rounded-2xl bg-[#1B1110] border border-[#4F2A21] p-3 items-center">
          <Text className="text-[#D2673D] text-[10px] font-black uppercase">
            {new Date(item.date).toLocaleDateString('en-US', { month: 'short' })}
          </Text>
          <Text className="text-white text-2xl font-black mt-0.5">
            {new Date(item.date).getDate()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-white text-[17px] font-black">{item.title}</Text>
          {item.description ? (
            <Text className="text-[#A7AFBA] text-sm mt-1 leading-5" numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View className="flex-row items-center gap-1.5 mt-3">
            <Clock size={12} color="#7B8493" />
            <Text className="text-[#7B8493] text-xs">
              {formatDate(item.date)} · {item.time}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5 mt-1.5">
            <MapPin size={12} color="#7B8493" />
            <Text className="text-[#7B8493] text-xs flex-1">
              {(item as any).spot_name || item.location}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5 mt-1.5">
            <Users size={12} color="#4ADE80" />
            <Text className="text-[#8DD5A3] text-xs font-bold">
              {item.attendee_count} attending
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => rsvp(item)}
        disabled={rsvpingId !== null}
        className={`mt-4 rounded-xl py-3.5 flex-row items-center justify-center gap-2 ${item.is_attending ? 'bg-[#1F6D45]' : 'bg-[#D2673D]'}`}
      >
        {rsvpingId === item.id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Text className="text-white text-sm font-black">
              {item.is_attending ? "I'M GOING ✓" : 'RSVP'}
            </Text>
            <ChevronRight size={16} color="#fff" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenFadeIn>
      <View className="flex-1 bg-[#07090D]">
        <View className="px-5 pt-12 pb-5">
          <Text className="text-[#D2673D] text-[11px] font-black tracking-[2px]">PULL UP</Text>
          <Text className="text-white text-[30px] font-black mt-1">Events</Text>
          <Text className="text-[#7B8493] text-sm mt-1">
            Sessions, meetups and skate events happening next.
          </Text>

          <View className="flex-row gap-2 mt-4">
            <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
              <CalendarDays size={16} color="#D2673D" />
              <Text className="text-white text-xl font-black mt-1">{upcoming.length}</Text>
              <Text className="text-[#697383] text-[11px]">upcoming</Text>
            </View>
            <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
              <Users size={16} color="#4ADE80" />
              <Text className="text-white text-xl font-black mt-1">{totalAttending}</Text>
              <Text className="text-[#697383] text-[11px]">people going</Text>
            </View>
          </View>
        </View>

        <RetryBanner error={queryError} onRetry={refetch} loading={loading} />
        <FlatList
          data={upcoming}
          renderItem={renderEvent}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          refreshing={loading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View className="items-center mt-20 px-8">
              <View className="w-16 h-16 rounded-2xl bg-[#10151D] border border-[#252D39] items-center justify-center">
                <CalendarDays size={28} color="#596271" />
              </View>
              <Text className="text-white text-lg font-black mt-4">No upcoming events</Text>
              <Text className="text-[#697383] text-sm text-center mt-2">
                New skate sessions and events will show here when they’re posted.
              </Text>
            </View>
          }
        />
      </View>
    </ScreenFadeIn>
  );
}
