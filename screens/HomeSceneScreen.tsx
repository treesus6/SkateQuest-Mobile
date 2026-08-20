import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowUpRight,
  Bot,
  Camera,
  ChevronRight,
  Compass,
  Crosshair,
  Flame,
  Heart,
  MapPin,
  MapPinned,
  Play,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Users,
  Video,
  Zap,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';
const MUTED = '#979EAA';
const PANEL = '#12151B';

type HomeProfile = {
  username?: string | null;
  avatar_url?: string | null;
  xp?: number | null;
  level?: number | null;
  tricks_landed?: number | null;
  total_sessions?: number | null;
  current_streak?: number | null;
  streak_days?: number | null;
};

type SceneMedia = {
  id: string;
  url?: string | null;
  thumbnail_url?: string | null;
  type?: string | null;
  caption?: string | null;
};

export default function HomeSceneScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<HomeProfile | null>(null);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [quests, setQuests] = useState<any[]>([]);
  const [clips, setClips] = useState<any[]>([]);
  const [bounties, setBounties] = useState<any[]>([]);
  const [sceneMedia, setSceneMedia] = useState<SceneMedia[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const intro = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    const [profileRes, liveRes, questRes, clipRes, bountyRes, mediaRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('live_checkins')
        .select('*,profiles(username,avatar_url)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('daily_quests')
        .select('id,title,description,xp_reward,quest_type')
        .eq('active', true)
        .eq('frozen', false)
        .order('xp_reward', { ascending: false })
        .limit(4),
      supabase
        .from('skatetv_clips')
        .select('id,title,thumbnail_url,likes,views,trick_name,park_name,created_at,profiles(username)')
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('bounties')
        .select('id,trick_name,park_name,xp_reward,status')
        .eq('status', 'open')
        .order('xp_reward', { ascending: false })
        .limit(4),
      supabase
        .from('media')
        .select('id,url,thumbnail_url,type,caption,created_at')
        .order('created_at', { ascending: false })
        .limit(12),
    ]);

    if (profileRes.data) setProfile(profileRes.data as HomeProfile);
    setCheckins(liveRes.data ?? []);
    setQuests(questRes.data ?? []);
    setClips(clipRes.data ?? []);
    setBounties(bountyRes.data ?? []);
    setSceneMedia((mediaRes.data ?? []) as SceneMedia[]);
  }, [user?.id]);

  useEffect(() => {
    void loadData().finally(() => setLoading(false));

    Animated.timing(intro, {
      toValue: 1,
      duration: 430,
      useNativeDriver: true,
    }).start();

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.45, duration: 760, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 760, useNativeDriver: true }),
      ])
    );

    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -6, duration: 1500, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );

    pulseAnimation.start();
    floatAnimation.start();

    const timer = setInterval(() => void loadData(), 30000);
    return () => {
      clearInterval(timer);
      pulseAnimation.stop();
      floatAnimation.stop();
    };
  }, [floatY, intro, loadData, pulse]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const level = Math.max(1, Number(profile?.level ?? 1));
  const xp = Math.max(0, Number(profile?.xp ?? 0));
  const currentFloor = ((level - 1) * (level - 1)) * 100;
  const nextFloor = (level * level) * 100;
  const progress = Math.max(0, Math.min(1, (xp - currentFloor) / Math.max(1, nextFloor - currentFloor)));
  const streak = Number(profile?.current_streak ?? profile?.streak_days ?? 0);

  const heroClip = clips.find(clip => clip.thumbnail_url) ?? clips[0];
  const fallbackMedia = sceneMedia.find(item => item.thumbnail_url || (item.type === 'photo' && item.url));
  const heroImage = heroClip?.thumbnail_url || fallbackMedia?.thumbnail_url || (fallbackMedia?.type === 'photo' ? fallbackMedia?.url : null);
  const firstQuest = quests[0];

  const sceneLine = useMemo(() => {
    if (checkins.length > 0) return `${checkins.length} skater${checkins.length === 1 ? '' : 's'} out right now`;
    if (bounties.length > 0) return `${bounties.length} open bounties waiting`;
    return 'The map is waiting for the next session';
  }, [bounties.length, checkins.length]);

  const go = (screen: string) => navigation.navigate(screen);

  if (loading) {
    return (
      <View style={s.loading}>
        <View style={s.loadingStamp}><Text style={s.loadingStampText}>SQ</Text></View>
        <ActivityIndicator color={ORANGE} style={s.loadingSpinner} />
        <Text style={s.loadingText}>Loading the scene…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View pointerEvents="none" style={s.backgroundTexture}>
        <View style={s.textureLineA} />
        <View style={s.textureLineB} />
        <View style={s.textureDotA} />
        <View style={s.textureDotB} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE} />}
      >
        <Animated.View
          style={{
            opacity: intro,
            transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          }}
        >
          <View style={s.topbar}>
            <View>
              <Text style={s.kicker}>SKATEQUEST // LIVE SCENE</Text>
              <Text style={s.hello}>Yo, @{profile?.username || 'skater'}</Text>
            </View>
            <Pressable style={s.avatar} onPress={() => go('Profile')}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={s.fill} contentFit="cover" />
              ) : (
                <Text style={s.avatarText}>{(profile?.username || 'SQ').slice(0, 2).toUpperCase()}</Text>
              )}
            </Pressable>
          </View>

          <View style={s.heroWrap}>
            <View style={s.hero}>
              {heroImage ? <Image source={{ uri: heroImage }} style={s.fill} contentFit="cover" transition={180} /> : null}
              <View style={[s.heroShade, !heroImage && s.heroShadeFallback]} />
              <View style={s.heroOrangeSlash} />
              <View style={s.heroAcidSlash} />
              <View style={s.heroContent}>
                <View style={s.liveChip}>
                  <Animated.View style={[s.liveDot, { transform: [{ scale: pulse }] }]} />
                  <Text style={s.liveChipText}>SCENE LIVE</Text>
                </View>
                <Text style={s.heroTitle}>GO FIND{`\n`}SOMETHING{`\n`}TO SKATE.</Text>
                <Text style={s.heroSub}>{sceneLine}</Text>
                <View style={s.heroActions}>
                  <Pressable style={s.heroPrimary} onPress={() => go('Map')}>
                    <Crosshair color={INK} size={18} strokeWidth={2.8} />
                    <Text style={s.heroPrimaryText}>OPEN MAP</Text>
                  </Pressable>
                  <Pressable style={s.heroGhost} onPress={() => go('ActiveSession')}>
                    <Timer color="#fff" size={17} />
                    <Text style={s.heroGhostText}>START SESSION</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <Animated.View style={[s.heroSticker, { transform: [{ translateY: floatY }, { rotate: '5deg' }] }]}>
              <Text style={s.heroStickerBig}>{clips.length}</Text>
              <Text style={s.heroStickerSmall}>FRESH{`\n`}CLIPS</Text>
            </Animated.View>
          </View>

          <View style={s.sceneTicker}>
            <View style={s.tickerDot} />
            <Text style={s.tickerText}>SCENE PULSE</Text>
            <Text style={s.tickerSlash}>/</Text>
            <Text style={s.tickerMetric}>{checkins.length} OUT</Text>
            <Text style={s.tickerSlash}>/</Text>
            <Text style={s.tickerMetric}>{bounties.length} BOUNTIES</Text>
            <Text style={s.tickerSlash}>/</Text>
            <Text style={s.tickerMetric}>{clips.length} CLIPS</Text>
          </View>

          <View style={s.scoreFloat}>
            <View style={s.levelStamp}>
              <Text style={s.levelSmall}>LEVEL</Text>
              <Text style={s.levelBig}>{level}</Text>
            </View>
            <View style={s.scoreMain}>
              <View style={s.scoreTop}>
                <Text style={s.scoreXp}>{xp.toLocaleString()} XP</Text>
                <Text style={s.scoreNext}>{Math.max(0, nextFloor - xp).toLocaleString()} TO NEXT</Text>
              </View>
              <View style={s.progressTrack}><View style={[s.progressFill, { width: `${progress * 100}%` }]} /></View>
              <View style={s.miniStats}>
                <Text style={s.miniStat}><Text style={s.miniValue}>{streak}</Text> DAY STREAK</Text>
                <Text style={s.miniStat}><Text style={s.miniValue}>{profile?.tricks_landed ?? 0}</Text> TRICKS</Text>
                <Text style={s.miniStat}><Text style={s.miniValue}>{profile?.total_sessions ?? 0}</Text> SESSIONS</Text>
              </View>
            </View>
          </View>

          <View style={s.paperBoard}>
            <SectionHeader dark eyebrow="TODAY" title="Your next move" action="ALL QUESTS" onPress={() => go('DailyQuests')} />

            {firstQuest ? (
              <Pressable style={s.questHero} onPress={() => go('DailyQuests')}>
                <View style={s.questNumber}><Text style={s.questNumberText}>01</Text></View>
                <View style={s.questMain}>
                  <View style={s.questMeta}>
                    <Target color={INK} size={15} />
                    <Text style={s.questMetaText}>{String(firstQuest.quest_type || 'MISSION').toUpperCase()}</Text>
                  </View>
                  <Text style={s.questHeroTitle}>{firstQuest.title}</Text>
                  <Text style={s.questHeroDesc} numberOfLines={2}>
                    {firstQuest.description || 'Complete the real-world action and verify it for XP.'}
                  </Text>
                </View>
                <View style={s.questXpBlock}>
                  <Text style={s.questXpPlus}>+{firstQuest.xp_reward}</Text>
                  <Text style={s.questXpLabel}>XP</Text>
                  <ArrowUpRight color={INK} size={19} style={s.questArrow} />
                </View>
              </Pressable>
            ) : (
              <Pressable style={s.emptyMissionLight} onPress={() => go('DailyQuests')}>
                <Sparkles color={INK} size={20} />
                <Text style={s.emptyMissionLightText}>No mission loaded — tap to refresh quests.</Text>
                <ChevronRight color={INK} size={18} />
              </Pressable>
            )}

            {quests.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.questRail}>
                {quests.slice(1).map((quest, index) => (
                  <Pressable key={quest.id} style={[s.miniQuest, index % 2 === 0 ? s.miniQuestOrange : s.miniQuestBlue]} onPress={() => go('DailyQuests')}>
                    <Text style={s.miniQuestIndex}>{String(index + 2).padStart(2, '0')}</Text>
                    <Text style={s.miniQuestTitle} numberOfLines={2}>{quest.title}</Text>
                    <Text style={s.miniQuestXp}>+{quest.xp_reward} XP</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <View style={s.actionRail}>
            <ActionTile accent={ORANGE} icon={<MapPinned color={INK} size={23} />} label="SPOTS" sub="Find something new" tilt="-2deg" onPress={() => go('Map')} />
            <ActionTile accent={ACID} icon={<Camera color={INK} size={23} />} label="POST" sub="Drop a real clip" tilt="2deg" onPress={() => go('SkateTV')} />
            <ActionTile accent={BLUE} icon={<Users color={INK} size={23} />} label="CREW" sub="Link with homies" tilt="-1deg" onPress={() => go('Crews')} />
          </View>

          <SectionHeader eyebrow="SKATETV" title="Fresh from the scene" action="WATCH ALL" onPress={() => go('SkateTV')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
            {clips.length > 0 ? clips.map((clip, index) => (
              <Pressable key={clip.id} style={[s.clipCard, index === 0 && s.clipCardLead]} onPress={() => go('SkateTV')}>
                <View style={s.clipMedia}>
                  {clip.thumbnail_url ? (
                    <Image source={{ uri: clip.thumbnail_url }} style={s.fill} contentFit="cover" transition={160} />
                  ) : (
                    <View style={s.clipFallback}><Video color={ORANGE} size={34} /></View>
                  )}
                  <View style={s.clipShade} />
                  <View style={s.playButton}><Play color="#fff" fill="#fff" size={14} /></View>
                  <View style={s.clipIndex}><Text style={s.clipIndexText}>{String(index + 1).padStart(2, '0')}</Text></View>
                </View>
                <Text style={s.clipTitle} numberOfLines={1}>{clip.title || clip.trick_name || 'Fresh skate clip'}</Text>
                <Text style={s.clipByline} numberOfLines={1}>@{clip.profiles?.username || 'skater'}{clip.park_name ? ` • ${clip.park_name}` : ''}</Text>
                <View style={s.clipCounts}>
                  <Heart color={ORANGE} size={13} />
                  <Text style={s.clipCountText}>{clip.likes ?? 0}</Text>
                  <Play color={MUTED} size={12} />
                  <Text style={s.clipCountText}>{clip.views ?? 0}</Text>
                </View>
              </Pressable>
            )) : (
              <Pressable style={s.noClips} onPress={() => go('SkateTV')}>
                <Camera color={ORANGE} size={30} />
                <Text style={s.noClipsTitle}>The feed is empty.</Text>
                <Text style={s.noClipsText}>Be the first real clip on the scene.</Text>
              </Pressable>
            )}
          </ScrollView>

          <View style={s.orangeBand}>
            <View style={s.orangeBandTop}>
              <View>
                <Text style={s.orangeEyebrow}>RIGHT NOW</Text>
                <Text style={s.orangeTitle}>Who’s out skating</Text>
              </View>
              <Pressable style={s.orangeButton} onPress={() => go('LiveCheckIn')}>
                <Flame color={INK} size={16} />
                <Text style={s.orangeButtonText}>CHECK IN</Text>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.liveRail}>
              {checkins.length > 0 ? checkins.map((item, index) => (
                <Pressable key={item.id} style={[s.skaterChip, { transform: [{ rotate: `${index % 2 === 0 ? -1.4 : 1.4}deg` }] }]} onPress={() => go('LiveCheckIn')}>
                  <View style={s.skaterAvatar}>
                    {item.profiles?.avatar_url ? (
                      <Image source={{ uri: item.profiles.avatar_url }} style={s.fill} contentFit="cover" />
                    ) : (
                      <Text style={s.skaterAvatarText}>{String(item.profiles?.username || 'S').slice(0, 1).toUpperCase()}</Text>
                    )}
                  </View>
                  <Text style={s.skaterName}>@{item.profiles?.username || 'skater'}</Text>
                  <View style={s.skaterSpotRow}>
                    <MapPin color={ORANGE} size={12} />
                    <Text style={s.skaterSpot} numberOfLines={1}>{item.park_name || 'at a skate spot'}</Text>
                  </View>
                </Pressable>
              )) : (
                <Pressable style={s.emptyLivePaper} onPress={() => go('LiveCheckIn')}>
                  <Flame color={ORANGE} size={22} />
                  <Text style={s.emptyLivePaperTitle}>Nobody checked in yet.</Text>
                  <Text style={s.emptyLivePaperText}>Start the session and put your spot on the live scene.</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>

          {bounties.length > 0 ? (
            <>
              <SectionHeader eyebrow="BOARD BOUNTY" title="Put something down" action="OPEN BOARD" onPress={() => go('BountyBoard')} />
              <View style={s.bountyStack}>
                {bounties.slice(0, 3).map((bounty, index) => (
                  <Pressable key={bounty.id} style={[s.bountyTicket, index === 0 && s.bountyTicketLead]} onPress={() => go('BountyBoard')}>
                    <View style={s.bountyRank}><Text style={s.bountyRankText}>{String(index + 1).padStart(2, '0')}</Text></View>
                    <View style={s.bountyCopy}>
                      <Text style={s.bountyTitle}>{bounty.trick_name || 'Open bounty'}</Text>
                      <Text style={s.bountySub}>{bounty.park_name || 'Any verified spot'}</Text>
                    </View>
                    <View style={s.bountyReward}><Trophy color={INK} size={15} /><Text style={s.bountyXp}>{bounty.xp_reward} XP</Text></View>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <SectionHeader eyebrow="MORE" title="Keep moving" />
          <View style={s.exploreGrid}>
            <ExploreTile icon={<Bot color="#fff" size={21} />} label="AI COACH" sub="Break down your skating" onPress={() => go('AiCoach')} />
            <ExploreTile icon={<Compass color="#fff" size={21} />} label="PASSPORT" sub="Collect real spots" onPress={() => go('SkatePassport')} />
            <ExploreTile icon={<Zap color="#fff" size={21} />} label="BATTLES" sub="Crew vs crew" onPress={() => go('CrewBattles')} />
            <ExploreTile icon={<Camera color="#fff" size={21} />} label="TRICK TRACKER" sub="Build your bag" onPress={() => go('TrickTracker')} />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ eyebrow, title, action, onPress, dark = false }: { eyebrow: string; title: string; action?: string; onPress?: () => void; dark?: boolean }) {
  return (
    <View style={s.sectionHeader}>
      <View>
        <Text style={[s.sectionEyebrow, dark && s.sectionEyebrowDark]}>{eyebrow}</Text>
        <Text style={[s.sectionTitle, dark && s.sectionTitleDark]}>{title}</Text>
      </View>
      {action && onPress ? (
        <Pressable onPress={onPress} style={s.sectionAction}>
          <Text style={[s.sectionActionText, dark && s.sectionActionTextDark]}>{action}</Text>
          <ChevronRight color={dark ? INK : ORANGE} size={15} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ActionTile({ accent, icon, label, sub, tilt, onPress }: { accent: string; icon: React.ReactNode; label: string; sub: string; tilt: string; onPress: () => void }) {
  return (
    <Pressable style={[s.actionTile, { backgroundColor: accent, transform: [{ rotate: tilt }] }]} onPress={onPress}>
      <View style={s.actionTileTop}>{icon}<ArrowUpRight color={INK} size={16} /></View>
      <Text style={s.actionLabel}>{label}</Text>
      <Text style={s.actionSub}>{sub}</Text>
    </Pressable>
  );
}

function ExploreTile({ icon, label, sub, onPress }: { icon: React.ReactNode; label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable style={s.exploreTile} onPress={onPress}>
      <View style={s.exploreIcon}>{icon}</View>
      <Text style={s.exploreLabel}>{label}</Text>
      <Text style={s.exploreSub}>{sub}</Text>
      <ArrowUpRight color={ORANGE} size={16} style={s.exploreArrow} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  container: { flex: 1, backgroundColor: INK },
  content: { paddingBottom: 170 },

  loading: { flex: 1, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  loadingStamp: { width: 68, height: 68, borderRadius: 18, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  loadingStampText: { color: INK, fontSize: 26, fontWeight: '900' },
  loadingSpinner: { marginTop: 16 },
  loadingText: { color: MUTED, marginTop: 10, fontWeight: '700' },

  backgroundTexture: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  textureLineA: { position: 'absolute', width: 260, height: 3, backgroundColor: 'rgba(227,109,63,0.18)', top: 112, right: -86, transform: [{ rotate: '-18deg' }] },
  textureLineB: { position: 'absolute', width: 190, height: 2, backgroundColor: 'rgba(217,243,74,0.13)', top: 250, left: -60, transform: [{ rotate: '23deg' }] },
  textureDotA: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 1, borderColor: 'rgba(255,255,255,0.035)', top: 520, right: -65 },
  textureDotB: { position: 'absolute', width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(227,109,63,0.08)', top: 760, left: -30 },

  topbar: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.9 },
  hello: { color: PAPER, fontSize: 23, fontWeight: '900', letterSpacing: -0.8, marginTop: 3 },
  avatar: { width: 46, height: 46, borderRadius: 14, overflow: 'hidden', backgroundColor: '#171A20', borderWidth: 2, borderColor: PAPER, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '3deg' }] },
  avatarText: { color: PAPER, fontWeight: '900', fontSize: 15 },

  heroWrap: { marginHorizontal: 12, position: 'relative' },
  hero: { height: 380, borderRadius: 31, overflow: 'hidden', backgroundColor: '#15171D', borderWidth: 1, borderColor: '#2A2E36' },
  heroShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(4,5,7,0.48)' },
  heroShadeFallback: { backgroundColor: 'rgba(12,14,18,0.92)' },
  heroOrangeSlash: { position: 'absolute', width: 265, height: 94, backgroundColor: 'rgba(227,109,63,0.94)', right: -92, top: 38, transform: [{ rotate: '34deg' }] },
  heroAcidSlash: { position: 'absolute', width: 190, height: 24, backgroundColor: ACID, left: -62, bottom: 50, transform: [{ rotate: '-11deg' }] },
  heroContent: { flex: 1, padding: 22, justifyContent: 'flex-end' },
  liveChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginBottom: 12 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACID },
  liveChipText: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  heroTitle: { color: '#fff', fontSize: 43, lineHeight: 40, letterSpacing: -2.5, fontWeight: '900', maxWidth: 310 },
  heroSub: { color: '#E0E3E8', fontSize: 13, fontWeight: '800', marginTop: 10 },
  heroActions: { flexDirection: 'row', gap: 9, marginTop: 18 },
  heroPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ACID, paddingHorizontal: 15, minHeight: 47, borderRadius: 14 },
  heroPrimaryText: { color: INK, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  heroGhost: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, minHeight: 47, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroGhostText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  heroSticker: { position: 'absolute', right: -1, top: 16, width: 76, height: 76, borderRadius: 18, backgroundColor: PAPER, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  heroStickerBig: { color: INK, fontSize: 26, lineHeight: 27, fontWeight: '900' },
  heroStickerSmall: { color: INK, fontSize: 8, lineHeight: 9, textAlign: 'center', fontWeight: '900', letterSpacing: 1.1 },

  sceneTicker: { marginTop: 10, minHeight: 39, backgroundColor: ACID, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 7, overflow: 'hidden' },
  tickerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: INK },
  tickerText: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  tickerSlash: { color: 'rgba(7,8,11,0.38)', fontWeight: '900' },
  tickerMetric: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  scoreFloat: { marginHorizontal: 14, marginTop: 13, flexDirection: 'row', borderRadius: 22, overflow: 'hidden', backgroundColor: PANEL, borderWidth: 1, borderColor: '#2D323B' },
  levelStamp: { width: 88, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  levelSmall: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  levelBig: { color: INK, fontSize: 36, lineHeight: 38, fontWeight: '900' },
  scoreMain: { flex: 1, padding: 14 },
  scoreTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  scoreXp: { color: PAPER, fontWeight: '900', fontSize: 18 },
  scoreNext: { color: MUTED, fontWeight: '800', fontSize: 8.5, letterSpacing: 0.3 },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: '#292E38', overflow: 'hidden', marginTop: 10 },
  progressFill: { height: '100%', backgroundColor: ACID, borderRadius: 999 },
  miniStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 7 },
  miniStat: { color: MUTED, fontSize: 8, fontWeight: '800' },
  miniValue: { color: PAPER, fontWeight: '900' },

  paperBoard: { backgroundColor: PAPER, marginTop: 24, paddingTop: 3, paddingBottom: 19, borderTopWidth: 5, borderTopColor: ORANGE, transform: [{ rotate: '-0.25deg' }] },
  sectionHeader: { marginTop: 29, marginBottom: 12, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionEyebrow: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  sectionEyebrowDark: { color: ORANGE },
  sectionTitle: { color: PAPER, fontSize: 24, fontWeight: '900', letterSpacing: -0.9, marginTop: 2 },
  sectionTitleDark: { color: INK },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
  sectionActionText: { color: '#C1C6D0', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  sectionActionTextDark: { color: INK },

  questHero: { marginHorizontal: 14, minHeight: 152, borderRadius: 20, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#171A20', borderWidth: 2, borderColor: INK, transform: [{ rotate: '0.6deg' }] },
  questNumber: { width: 48, backgroundColor: ORANGE, alignItems: 'center', paddingTop: 19 },
  questNumberText: { color: INK, fontSize: 18, fontWeight: '900', transform: [{ rotate: '-90deg' }] },
  questMain: { flex: 1, paddingVertical: 17, paddingHorizontal: 15 },
  questMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: ACID, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  questMetaText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  questHeroTitle: { color: PAPER, fontSize: 21, fontWeight: '900', letterSpacing: -0.5, marginTop: 9 },
  questHeroDesc: { color: '#B2B8C2', fontSize: 11.5, lineHeight: 16, marginTop: 5 },
  questXpBlock: { width: 82, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center' },
  questXpPlus: { color: INK, fontSize: 22, fontWeight: '900' },
  questXpLabel: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  questArrow: { marginTop: 12 },
  emptyMissionLight: { marginHorizontal: 14, minHeight: 90, borderRadius: 18, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ACID, borderWidth: 2, borderColor: INK },
  emptyMissionLightText: { flex: 1, color: INK, fontSize: 13, fontWeight: '900' },
  questRail: { paddingHorizontal: 14, paddingTop: 16, gap: 10 },
  miniQuest: { width: 154, minHeight: 110, borderRadius: 17, borderWidth: 2, borderColor: INK, padding: 13, justifyContent: 'space-between' },
  miniQuestOrange: { backgroundColor: ORANGE },
  miniQuestBlue: { backgroundColor: BLUE },
  miniQuestIndex: { color: INK, fontSize: 11, fontWeight: '900', opacity: 0.62 },
  miniQuestTitle: { color: INK, fontSize: 15, lineHeight: 17, fontWeight: '900', letterSpacing: -0.3 },
  miniQuestXp: { color: INK, fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },

  actionRail: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginTop: 23 },
  actionTile: { flex: 1, minHeight: 132, borderRadius: 20, padding: 13, justifyContent: 'flex-end', borderWidth: 2, borderColor: INK },
  actionTileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'auto' },
  actionLabel: { color: INK, fontSize: 16, fontWeight: '900' },
  actionSub: { color: 'rgba(7,8,11,0.68)', fontSize: 8.5, fontWeight: '800', marginTop: 2 },

  rail: { paddingHorizontal: 14, gap: 12 },
  clipCard: { width: 226, backgroundColor: '#11151B', borderRadius: 22, paddingBottom: 13, overflow: 'hidden', borderWidth: 1, borderColor: '#2A3039' },
  clipCardLead: { width: 285 },
  clipMedia: { height: 178, backgroundColor: '#1A1E25', overflow: 'hidden' },
  clipFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171A20' },
  clipShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.12)' },
  playButton: { position: 'absolute', left: 12, bottom: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  clipIndex: { position: 'absolute', top: 10, right: 10, minWidth: 34, height: 26, paddingHorizontal: 8, borderRadius: 8, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  clipIndexText: { color: INK, fontWeight: '900', fontSize: 10 },
  clipTitle: { color: PAPER, fontSize: 15, fontWeight: '900', paddingHorizontal: 13, marginTop: 11 },
  clipByline: { color: MUTED, fontSize: 10, fontWeight: '700', paddingHorizontal: 13, marginTop: 3 },
  clipCounts: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, marginTop: 9 },
  clipCountText: { color: '#A9B0BC', fontSize: 10, fontWeight: '800', marginRight: 7 },
  noClips: { width: 288, minHeight: 182, borderRadius: 21, padding: 20, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#282D36', justifyContent: 'center' },
  noClipsTitle: { color: PAPER, fontSize: 19, fontWeight: '900', marginTop: 10 },
  noClipsText: { color: MUTED, fontSize: 12, marginTop: 4 },

  orangeBand: { marginTop: 30, backgroundColor: ORANGE, paddingTop: 21, paddingBottom: 23, transform: [{ rotate: '0.25deg' }] },
  orangeBandTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 18, marginBottom: 16 },
  orangeEyebrow: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  orangeTitle: { color: INK, fontSize: 25, fontWeight: '900', letterSpacing: -1, marginTop: 2 },
  orangeButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ACID, borderWidth: 2, borderColor: INK, paddingHorizontal: 10, minHeight: 38, borderRadius: 12 },
  orangeButtonText: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  liveRail: { paddingHorizontal: 14, gap: 12 },
  skaterChip: { width: 176, minHeight: 120, padding: 13, borderRadius: 18, backgroundColor: PAPER, borderWidth: 2, borderColor: INK },
  skaterAvatar: { width: 39, height: 39, borderRadius: 13, overflow: 'hidden', backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  skaterAvatarText: { color: PAPER, fontWeight: '900' },
  skaterName: { color: INK, fontSize: 14, fontWeight: '900', marginTop: 9 },
  skaterSpotRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  skaterSpot: { flex: 1, color: '#555B66', fontSize: 10, fontWeight: '700' },
  emptyLivePaper: { width: 290, minHeight: 126, borderRadius: 18, padding: 17, backgroundColor: PAPER, borderWidth: 2, borderColor: INK },
  emptyLivePaperTitle: { color: INK, fontSize: 17, fontWeight: '900', marginTop: 8 },
  emptyLivePaperText: { color: '#535964', fontSize: 11, lineHeight: 16, marginTop: 3 },

  bountyStack: { paddingHorizontal: 14, gap: 9 },
  bountyTicket: { minHeight: 78, borderRadius: 18, overflow: 'hidden', flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#151921', borderWidth: 1, borderColor: '#2E3440' },
  bountyTicketLead: { borderColor: ORANGE, borderWidth: 2 },
  bountyRank: { width: 47, backgroundColor: '#202631', alignItems: 'center', justifyContent: 'center' },
  bountyRankText: { color: '#7D8592', fontSize: 16, fontWeight: '900' },
  bountyCopy: { flex: 1, paddingHorizontal: 13, justifyContent: 'center' },
  bountyTitle: { color: PAPER, fontSize: 15, fontWeight: '900' },
  bountySub: { color: MUTED, fontSize: 10, marginTop: 3 },
  bountyReward: { minWidth: 82, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', gap: 3 },
  bountyXp: { color: INK, fontSize: 10, fontWeight: '900' },

  exploreGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 10 },
  exploreTile: { width: '48%', minHeight: 126, backgroundColor: '#12161D', borderRadius: 20, borderWidth: 1, borderColor: '#2A3039', padding: 14, position: 'relative' },
  exploreIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#20252E', alignItems: 'center', justifyContent: 'center' },
  exploreLabel: { color: PAPER, fontSize: 14, fontWeight: '900', marginTop: 13 },
  exploreSub: { color: MUTED, fontSize: 9.5, lineHeight: 13, marginTop: 2, paddingRight: 18 },
  exploreArrow: { position: 'absolute', right: 12, top: 14 },
});
