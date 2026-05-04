import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

const TRICKS = [
  'Kickflip', 'Heelflip', 'Tre Flip', 'Pop Shove-it', 'Backside 180',
  'Frontside 180', 'Varial Flip', 'Hardflip', 'Inward Heel', 'Ollie',
  'Nollie', 'Switch Ollie', 'Fakie Ollie', 'Boardslide', 'Noseslide',
  'Tailslide', 'Crooked Grind', 'Smith Grind', '50-50', 'Nosegrind',
];

export default function AiCoachScreen() {
  const { user } = useAuthStore();
  const [selectedTrick, setSelectedTrick] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const analyze = async () => {
    if (!selectedTrick) {
      Alert.alert('Select a trick', 'Pick which trick you want coaching on.');
      return;
    }
    setAnalyzing(true);

    // Simulate AI analysis (replace with real API call later)
    await new Promise(r => setTimeout(r, 2000));

    const tips: Record<string, string[]> = {
      'Kickflip': [
        'Position your front foot just below the bolts, angled slightly',
        'Pop hard off your back foot, then flick your front foot off the edge',
        'Level out your shoulders — dont lean back',
        'Catch with your back foot first, then front foot',
        'Look at your board throughout the trick',
      ],
      'Heelflip': [
        'Front foot should be in ollie position, toes hanging off the edge',
        'Flick your heel out and forward when you pop',
        'Pop sharp and let the board spin under you',
        'Keep your body centered over the board',
        'Catch it clean with both feet over the bolts',
      ],
      'default': [
        'Film yourself from the side to see your full body position',
        'Start slow — practice the foot position on flat ground first',
        'Keep your shoulders parallel to your board direction',
        'Stay centered — dont lean too far forward or backward',
        'Commit fully on every attempt — hesitation causes bails',
      ],
    };

    const scores: Record<string, number> = {
      'Kickflip': 72, 'Heelflip': 68, 'Tre Flip': 45, 'default': 65
    };

    const analysis = `Your ${selectedTrick} shows potential. Focus on your foot placement and commitment. Most skaters struggle with this trick due to inconsistent pop timing and body positioning. Review the tips below and film yourself from the side for better feedback.`;

    const tip = tips[selectedTrick] || tips['default'];
    const score = scores[selectedTrick] || scores['default'];

    const session = {
      trick_name: selectedTrick,
      analysis,
      tips: tip,
      score,
      video_url: 'placeholder',
    };

    if (user) {
      await supabase.from('ai_coach_sessions').insert({
        user_id: user.id, ...session
      });
    }

    setResult(session);
    setAnalyzing(false);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={s.header}>
          <Text style={s.title}>🤖 AI Trick Coach</Text>
          <Text style={s.sub}>Get coaching tips for any trick. AI-powered, skater-approved.</Text>
        </View>

        {!result ? (
          <>
            <Text style={s.label}>What trick are you working on?</Text>
            <View style={s.trickGrid}>
              {TRICKS.map(trick => (
                <TouchableOpacity
                  key={trick}
                  style={[s.trickChip, selectedTrick === trick && s.trickChipOn]}
                  onPress={() => setSelectedTrick(trick)}
                >
                  <Text style={[s.trickTxt, selectedTrick === trick && s.trickTxtOn]}>{trick}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.analyzeBtn, (!selectedTrick || analyzing) && s.analyzeBtnDis]}
              onPress={analyze}
              disabled={!selectedTrick || analyzing}
            >
              {analyzing ? (
                <View style={s.loadingRow}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={s.analyzeTxt}>Analyzing...</Text>
                </View>
              ) : (
                <Text style={s.analyzeTxt}>Get Coaching Tips →</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={s.result}>
            <View style={s.scoreCard}>
              <Text style={s.scoreTrick}>{result.trick_name}</Text>
              <View style={s.scoreCircle}>
                <Text style={s.scoreNum}>{result.score}</Text>
                <Text style={s.scoreLabel}>/ 100</Text>
              </View>
            </View>

            <View style={s.analysisCard}>
              <Text style={s.analysisTitle}>📊 Analysis</Text>
              <Text style={s.analysisText}>{result.analysis}</Text>
            </View>

            <View style={s.tipsCard}>
              <Text style={s.tipsTitle}>💡 Tips to Improve</Text>
              {result.tips.map((tip: string, i: number) => (
                <View key={i} style={s.tipRow}>
                  <Text style={s.tipNum}>{i + 1}</Text>
                  <Text style={s.tipTxt}>{tip}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={s.resetBtn} onPress={() => { setResult(null); setSelectedTrick(''); }}>
              <Text style={s.resetTxt}>Analyze Another Trick</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070B' },
  header: { padding: 20 },
  title: { fontSize: 24, fontWeight: '900', color: '#F3F4F6' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  label: { color: '#9CA3AF', fontSize: 14, fontWeight: '600', paddingHorizontal: 20, marginBottom: 10 },
  trickGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  trickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1a2030' },
  trickChipOn: { backgroundColor: 'rgba(210,103,61,0.2)', borderColor: '#d2673d' },
  trickTxt: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  trickTxtOn: { color: '#d2673d' },
  analyzeBtn: { margin: 20, backgroundColor: '#d2673d', borderRadius: 12, padding: 16, alignItems: 'center' },
  analyzeBtnDis: { opacity: 0.5 },
  analyzeTxt: { color: 'white', fontWeight: '700', fontSize: 16 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  result: { padding: 16, gap: 14 },
  scoreCard: { backgroundColor: '#111827', borderRadius: 12, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#d2673d' },
  scoreTrick: { color: '#F3F4F6', fontSize: 22, fontWeight: '900' },
  scoreCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(210,103,61,0.2)', borderWidth: 2, borderColor: '#d2673d', alignItems: 'center', justifyContent: 'center' },
  scoreNum: { color: '#d2673d', fontSize: 24, fontWeight: '900' },
  scoreLabel: { color: '#6B7280', fontSize: 10 },
  analysisCard: { backgroundColor: '#111827', borderRadius: 12, padding: 16 },
  analysisTitle: { color: '#d2673d', fontWeight: '700', fontSize: 14, marginBottom: 8 },
  analysisText: { color: '#9CA3AF', fontSize: 14, lineHeight: 22 },
  tipsCard: { backgroundColor: '#111827', borderRadius: 12, padding: 16 },
  tipsTitle: { color: '#d2673d', fontWeight: '700', fontSize: 14, marginBottom: 12 },
  tipRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  tipNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#d2673d', color: 'white', textAlign: 'center', lineHeight: 22, fontSize: 12, fontWeight: '900', flexShrink: 0 },
  tipTxt: { color: '#9CA3AF', fontSize: 14, lineHeight: 20, flex: 1 },
  resetBtn: { borderWidth: 1, borderColor: '#d2673d', borderRadius: 12, padding: 14, alignItems: 'center' },
  resetTxt: { color: '#d2673d', fontWeight: '700', fontSize: 15 },
});
