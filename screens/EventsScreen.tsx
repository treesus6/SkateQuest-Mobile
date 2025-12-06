import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  created_by: string;
  attendee_count: number;
}

export default function EventsScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) {
        console.error('Error loading events:', error);
      } else {
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
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
          try {
            const { error } = await supabase.from('event_rsvps').insert([
              {
                event_id: eventId,
                user_id: user?.id,
              },
            ]);

            if (error) {
              if (error.code === '23505') {
                Alert.alert('Already registered', 'You already RSVPed to this event!');
              } else {
                throw error;
              }
            } else {
              Alert.alert('Success', 'RSVP confirmed!');
              loadEvents();
            }
          } catch (error: any) {
            Alert.alert('Error', error.message);
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
    <View style={styles.eventCard}>
      <View style={styles.dateTag}>
        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        <Text style={styles.timeText}>{item.time}</Text>
      </View>

      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.eventDescription}>{item.description}</Text>
        )}
        <Text style={styles.eventLocation}>📍 {item.location}</Text>
        <Text style={styles.attendeeCount}>
          👥 {item.attendee_count} attending
        </Text>
      </View>

      <TouchableOpacity
        style={styles.rsvpButton}
        onPress={() => rsvp(item.id)}
      >
        <Text style={styles.rsvpButtonText}>RSVP</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 Events</Text>
        <Text style={styles.headerSubtitle}>Upcoming skate sessions</Text>
      </View>

      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={loadEvents}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No upcoming events</Text>
            <Text style={styles.emptySubtext}>
              Check back later or create your own!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0ea',
  },
  header: {
    backgroundColor: '#FF6B35',
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 5,
  },
  listContainer: {
    padding: 15,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
  },
  dateTag: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    marginRight: 15,
  },
  dateText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  eventLocation: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  attendeeCount: {
    fontSize: 13,
    color: '#aaa',
  },
  rsvpButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginLeft: 10,
  },
  rsvpButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 5,
    textAlign: 'center',
  },
});
