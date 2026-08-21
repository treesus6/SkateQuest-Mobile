import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  Footprints,
  Lightbulb,
  ListChecks,
  MessageCircle,
  Search,
  Sparkles,
  Target,
  TriangleAlert,
  X,
  Zap,
} from 'lucide-react-native';
import {
  getTrickCoaching,
  getDifficulty,
  getSkateBotResponse,
  searchTricks,
  TRICK_DATABASE,
} from '../lib/trickDatabase';
import { analyzeTrick, getFallbackAnalysis, TrickAnalysis } from '../lib/trickAnalyzer';

type Tab = 'coach' | 'bot' | 'tricks' | 'analyze';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

const TABS: Array<{ key: Tab; label: string; icon: React.ComponentType<any> }> = [
  { key: 'coach', label: 'COACH', icon: Target },
  { key: 'bot', label: 'ASK', icon: MessageCircle },
  { key: 'tricks', label: 'TRICKS', icon: BookOpen },
  { key: 'analyze', label: 'ANALYZE', icon: Zap },
];

const CATEGORIES = ['flatground', 'flip', 'grind', 'manual', 'transition', 'grab'] as const;

export default function AiCoachScreen() {
  const [tab, setTab] = useState<Tab>('coach');
  const [_selectedTrick, setSelectedTrick] = useState('');
  const [coachData, setCoachData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'bot',
      text: "What's up. Ask me about a trick — foot position, common mistakes, or what to learn next. What are you working on?",
    },
  ]);
  const [input, setInput] = useState('');
  const [analyzeInput, setAnalyzeInput] = useState('');
  const [analyzeDescription, setAnalyzeDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<TrickAnalysis | null>(null);
  const [analyzeError, setAnalyzeError] = useState('');

  const filteredTricks = search ? searchTricks(search) : [];
  const trickGroups = useMemo(
    () =>
      CATEGORIES.map(category => ({
        category,
        tricks: Object.values(TRICK_DATABASE).filter(trick => trick.category === category),
      })).filter(group => group.tricks.length > 0),
    []
  );

  const lookupTrick = (name: string) => {
    const data = getTrickCoaching(name);
    setCoachData(data);
    setSelectedTrick(name);
    setTab('coach');
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const text = input.trim();
    const now = Date.now();
    const userMsg: Message = { id: now.toString(), role: 'user', text };
    const response = getSkateBotResponse(text);
    const botMsg: Message = { id: (now + 1).toString(), role: 'bot', text: response };
    setMessages(prev => [...prev, userMsg, botMsg]);
    setInput('');
  };

  const handleAnalyze = async () => {
    if (!analyzeInput.trim()) return;
    setAnalyzing(true);
    setAnalyzeResult(null);
    setAnalyzeError('');
    try {
      const result = await analyzeTrick(
        analyzeInput.trim(),
        analyzeDescription.trim() || undefined
      );
      setAnalyzeResult(result);
    } catch (_err) {
      const fallback = getFallbackAnalysis(analyzeInput.trim());
      setAnalyzeResult(fallback);
      setAnalyzeError('Server analysis unavailable — showing offline SkateQuest analysis instead.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.hero}>
        <View style={s.orangeSlash} />
        <View style={s.acidSlash} />
        <View style={s.blueOrb} />
        <View style={s.heroTop}>
          <View style={s.heroStamp}>
            <Bot color={INK} size={29} strokeWidth={2.8} />
          </View>
          <View style={s.offlineChip}>
            <BookOpen color={INK} size={12} strokeWidth={3} />
            <Text style={s.offlineChipText}>OFFLINE COACHING</Text>
          </View>
        </View>
        <Text style={s.eyebrow}>SKATEQUEST TRICK NOTEBOOK</Text>
        <Text style={s.title}>TRICK{`\n`}COACH.</Text>
        <Text style={s.subtitle}>
          The trick library, coaching notes, and Q&A work offline. AI Analyze tries the server first and falls back to local analysis.
        </Text>
      </View>

      <View style={s.tabs}>
        {TABS.map(item => {
          const Icon = item.icon;
          const selected = tab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.tab, selected && s.tabOn]}
              onPress={() => setTab(item.key)}
            >
              <Icon color={selected ? INK : '#7D8591'} size={15} strokeWidth={2.8} />
              <Text style={[s.tabTxt, selected && s.tabTxtOn]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'coach' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.scrollContent}
        >
          <View style={s.searchWrap}>
            <Search color="#6E746F" size={18} strokeWidth={2.6} />
            <TextInput
              style={s.searchInput}
              placeholder="Search a trick..."
              placeholderTextColor="#777D87"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => {
                if (search.trim()) lookupTrick(search.trim());
              }}
              returnKeyType="search"
            />
          </View>

          {search.length > 0 && filteredTricks.length > 0 ? (
            <View style={s.searchResults}>
              {filteredTricks.slice(0, 8).map(trick => (
                <TouchableOpacity
                  key={trick.name}
                  style={s.searchResult}
                  onPress={() => {
                    lookupTrick(trick.name);
                    setSearch('');
                  }}
                >
                  <View>
                    <Text style={s.searchResultTxt}>{trick.name}</Text>
                    <Text style={s.searchResultDiff}>{getDifficulty(trick.difficulty)}</Text>
                  </View>
                  <ArrowRight color={INK} size={17} strokeWidth={2.8} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {coachData ? (
            <>
              <View style={s.trickHeroCard}>
                <View style={s.trickHeader}>
                  <View style={s.trickTitleWrap}>
                    <Text style={s.cardKicker}>COACHING FILE</Text>
                    <Text style={s.trickName}>{coachData.name}</Text>
                  </View>
                  <View style={s.diffBadge}>
                    <Text style={s.diffTxt}>{getDifficulty(coachData.difficulty)}</Text>
                  </View>
                </View>
                <Text style={s.trickDesc}>{coachData.description}</Text>
              </View>

              <View style={s.paperSection}>
                <View style={s.sectionHeading}>
                  <Footprints color={INK} size={20} strokeWidth={2.7} />
                  <View>
                    <Text style={s.sectionKicker}>SETUP</Text>
                    <Text style={s.sectionTitle}>Foot position</Text>
                  </View>
                </View>
                <View style={s.footGrid}>
                  <View style={s.footBox}>
                    <Text style={s.footLabel}>FRONT FOOT</Text>
                    <Text style={s.footText}>{coachData.footPosition.front}</Text>
                  </View>
                  <View style={s.footBox}>
                    <Text style={s.footLabel}>BACK FOOT</Text>
                    <Text style={s.footText}>{coachData.footPosition.back}</Text>
                  </View>
                </View>
              </View>

              <View style={s.paperSection}>
                <View style={s.sectionHeading}>
                  <ListChecks color={INK} size={20} strokeWidth={2.7} />
                  <View>
                    <Text style={s.sectionKicker}>BREAK IT DOWN</Text>
                    <Text style={s.sectionTitle}>Steps</Text>
                  </View>
                </View>
                <View style={s.stepList}>
                  {coachData.steps.map((step: string, i: number) => (
                    <View key={`${step}-${i}`} style={s.stepRow}>
                      <View style={s.stepNum}><Text style={s.stepNumTxt}>{i + 1}</Text></View>
                      <Text style={s.stepTxt}>{step}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={s.darkSection}>
                <View style={s.darkSectionHeading}>
                  <TriangleAlert color={ORANGE} size={20} strokeWidth={2.7} />
                  <View>
                    <Text style={s.darkKicker}>WHAT GOES WRONG</Text>
                    <Text style={s.darkTitle}>Mistakes + fixes</Text>
                  </View>
                </View>
                {coachData.commonMistakes.map((mistake: any, i: number) => (
                  <View key={`${mistake.mistake}-${i}`} style={s.mistakeCard}>
                    <View style={s.mistakeLine}>
                      <X color={ORANGE} size={15} strokeWidth={3} />
                      <Text style={s.mistakeText}>{mistake.mistake}</Text>
                    </View>
                    <View style={s.fixLine}>
                      <Check color={ACID} size={15} strokeWidth={3} />
                      <Text style={s.fixText}>{mistake.fix}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={s.acidSection}>
                <View style={s.sectionHeading}>
                  <Lightbulb color={INK} size={20} strokeWidth={2.8} />
                  <View>
                    <Text style={s.sectionKicker}>COACH NOTES</Text>
                    <Text style={s.sectionTitle}>Pro tips</Text>
                  </View>
                </View>
                {coachData.tips.map((tip: string, i: number) => (
                  <View key={`${tip}-${i}`} style={s.tipRow}>
                    <View style={s.tipDot} />
                    <Text style={s.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>

              {coachData.progressionTricks.length > 0 ? (
                <View style={s.nextSection}>
                  <Text style={s.nextKicker}>WHAT TO LEARN NEXT</Text>
                  <View style={s.progGrid}>
                    {coachData.progressionTricks.map((trick: string) => (
                      <TouchableOpacity key={trick} style={s.progChip} onPress={() => lookupTrick(trick)}>
                        <Text style={s.progTxt}>{trick}</Text>
                        <ArrowRight color={INK} size={14} strokeWidth={2.8} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          ) : (
            <View style={s.emptyCoach}>
              <View style={s.emptyStamp}><Target color={INK} size={29} strokeWidth={2.8} /></View>
              <Text style={s.emptyKicker}>PICK A TRICK</Text>
              <Text style={s.emptyTitle}>OPEN A COACHING FILE</Text>
              <Text style={s.emptyText}>Search above or start with one of these.</Text>
              <View style={s.quickPicks}>
                {['ollie', 'kickflip', 'heelflip', 'tre flip', 'boardslide', 'manual'].map(trick => (
                  <TouchableOpacity key={trick} style={s.quickPick} onPress={() => lookupTrick(trick)}>
                    <Text style={s.quickPickTxt}>{trick.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      ) : null}

      {tab === 'bot' ? (
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modeIntro}>
            <Bot color={INK} size={20} strokeWidth={2.8} />
            <View style={s.modeIntroCopy}>
              <Text style={s.modeIntroTitle}>OFFLINE SKATE Q&A</Text>
              <Text style={s.modeIntroText}>Answers come from the built-in SkateQuest trick knowledge — no network call required.</Text>
            </View>
          </View>
          <FlatList
            data={messages}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.chatList}
            renderItem={({ item }) => (
              <View style={[s.bubble, item.role === 'user' ? s.userBubble : s.botBubble]}>
                <Text style={s.bubbleRole}>{item.role === 'user' ? 'YOU' : 'COACH'}</Text>
                <Text style={[s.bubbleTxt, item.role === 'user' && s.userTxt]}>{item.text}</Text>
              </View>
            )}
          />
          <View style={s.inputRow}>
            <TextInput
              style={s.chatInput}
              placeholder="Ask about a trick..."
              placeholderTextColor="#777D87"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity style={s.sendBtn} onPress={sendMessage}>
              <ArrowRight color={INK} size={20} strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : null}

      {tab === 'tricks' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
          <View style={s.modeIntro}>
            <BookOpen color={INK} size={20} strokeWidth={2.8} />
            <View style={s.modeIntroCopy}>
              <Text style={s.modeIntroTitle}>OFFLINE TRICK LIBRARY</Text>
              <Text style={s.modeIntroText}>Browse the built-in database and tap any trick to open the coaching file.</Text>
            </View>
          </View>

          {trickGroups.map((group, groupIndex) => (
            <View key={group.category} style={s.categorySection}>
              <View style={s.categoryHeader}>
                <View style={[s.categoryNumber, { backgroundColor: groupIndex % 2 ? BLUE : ORANGE }]}>
                  <Text style={s.categoryNumberText}>{String(groupIndex + 1).padStart(2, '0')}</Text>
                </View>
                <Text style={s.catTitle}>{group.category.toUpperCase()}</Text>
                <Text style={s.catCount}>{group.tricks.length} TRICKS</Text>
              </View>

              {group.tricks.map(trick => (
                <TouchableOpacity key={trick.name} style={s.trickRow} onPress={() => lookupTrick(trick.name)}>
                  <View style={s.trickRowCopy}>
                    <Text style={s.trickRowName}>{trick.name}</Text>
                    <Text style={s.trickRowDiff}>{getDifficulty(trick.difficulty)}</Text>
                  </View>
                  <View style={s.diffDots}>
                    {[1, 2, 3, 4, 5].map(level => (
                      <View key={level} style={[s.dot, level <= trick.difficulty && s.dotOn]} />
                    ))}
                  </View>
                  <ArrowRight color={INK} size={16} strokeWidth={2.8} />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      ) : null}

      {tab === 'analyze' ? (
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scrollContent}
          >
            <View style={s.analyzeHero}>
              <View style={s.analyzeStamp}><Sparkles color={INK} size={25} strokeWidth={2.8} /></View>
              <Text style={s.analyzeKicker}>SERVER FIRST • OFFLINE FALLBACK</Text>
              <Text style={s.analyzeTitle}>ANALYSIS LAB</Text>
              <Text style={s.analyzeSub}>
                Enter the trick and what is going wrong. SkateQuest tries server-side analysis, then falls back locally if it cannot connect.
              </Text>

              <Text style={s.fieldLabel}>TRICK</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="Kickflip, 360 Flip, Crooked Grind..."
                placeholderTextColor="#777D87"
                value={analyzeInput}
                onChangeText={setAnalyzeInput}
              />

              <Text style={s.fieldLabel}>WHAT ARE YOU FIGHTING?</Text>
              <TextInput
                style={[s.fieldInput, s.fieldTextarea]}
                placeholder="Example: my back foot keeps slipping off"
                placeholderTextColor="#777D87"
                value={analyzeDescription}
                onChangeText={setAnalyzeDescription}
                multiline
              />

              <TouchableOpacity
                style={[s.analyzeBtn, (!analyzeInput.trim() || analyzing) && s.disabled]}
                onPress={() => void handleAnalyze()}
                disabled={!analyzeInput.trim() || analyzing}
              >
                {analyzing ? (
                  <ActivityIndicator color={INK} />
                ) : (
                  <>
                    <Zap color={INK} size={18} strokeWidth={3} />
                    <Text style={s.analyzeBtnTxt}>RUN ANALYSIS</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {analyzeError ? (
              <View style={s.offlineNotice}>
                <TriangleAlert color={INK} size={17} strokeWidth={2.8} />
                <Text style={s.offlineNoticeText}>{analyzeError}</Text>
              </View>
            ) : null}

            {analyzeResult ? (
              <>
                <View style={s.resultCard}>
                  <View style={s.resultTop}>
                    <View>
                      <Text style={s.cardKicker}>ANALYSIS RESULT</Text>
                      <Text style={s.resultTitle}>{analyzeResult.trickName ?? analyzeInput}</Text>
                    </View>
                    <View style={s.resultXp}>
                      <Text style={s.resultXpValue}>+{analyzeResult.xp_value}</Text>
                      <Text style={s.resultXpLabel}>XP</Text>
                    </View>
                  </View>
                  <View style={s.resultMeta}>
                    <Text style={s.resultMetaText}>{analyzeResult.difficulty}</Text>
                    {analyzeResult.score != null && analyzeResult.score > 0 ? (
                      <Text style={s.resultMetaText}>SCORE {analyzeResult.score}/100</Text>
                    ) : null}
                  </View>
                </View>

                {analyzeResult.tips?.length > 0 ? (
                  <ResultSection title="WHAT TO TRY" icon={Lightbulb} accent={ACID}>
                    {analyzeResult.tips.map((tip, i) => (
                      <ResultRow key={`${tip}-${i}`} text={tip} />
                    ))}
                  </ResultSection>
                ) : null}

                {analyzeResult.common_mistakes?.length > 0 ? (
                  <ResultSection title="COMMON MISTAKES" icon={TriangleAlert} accent={ORANGE} dark>
                    {analyzeResult.common_mistakes.map((mistake, i) => (
                      <ResultRow key={`${mistake}-${i}`} text={mistake} dark />
                    ))}
                  </ResultSection>
                ) : null}

                {analyzeResult.prerequisites?.length > 0 ? (
                  <View style={s.nextSection}>
                    <Text style={s.nextKicker}>PREREQUISITES</Text>
                    <View style={s.progGrid}>
                      {analyzeResult.prerequisites.map(trick => (
                        <TouchableOpacity
                          key={trick}
                          style={s.progChip}
                          onPress={() => lookupTrick(trick)}
                        >
                          <Text style={s.progTxt}>{trick}</Text>
                          <ArrowRight color={INK} size={14} strokeWidth={2.8} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : null}

                {analyzeResult.style_notes ? (
                  <ResultSection title="STYLE NOTES" icon={Sparkles} accent={BLUE}>
                    <ResultRow text={analyzeResult.style_notes} />
                  </ResultSection>
                ) : null}

                {analyzeResult.feedback ? (
                  <ResultSection title="COACH FEEDBACK" icon={Bot} accent={ORANGE}>
                    <ResultRow text={analyzeResult.feedback} />
                  </ResultSection>
                ) : null}
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}
    </SafeAreaView>
  );
}

function ResultSection({
  title,
  icon: Icon,
  accent,
  dark = false,
  children,
}: {
  title: string;
  icon: React.ComponentType<any>;
  accent: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[s.resultSection, dark && s.resultSectionDark]}>
      <View style={s.resultSectionHeader}>
        <View style={[s.resultSectionIcon, { backgroundColor: accent }]}>
          <Icon color={INK} size={18} strokeWidth={2.8} />
        </View>
        <Text style={[s.resultSectionTitle, dark && s.resultSectionTitleDark]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ResultRow({ text, dark = false }: { text: string; dark?: boolean }) {
  return (
    <View style={s.resultRow}>
      <View style={[s.resultDot, dark && s.resultDotDark]} />
      <Text style={[s.resultRowText, dark && s.resultRowTextDark]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: INK },
  hero: { minHeight: 232, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 22, overflow: 'hidden', position: 'relative' },
  orangeSlash: { position: 'absolute', width: 280, height: 82, right: -98, top: 43, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  acidSlash: { position: 'absolute', width: 205, height: 24, left: -68, bottom: 28, backgroundColor: ACID, transform: [{ rotate: '-10deg' }] },
  blueOrb: { position: 'absolute', width: 140, height: 140, borderRadius: 70, right: 9, bottom: -52, backgroundColor: BLUE, opacity: 0.12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStamp: { width: 56, height: 56, borderRadius: 17, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  offlineChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PAPER, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 9, paddingVertical: 6 },
  offlineChipText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.9 },
  eyebrow: { color: ORANGE, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.4, marginTop: 20 },
  title: { color: PAPER, fontSize: 43, lineHeight: 39, fontWeight: '900', letterSpacing: -2.5, marginTop: 3 },
  subtitle: { color: '#A3AAB5', fontSize: 10.5, lineHeight: 16, fontWeight: '700', maxWidth: 305, marginTop: 7 },

  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#101319', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#242932' },
  tab: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#2D333D', alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabOn: { backgroundColor: ACID, borderColor: INK, borderWidth: 2 },
  tabTxt: { color: '#7D8591', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 },
  tabTxtOn: { color: INK },
  scrollContent: { padding: 14, paddingBottom: 118, gap: 12 },

  searchWrap: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PAPER, borderRadius: 16, borderWidth: 2, borderColor: INK, paddingHorizontal: 13 },
  searchInput: { flex: 1, color: INK, fontSize: 14, fontWeight: '700', paddingVertical: 13 },
  searchResults: { backgroundColor: PAPER, borderRadius: 17, borderWidth: 2, borderColor: INK, overflow: 'hidden' },
  searchResult: { minHeight: 57, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#D6D0C5' },
  searchResultTxt: { color: INK, fontSize: 13, fontWeight: '900' },
  searchResultDiff: { color: '#757A75', fontSize: 8, fontWeight: '800', marginTop: 2 },

  trickHeroCard: { backgroundColor: ORANGE, borderRadius: 22, borderWidth: 2, borderColor: INK, padding: 16, transform: [{ rotate: '-0.4deg' }] },
  trickHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 9 },
  trickTitleWrap: { flex: 1 },
  cardKicker: { color: '#7A3822', fontSize: 7, fontWeight: '900', letterSpacing: 1.1 },
  trickName: { color: INK, fontSize: 28, fontWeight: '900', letterSpacing: -1.2, marginTop: 2 },
  diffBadge: { backgroundColor: PAPER, borderRadius: 999, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 9, paddingVertical: 6 },
  diffTxt: { color: INK, fontSize: 8, fontWeight: '900' },
  trickDesc: { color: '#45291F', fontSize: 11, lineHeight: 17, fontWeight: '700', marginTop: 10 },

  paperSection: { backgroundColor: PAPER, borderRadius: 20, borderWidth: 2, borderColor: INK, padding: 14 },
  acidSection: { backgroundColor: ACID, borderRadius: 20, borderWidth: 2, borderColor: INK, padding: 14 },
  darkSection: { backgroundColor: '#15181E', borderRadius: 20, borderWidth: 1.5, borderColor: '#30343D', padding: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 11 },
  sectionKicker: { color: ORANGE, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.9 },
  sectionTitle: { color: INK, fontSize: 16, fontWeight: '900', marginTop: 1 },
  darkSectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 11 },
  darkKicker: { color: ORANGE, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.9 },
  darkTitle: { color: PAPER, fontSize: 16, fontWeight: '900', marginTop: 1 },
  footGrid: { gap: 8 },
  footBox: { backgroundColor: '#E8E2D8', borderRadius: 13, borderWidth: 1, borderColor: '#D0C8BC', padding: 11 },
  footLabel: { color: ORANGE, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.9 },
  footText: { color: INK, fontSize: 10.5, lineHeight: 16, fontWeight: '700', marginTop: 3 },
  stepList: { gap: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  stepNum: { width: 28, height: 28, borderRadius: 9, backgroundColor: ORANGE, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  stepNumTxt: { color: INK, fontSize: 9, fontWeight: '900' },
  stepTxt: { flex: 1, color: INK, fontSize: 10.5, lineHeight: 16, fontWeight: '600' },
  mistakeCard: { borderTopWidth: 1, borderTopColor: '#303640', paddingVertical: 9, gap: 6 },
  mistakeLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  fixLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  mistakeText: { flex: 1, color: '#D7DBE1', fontSize: 10.5, lineHeight: 16, fontWeight: '700' },
  fixText: { flex: 1, color: '#AFCF79', fontSize: 10.5, lineHeight: 16, fontWeight: '700' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 7 },
  tipDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: INK, marginTop: 5 },
  tipText: { flex: 1, color: INK, fontSize: 10.5, lineHeight: 16, fontWeight: '700' },
  nextSection: { backgroundColor: PAPER, borderRadius: 20, borderWidth: 2, borderColor: INK, padding: 14 },
  nextKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginBottom: 9 },
  progGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  progChip: { minHeight: 37, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 10, backgroundColor: ACID },
  progTxt: { color: INK, fontSize: 8, fontWeight: '900' },

  emptyCoach: { minHeight: 265, backgroundColor: '#13161C', borderRadius: 22, borderWidth: 1.5, borderColor: '#30343D', alignItems: 'center', justifyContent: 'center', padding: 22 },
  emptyStamp: { width: 60, height: 60, borderRadius: 18, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  emptyKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 13 },
  emptyTitle: { color: PAPER, fontSize: 16, fontWeight: '900', letterSpacing: 0.4, marginTop: 3 },
  emptyText: { color: '#7F8793', fontSize: 10.5, marginTop: 4 },
  quickPicks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 14 },
  quickPick: { borderRadius: 999, borderWidth: 1.5, borderColor: '#39404A', paddingHorizontal: 10, paddingVertical: 7 },
  quickPickTxt: { color: '#C6CCD4', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.55 },

  modeIntro: { margin: 12, marginBottom: 0, minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: ACID, borderRadius: 16, borderWidth: 2, borderColor: INK, padding: 11 },
  modeIntroCopy: { flex: 1 },
  modeIntroTitle: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  modeIntroText: { color: '#5C6322', fontSize: 8.5, lineHeight: 13, fontWeight: '700', marginTop: 2 },
  chatList: { padding: 12, paddingBottom: 20, gap: 9 },
  bubble: { maxWidth: '88%', borderRadius: 17, padding: 12, borderWidth: 1.5 },
  botBubble: { alignSelf: 'flex-start', backgroundColor: PAPER, borderColor: INK },
  userBubble: { alignSelf: 'flex-end', backgroundColor: ORANGE, borderColor: INK },
  bubbleRole: { color: '#747871', fontSize: 6, fontWeight: '900', letterSpacing: 0.8, marginBottom: 3 },
  bubbleTxt: { color: INK, fontSize: 10.5, lineHeight: 16, fontWeight: '600' },
  userTxt: { color: INK },
  inputRow: { flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: '#282D35', backgroundColor: '#101319' },
  chatInput: { flex: 1, minHeight: 48, maxHeight: 100, backgroundColor: PAPER, borderRadius: 14, borderWidth: 1.5, borderColor: INK, color: INK, paddingHorizontal: 12, paddingVertical: 11, fontSize: 12, fontWeight: '700' },
  sendBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: ACID, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },

  categorySection: { backgroundColor: PAPER, borderRadius: 20, borderWidth: 2, borderColor: INK, overflow: 'hidden' },
  categoryHeader: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, borderBottomWidth: 1.5, borderBottomColor: INK },
  categoryNumber: { width: 37, height: 37, borderRadius: 11, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  categoryNumberText: { color: INK, fontSize: 9, fontWeight: '900' },
  catTitle: { flex: 1, color: INK, fontSize: 13, fontWeight: '900', letterSpacing: 0.7 },
  catCount: { color: '#7D817A', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 },
  trickRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#D8D1C6' },
  trickRowCopy: { flex: 1 },
  trickRowName: { color: INK, fontSize: 12, fontWeight: '900' },
  trickRowDiff: { color: '#7D817A', fontSize: 7.5, fontWeight: '700', marginTop: 2 },
  diffDots: { flexDirection: 'row', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C8C3B9' },
  dotOn: { backgroundColor: ORANGE },

  analyzeHero: { backgroundColor: PAPER, borderRadius: 22, borderWidth: 2, borderColor: INK, padding: 15 },
  analyzeStamp: { width: 52, height: 52, borderRadius: 15, backgroundColor: ORANGE, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  analyzeKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 12 },
  analyzeTitle: { color: INK, fontSize: 25, fontWeight: '900', letterSpacing: -0.9, marginTop: 2 },
  analyzeSub: { color: '#646963', fontSize: 10, lineHeight: 15, fontWeight: '600', marginTop: 5, marginBottom: 13 },
  fieldLabel: { color: INK, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.9, marginBottom: 5, marginTop: 7 },
  fieldInput: { minHeight: 49, backgroundColor: '#E9E4DA', borderRadius: 13, borderWidth: 1.5, borderColor: '#CCC4B8', color: INK, paddingHorizontal: 12, paddingVertical: 11, fontSize: 12, fontWeight: '700' },
  fieldTextarea: { minHeight: 82, textAlignVertical: 'top' },
  analyzeBtn: { minHeight: 50, marginTop: 13, backgroundColor: ACID, borderRadius: 14, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  analyzeBtnTxt: { color: INK, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.75 },
  disabled: { opacity: 0.45 },
  offlineNotice: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ACID, borderRadius: 14, borderWidth: 1.5, borderColor: INK, padding: 10 },
  offlineNoticeText: { flex: 1, color: INK, fontSize: 9, lineHeight: 14, fontWeight: '800' },
  resultCard: { backgroundColor: ORANGE, borderRadius: 20, borderWidth: 2, borderColor: INK, padding: 14, transform: [{ rotate: '-0.35deg' }] },
  resultTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  resultTitle: { color: INK, fontSize: 23, fontWeight: '900', letterSpacing: -0.7, marginTop: 2 },
  resultXp: { width: 58, height: 58, borderRadius: 16, backgroundColor: ACID, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '5deg' }] },
  resultXpValue: { color: INK, fontSize: 15, fontWeight: '900' },
  resultXpLabel: { color: INK, fontSize: 6.5, fontWeight: '900' },
  resultMeta: { flexDirection: 'row', gap: 7, marginTop: 10 },
  resultMetaText: { color: '#512F22', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.65 },
  resultSection: { backgroundColor: PAPER, borderRadius: 19, borderWidth: 2, borderColor: INK, padding: 13 },
  resultSectionDark: { backgroundColor: '#15181E', borderColor: '#30343D', borderWidth: 1.5 },
  resultSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  resultSectionIcon: { width: 39, height: 39, borderRadius: 12, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  resultSectionTitle: { color: INK, fontSize: 12, fontWeight: '900', letterSpacing: 0.55 },
  resultSectionTitleDark: { color: PAPER },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 5 },
  resultDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE, marginTop: 5 },
  resultDotDark: { backgroundColor: ACID },
  resultRowText: { flex: 1, color: '#5F645F', fontSize: 10, lineHeight: 15, fontWeight: '600' },
  resultRowTextDark: { color: '#C5CBD3' },
});
