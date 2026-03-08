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
import { ChevronLeft, Star, UserCheck, Users, Zap, Award } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

interface MentorProfile {
  id: string;
  user_id: string;
  specialty: string;
  tricks_mastered: number;
  level: number;
  username?: string;
}

interface ActiveMentorship {
  id: string;
  mentor_id: string;
  apprentice_id: string;
  status: string;
  xp_earned: number;
  tricks_learned: number;
  mentor_username?: string;
  apprentice_username?: string;
}

export default function MentorshipScreen() {
  const navigation = useNavigation();
  const [tab, setTab] = useState<'find' | 'mentor'>('find');
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [activeMentorship, setActiveMentorship] = useState<ActiveMentorship | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMentor, setIsMentor] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: mentorData } = await supabase
        .from('mentor_profiles')
        .select('*, profiles:user_id(username)')
        .eq('available', true)
        .order('level', { ascending: false })
        .limit(20);

      if (mentorData) {
        setMentors(mentorData.map((m: any) => ({ ...m, username: m.profiles?.username })));
      }

      const { data: ms } = await supabase
        .from('mentorships')
        .select('*, mentor:mentor_id(username), apprentice:apprentice_id(username)')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (ms) {
        setActiveMentorship({
          ...ms,
          mentor_username: (ms.mentor as any)?.username,
          apprentice_username: (ms.apprentice as any)?.username,
        });
      }
    } catch (_) {}
    setLoading(false);
  };

  const requestMentor = async (mentorUserId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('mentorships').insert([{
      mentor_id: mentorUserId,
      apprentice_id: user.id,
      status: 'pending',
      xp_earned: 0,
      tricks_learned: 0,
    }]);
    fetchData();
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

      {activeMentorship && (
        <View style={{ margin: 16, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#FF6B35' }}>
          <Text style={{ color: '#FF6B35', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6 }}>ACTIVE MENTORSHIP</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {activeMentorship.mentor_username} → {activeMentorship.apprentice_username}
              </Text>
              <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                {activeMentorship.tricks_learned} tricks learned together
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: '#4CAF50', fontWeight: '800', fontSize: 16 }}>+{activeMentorship.xp_earned}</Text>
              <Text style={{ color: '#666', fontSize: 10 }}>XP earned</Text>
            </View>
          </View>
        </View>
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
              <Switch value={isMentor} onValueChange={setIsMentor} trackColor={{ false: '#333', true: '#FF6B35' }} />
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
