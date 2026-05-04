import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, FlatList, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getTrickCoaching, getAllTrickNames, getDifficulty,
  getSkateBotResponse, searchTricks, getProgressionPath
} from '../lib/trickDatabase';

type Tab = 'coach' | 'bot' | 'tricks';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

export default function AiCoachScreen() {
  const [tab, setTab] = useState<Tab>('coach');
  const [selectedTrick, setSelectedTrick] = useState('');
  const [coachData, setCoachData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'bot', text: "Whats up! I'm your skate coach. Ask me about any trick — foot position, common mistakes, what to learn next. What are you working on?" }
  ]);
  const [input, setInput] = useState('');

  const allTricks = getAllTrickNames();
  const filteredTricks = search ? searchTricks(search) : [];

  const lookupTrick = (name: string) => {
    const data = getTrickCoaching(name);
    setCoachData(data);
    setSelectedTrick(name);
    setTab('coach');
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    const response = getSkateBotResponse(input);
    const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'bot', text: response };
    setMessages(prev => [...prev, userMsg, botMsg]);
    setInput('');
  };

  const tabs = [
    { key: 'coach', label: '🛹 Coach' },
    { key: 'bot', label: '🤖 Ask Bot' },
    { key: 'tricks', label: '📚 Tricks' },
  ];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>AI Trick Coach</Text>
        <Text style={s.sub}>Free coaching. No internet needed.</Text>
      </View>

      <View style={s.tabs}>
        {tabs.map(t => (
          <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && s.tabOn]} onPress={() => setTab(t.key as Tab)}>
            <Text style={[s.tabTxt, tab === t.key && s.tabTxtOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* COACH TAB */}
      {tab === 'coach' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
          <TextInput
            style={s.searchInput}
            placeholder="Search a trick to get coached on..."
            placeholderTextColor="#4B5563"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => { if (search) lookupTrick(search); }}
          />

          {search.length > 0 && filteredTricks.length > 0 && (
            <View style={s.searchResults}>
              {filteredTricks.map(t => (
                <TouchableOpacity key={t.name} style={s.searchResult} onPress={() => { lookupTrick(t.name); setSearch(''); }}>
                  <Text style={s.searchResultTxt}>{t.name}</Text>
                  <Text style={s.searchResultDiff}>{getDifficulty(t.difficulty)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {coachData ? (
            <>
              <View style={s.trickCard}>
                <View style={s.trickHeader}>
                  <Text style={s.trickName}>{coachData.name}</Text>
                  <View style={s.diffBadge}>
                    <Text style={s.diffTxt}>{getDifficulty(coachData.difficulty)}</Text>
                  </View>
                </View>
                <Text style={s.trickDesc}>{coachData.description}</Text>
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>👟 Foot Position</Text>
                <View style={s.footBox}>
                  <Text style={s.footLabel}>Front Foot</Text>
                  <Text style={s.footText}>{coachData.footPosition.front}</Text>
                </View>
                <View style={s.footBox}>
                  <Text style={s.footLabel}>Back Foot</Text>
                  <Text style={s.footText}>{coachData.footPosition.back}</Text>
                </View>
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>📋 Steps</Text>
                {coachData.steps.map((step: string, i: number) => (
                  <View key={i} style={s.stepRow}>
                    <View style={s.stepNum}><Text style={s.stepNumTxt}>{i+1}</Text></View>
                    <Text style={s.stepTxt}>{step}</Text>
                  </View>
                ))}
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>❌ Common Mistakes & Fixes</Text>
                {coachData.commonMistakes.map((m: any, i: number) => (
                  <View key={i} style={s.mistakeCard}>
                    <Text style={s.mistakeText}>❌ {m.mistake}</Text>
                    <Text style={s.fixText}>✅ {m.fix}</Text>
                  </View>
                ))}
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>💡 Pro Tips</Text>
                {coachData.tips.map((tip: string, i: number) => (
                  <Text key={i} style={s.tipText}>• {tip}</Text>
                ))}
              </View>

              {coachData.progressionTricks.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>🚀 Learn Next</Text>
                  <View style={s.progGrid}>
                    {coachData.progressionTricks.map((t: string) => (
                      <TouchableOpacity key={t} style={s.progChip} onPress={() => lookupTrick(t)}>
                        <Text style={s.progTxt}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🛹</Text>
              <Text style={s.emptyTitle}>Pick a trick to get coached</Text>
              <Text style={s.emptyText}>Search above or browse the tricks list</Text>
              <View style={s.quickPicks}>
                {['ollie', 'kickflip', 'heelflip', 'tre flip', 'boardslide', 'manual'].map(t => (
                  <TouchableOpacity key={t} style={s.quickPick} onPress={() => lookupTrick(t)}>
                    <Text style={s.quickPickTxt}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* BOT TAB */}
      {tab === 'bot' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            data={messages}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <View style={[s.bubble, item.role === 'user' ? s.userBubble : s.botBubble]}>
                <Text style={[s.bubbleTxt, item.role === 'user' ? s.userTxt : s.botTxt]}>{item.text}</Text>
              </View>
            )}
          />
          <View style={s.inputRow}>
            <TextInput
              style={s.chatInput}
              placeholder="Ask anything about skating..."
              placeholderTextColor="#4B5563"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity style={s.sendBtn} onPress={sendMessage}>
              <Text style={s.sendTxt}>→</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* TRICKS TAB */}
      {tab === 'tricks' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {(['flatground', 'flip', 'grind', 'manual', 'transition', 'grab'] as const).map(cat => {
            const tricks = Object.values(require('../lib/trickDatabase').TRICK_DATABASE).filter((t: any) => t.category === cat);
            if (!tricks.length) return null;
            return (
              <View key={cat} style={{ marginBottom: 20 }}>
                <Text style={s.catTitle}>{cat.toUpperCase()}</Text>
                {(tricks as any[]).map((t: any) => (
                  <TouchableOpacity key={t.name} style={s.trickRow} onPress={() => lookupTrick(t.name)}>
                    <Text style={s.trickRowName}>{t.name}</Text>
                    <View style={s.diffDots}>
                      {[1,2,3,4,5].map(i => (
                        <View key={i} style={[s.dot, i <= t.difficulty && s.dotOn]} />
                      ))}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070B' },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '900', color: '#F3F4F6' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#111827', alignItems: 'center' },
  tabOn: { backgroundColor: '#d2673d' },
  tabTxt: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  tabTxtOn: { color: 'white' },
  searchInput: { backgroundColor: '#111827', color: '#F3F4F6', padding: 14, borderRadius: 10, fontSize: 15 },
  searchResults: { backgroundColor: '#111827', borderRadius: 10, overflow: 'hidden' },
  searchResult: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderColor: '#1a2030' },
  searchResultTxt: { color: '#F3F4F6', fontSize: 14, fontWeight: '600' },
  searchResultDiff: { color: '#6B7280', fontSize: 12 },
  trickCard: { backgroundColor: '#111827', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#d2673d' },
  trickHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  trickName: { color: '#F3F4F6', fontSize: 22, fontWeight: '900' },
  diffBadge: { backgroundColor: 'rgba(210,103,61,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#d2673d' },
  diffTxt: { color: '#d2673d', fontSize: 12, fontWeight: '700' },
  trickDesc: { color: '#9CA3AF', fontSize: 14, lineHeight: 22 },
  section: { backgroundColor: '#111827', borderRadius: 12, padding: 16 },
  sectionTitle: { color: '#d2673d', fontWeight: '700', fontSize: 14, marginBottom: 12 },
  footBox: { backgroundColor: '#0a0e1a', borderRadius: 8, padding: 10, marginBottom: 8 },
  footLabel: { color: '#6B7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  footText: { color: '#F3F4F6', fontSize: 14, lineHeight: 20 },
  stepRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#d2673d', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  stepNumTxt: { color: 'white', fontWeight: '900', fontSize: 12 },
  stepTxt: { color: '#9CA3AF', fontSize: 14, lineHeight: 20, flex: 1 },
  mistakeCard: { backgroundColor: '#0a0e1a', borderRadius: 8, padding: 10, marginBottom: 8 },
  mistakeText: { color: '#FCA5A5', fontSize: 13, marginBottom: 4 },
  fixText: { color: '#86EFAC', fontSize: 13 },
  tipText: { color: '#9CA3AF', fontSize: 14, lineHeight: 22, marginBottom: 6 },
  progGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  progChip: { backgroundColor: 'rgba(210,103,61,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(210,103,61,0.4)' },
  progTxt: { color: '#d2673d', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#F3F4F6', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  emptyText: { color: '#6B7280', fontSize: 14, marginBottom: 20 },
  quickPicks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  quickPick: { backgroundColor: '#111827', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#1a2030' },
  quickPickTxt: { color: '#9CA3AF', fontSize: 13 },
  bubble: { maxWidth: '85%', borderRadius: 14, padding: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#d2673d' },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#111827' },
  bubbleTxt: { fontSize: 14, lineHeight: 22 },
  userTxt: { color: 'white' },
  botTxt: { color: '#E5E7EB' },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderColor: '#1a2030' },
  chatInput: { flex: 1, backgroundColor: '#111827', color: '#F3F4F6', padding: 12, borderRadius: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#d2673d', alignItems: 'center', justifyContent: 'center' },
  sendTxt: { color: 'white', fontWeight: '900', fontSize: 18 },
  catTitle: { color: '#d2673d', fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  trickRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#0f1220' },
  trickRowName: { color: '#E5E7EB', fontSize: 14, fontWeight: '600' },
  diffDots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a2030' },
  dotOn: { backgroundColor: '#d2673d' },
});
