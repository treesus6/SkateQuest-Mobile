import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Star, UserCheck, Users, Zap, Award, MessageSquare } from 'lucide-react-native';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { mentorshipService } from '../lib/mentorshipService';
import { useAuthStore } from '../stores/useAuthStore';

interface MentorProfile {
  id: string;
  user_id: string;
  specialty: string;
  tricks_mastered: number;
  level: number;
  username?: string;
}

export default function MentorshipScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'find' | 'mentor'>('find');
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [activeRelationships, setActiveRelationships] = useState<any[]>([]);
  const [_stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMentor, setIsMentor] = useState(false);

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Still use mentor_profiles for the "Find" list
      const { data: mentorData } = await supabase
        .from('mentor_profiles')
        .select('*, profiles:user_id(username)')
        .eq('available', true)
        .neq('user_id', user.id)
        .order('level', { ascending: false })
        .limit(20);

      if (mentorData) {
        setMentors(mentorData.map((m: any) => ({ ...m, username: m.profiles?.username })));
      }

      // Use the newer mentorshipService for active relationships
      const [mentees, mentors_list, mentorshipStats] = await Promise.all([
        mentorshipService.getUserMentees(user.id),
        mentorshipService.getUserMentors(user.id),
        mentorshipService.getMentorshipStats(user.id)
      ]);

      setActiveRelationships([...mentees, ...mentors_list]);
      setStats(mentorshipStats);

      // Check if current user is a mentor
      const { data: myProfile } = await supabase
        .from('mentor_profiles')
        .select('available')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (myProfile) setIsMentor(myProfile.available);

    } catch (error) {
      console.error('Error fetching mentorship data:', error);
    }
    setLoading(false);
  };

  const requestMentor = async (mentorUserId: string) => {
    if (!user) return;
    try {
      await mentorshipService.requestMentorship(mentorUserId, user.id, 'I want to learn more street tricks!');
      Alert.alert('Success', 'Mentorship request sent!');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const toggleMentorStatus = async (val: boolean) => {
    if (!user) return;
    setIsMentor(val);
    try {
      await supabase
        .from('mentor_profiles')
        .upsert({ 
          user_id: user.id, 
          available: val,
          specialty: 'street', // default
          tricks_mastered: 0,
          level: 1
        });
    } catch (error) {
      console.error('Error toggling mentor status:', error);
    }
  };

  const specialtyColor = (s: string) => {
    if (s === 'street') return '#FF6B35';
    if (s === 'vert') return '#6B4CE6';
    return '#4CAF50';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <ChevronLeft color="#666" size={24} />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', flex: 1 }}>Mentorship</Text>
        <Award color="#FF6B35" size={22} />
      </View>

      {activeRelationships.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 120, marginBottom: 10 }}>
          {activeRelationships.map((rel: any) => (
            <TouchableOpacity 
              key={rel.id}
              onPress={() => (navigation as any).navigate('Messages', { recipientId: rel.mentor_user_id === user?.id ? rel.mentee_user_id : rel.mentor_user_id })}
              style={{ width: 280, marginHorizontal: 16, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: rel.status === 'active' ? '#4CAF50' : '#FF6B35' }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: rel.status === 'active' ? '#4CAF50' : '#FF6B35', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 }}>
                    {rel.status.toUpperCase()} {rel.mentor_user_id === user?.id ? 'APPRENTICE' : 'MENTOR'}
                  </Text>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    {rel.mentor_user_id === user?.id ? 'Teaching Skater' : 'Learning from Mentor'}
                  </Text>
                </View>
                <MessageSquare color="#666" size={18} />
              </View>
              <Text style={{ color: '#666', fontSize: 11, marginTop: 6 }}>
                Last interaction: {new Date(rel.last_interaction).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1a1a1a', borderRadius: 10, padding: 4 }}>
        {(['find', 'mentor'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: tab === t ? '#FF6B35' : 'transparent', alignItems: 'center' }}
          >
            <Text style={{ color: tab === t ? '#fff' : '#666', fontWeight: '700', fontSize: 13 }}>
              {t === 'find' ? 'Find a Mentor' : 'Be a Mentor'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#FF6B35" style={{ marginTop: 40 }} />
      ) : tab === 'find' ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          <Text style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
            Connect with experienced skaters. When you land tricks, your mentor earns bonus XP too.
          </Text>
          {mentors.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Users color="#333" size={40} />
              <Text style={{ color: '#444', marginTop: 12 }}>No mentors available right now</Text>
            </View>
          ) : (
            mentors.map(mentor => (
              <View key={mentor.id} style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a2a' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{mentor.username || 'Skater'}</Text>
                      <View style={{ backgroundColor: specialtyColor(mentor.specialty), paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{mentor.specialty?.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Star color="#FFD700" size={14} />
                        <Text style={{ color: '#666', fontSize: 12 }}>Level {mentor.level}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Zap color="#FF6B35" size={14} />
                        <Text style={{ color: '#666', fontSize: 12 }}>{mentor.tricks_mastered} tricks mastered</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => requestMentor(mentor.user_id)}
                    style={{ backgroundColor: '#FF6B35', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Request</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          <Text style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
            Share your skills. Earn bonus XP every time your apprentice lands a trick.
          </Text>
          <View style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Available as Mentor</Text>
                <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>Show up in the mentor list</Text>
              </View>
              <Switch value={isMentor} onValueChange={toggleMentorStatus} trackColor={{ false: '#333', true: '#FF6B35' }} />
            </View>
          </View>
          <View style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2a2a2a' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <UserCheck color="#FF6B35" size={20} />
              <Text style={{ color: '#fff', fontWeight: '700' }}>Mentor Perks</Text>
            </View>
            {[
              'Earn +10 XP every time your apprentice lands a trick',
              'Bonus XP multiplier after 30-day mentorship',
              'Exclusive "Mentor" badge on your profile',
              'Apprentice progress shown in your dashboard',
            ].map((perk, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                <Text style={{ color: '#4CAF50', fontWeight: '800' }}>•</Text>
                <Text style={{ color: '#888', fontSize: 13, flex: 1 }}>{perk}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
