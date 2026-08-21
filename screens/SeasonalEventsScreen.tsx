import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CalendarDays, Flame, Gift, ShieldCheck, Sparkles, Zap } from 'lucide-react-native';
import { seasonalEventsService } from '../lib/seasonalEventsService';
import { useAuthStore } from '../stores/useAuthStore';
import { useSeasonalEventStore } from '../stores/useSeasonalEventStore';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

function dateLabel(value: string | null) {
  if (!value) return 'DATE TBD';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SeasonalEventsScreen() {
  const user = useAuthStore(state => state.user);
  const { activeEvent, allEvents, claims, loading, error, initialize, refresh } = useSeasonalEventStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    return initialize(user.id);
  }, [initialize, user?.id]);

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await refresh(user.id);
    setRefreshing(false);
  }, [refresh, user?.id]);

  const currentDay = activeEvent ? seasonalEventsService.getCurrentDay(activeEvent) : 0;
  const totalDays = activeEvent ? seasonalEventsService.getTotalDays(activeEvent) : 0;
  const daysRemaining = activeEvent ? seasonalEventsService.getDaysRemaining(activeEvent) : 0;
  const todayXp = activeEvent ? seasonalEventsService.getExpectedXp(activeEvent, currentDay) : 0;
  const claimedToday = claims.some(claim => claim.claim_date === new Date().toISOString().slice(0, 10));
  const archived = useMemo(() => allEvents.filter(event => event.id !== activeEvent?.id), [activeEvent?.id, allEvents]);

  if (loading && allEvents.length === 0) {
    return (
      <SafeAreaView style={s.loading}>
        <View style={s.loadingStamp}><Flame color={INK} size={30} strokeWidth={2.8} /></View>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={s.loadingText}>CHECKING LIVE SEASONS</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ORANGE} />}
        contentContainerStyle={s.content}
      >
        <View style={s.hero}>
          <View style={s.orangeSlash} />
          <View style={s.acidSlash} />
          <View style={s.blueOrb} />
          <View style={s.heroTop}>
            <View style={s.heroStamp}><Flame color={INK} size={29} strokeWidth={2.8} /></View>
            <View style={s.realChip}><ShieldCheck color={INK} size={12} strokeWidth={3} /><Text style={s.realChipText}>LIVE DATA ONLY</Text></View>
          </View>
          <Text style={s.eyebrow}>LIMITED-TIME SKATEQUEST EVENTS</Text>
          <Text style={s.title}>SEASONAL{`\n`}EVENTS.</Text>
          <Text style={s.subtitle}>Real event windows and real server-issued reward claims. No made-up tiers, challenges, or filler seasons.</Text>
        </View>

        <View style={s.statsTicket}>
          <View style={s.stat}><CalendarDays color={INK} size={18} strokeWidth={2.8} /><Text style={s.statValue}>{allEvents.length}</Text><Text style={s.statLabel}>EVENTS</Text></View>
          <View style={s.divider} />
          <View style={s.stat}><Gift color={INK} size={18} strokeWidth={2.8} /><Text style={s.statValue}>{claims.length}</Text><Text style={s.statLabel}>CLAIMS</Text></View>
          <View style={s.divider} />
          <View style={s.stat}><Flame color={INK} size={18} strokeWidth={2.8} /><Text style={s.statValue}>{daysRemaining}</Text><Text style={s.statLabel}>DAYS LEFT</Text></View>
        </View>

        {error ? <View style={s.errorCard}><Text style={s.errorTitle}>SEASON FEED ISSUE</Text><Text style={s.errorText}>{error}</Text></View> : null}

        {activeEvent ? (
          <>
            <View style={s.sectionHeader}><View><Text style={s.sectionKicker}>CURRENT RUN</Text><Text style={s.sectionTitle}>ACTIVE EVENT</Text></View><View style={s.livePill}><View style={s.liveDot} /><Text style={s.liveText}>LIVE</Text></View></View>
            <View style={s.activePoster}>
              <View style={s.posterTape}><Text style={s.posterTapeText}>DAY {currentDay}</Text></View>
              <Text style={s.posterKicker}>SKATEQUEST SEASON</Text>
              <Text style={s.posterTitle}>{activeEvent.name}</Text>
              {activeEvent.description ? <Text style={s.posterDescription}>{activeEvent.description}</Text> : null}
              <View style={s.dateTicket}><CalendarDays color={INK} size={17} strokeWidth={2.8} /><View><Text style={s.dateKicker}>EVENT WINDOW</Text><Text style={s.dateText}>{dateLabel(activeEvent.start_date)} → {dateLabel(activeEvent.end_date)}</Text></View></View>
              <View style={s.metricRow}>
                <View style={s.metric}><Text style={s.metricLabel}>DAY</Text><Text style={s.metricValue}>{currentDay}/{totalDays || '?'}</Text></View>
                <View style={s.metric}><Text style={s.metricLabel}>TODAY'S SERVER XP</Text><Text style={s.metricValue}>+{todayXp}</Text></View>
                <View style={s.metric}><Text style={s.metricLabel}>TODAY</Text><Text style={s.metricValue}>{claimedToday ? 'CLAIMED' : 'OPEN'}</Text></View>
              </View>
            </View>
            <View style={s.ruleRail}><ShieldCheck color={INK} size={18} strokeWidth={2.8} /><View style={{ flex: 1 }}><Text style={s.ruleTitle}>WHAT THIS ACTUALLY TRACKS</Text><Text style={s.ruleText}>The live backend currently supports one seasonal reward claim per user per day. The claim RPC determines the event day and XP amount.</Text></View></View>
          </>
        ) : (
          <View style={s.empty}>
            <View style={s.emptyStamp}><CalendarDays color={INK} size={31} strokeWidth={2.8} /></View>
            <Text style={s.emptyKicker}>BETWEEN SEASONS</Text>
            <Text style={s.emptyTitle}>NO REAL EVENT IS LIVE</Text>
            <Text style={s.emptyText}>The production seasonal-events table is currently empty. SkateQuest will show the next event here only when real event data exists.</Text>
          </View>
        )}

        {archived.length > 0 ? (
          <View style={s.archive}>
            <View style={s.archiveHeader}><View><Text style={s.sectionKicker}>REAL EVENT RECORDS</Text><Text style={s.sectionTitle}>EVENT ARCHIVE</Text></View><Text style={s.archiveCount}>{archived.length} LISTED</Text></View>
            {archived.map((event, index) => {
              const now = Date.now();
              const start = event.start_date ? new Date(event.start_date).getTime() : 0;
              const end = event.end_date ? new Date(event.end_date).getTime() : 0;
              const state = start > now ? 'UPCOMING' : end && end < now ? 'ENDED' : 'SCHEDULED';
              const accent = index % 3 === 0 ? ORANGE : index % 3 === 1 ? BLUE : ACID;
              return (
                <View key={event.id} style={[s.archiveCard, index % 2 === 1 && s.tilt]}>
                  <View style={[s.archiveStripe, { backgroundColor: accent }]} />
                  <View style={[s.archiveStamp, { backgroundColor: accent }]}><Sparkles color={INK} size={20} strokeWidth={2.8} /></View>
                  <View style={s.archiveCopy}><Text style={s.archiveKicker}>{state}</Text><Text style={s.archiveTitle}>{event.name}</Text><Text style={s.archiveDate}>{dateLabel(event.start_date)} → {dateLabel(event.end_date)}</Text></View>
                  <View style={s.multiplier}><Zap color={INK} size={13} strokeWidth={2.8} /><Text style={s.multiplierText}>×{seasonalEventsService.getXpMultiplier(event)}</Text></View>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:INK},content:{paddingBottom:118},loading:{flex:1,backgroundColor:INK,alignItems:'center',justifyContent:'center',gap:12},loadingStamp:{width:64,height:64,borderRadius:19,backgroundColor:ACID,alignItems:'center',justifyContent:'center',transform:[{rotate:'-6deg'}]},loadingText:{color:PAPER,fontSize:9,fontWeight:'900',letterSpacing:1.2},
  hero:{minHeight:300,paddingHorizontal:18,paddingTop:20,paddingBottom:28,overflow:'hidden',position:'relative'},orangeSlash:{position:'absolute',width:310,height:94,right:-105,top:55,backgroundColor:ORANGE,transform:[{rotate:'31deg'}]},acidSlash:{position:'absolute',width:220,height:27,left:-70,bottom:35,backgroundColor:ACID,transform:[{rotate:'-10deg'}]},blueOrb:{position:'absolute',width:165,height:165,borderRadius:83,right:8,bottom:-58,backgroundColor:BLUE,opacity:.12},heroTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},heroStamp:{width:60,height:60,borderRadius:18,backgroundColor:ACID,borderWidth:3,borderColor:INK,alignItems:'center',justifyContent:'center',transform:[{rotate:'-6deg'}]},realChip:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:PAPER,borderRadius:999,borderWidth:2,borderColor:INK,paddingHorizontal:10,paddingVertical:7},realChipText:{color:INK,fontSize:7,fontWeight:'900',letterSpacing:.9},eyebrow:{color:ORANGE,fontSize:8,fontWeight:'900',letterSpacing:1.45,marginTop:27},title:{color:PAPER,fontSize:49,lineHeight:45,fontWeight:'900',letterSpacing:-2.8,marginTop:3},subtitle:{color:'#A3AAB5',fontSize:12,lineHeight:18,fontWeight:'700',maxWidth:310,marginTop:8},
  statsTicket:{marginHorizontal:14,marginTop:-10,minHeight:98,backgroundColor:PAPER,borderRadius:24,borderWidth:2,borderColor:INK,flexDirection:'row',paddingVertical:13},stat:{flex:1,alignItems:'center',justifyContent:'center'},divider:{width:1,backgroundColor:'#D4CEC2'},statValue:{color:INK,fontSize:19,fontWeight:'900',marginTop:4},statLabel:{color:'#74766F',fontSize:6.5,fontWeight:'900',letterSpacing:.65,marginTop:1},errorCard:{marginHorizontal:14,marginTop:14,padding:13,borderRadius:16,backgroundColor:'#20110E',borderWidth:1,borderColor:'#63362A'},errorTitle:{color:ORANGE,fontSize:8,fontWeight:'900',letterSpacing:.9},errorText:{color:'#C6A99F',fontSize:10,lineHeight:15,marginTop:3},
  sectionHeader:{paddingHorizontal:18,paddingTop:26,paddingBottom:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sectionKicker:{color:ORANGE,fontSize:7,fontWeight:'900',letterSpacing:1},sectionTitle:{color:PAPER,fontSize:19,fontWeight:'900',letterSpacing:-.4,marginTop:2},livePill:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#172317',borderRadius:999,paddingHorizontal:9,paddingVertical:6},liveDot:{width:7,height:7,borderRadius:4,backgroundColor:ACID},liveText:{color:ACID,fontSize:7,fontWeight:'900',letterSpacing:.8},
  activePoster:{marginHorizontal:14,backgroundColor:ORANGE,borderRadius:24,borderWidth:2,borderColor:INK,padding:16,position:'relative',overflow:'hidden',transform:[{rotate:'-.4deg'}]},posterTape:{position:'absolute',right:-20,top:17,minWidth:86,height:27,backgroundColor:ACID,borderWidth:1.5,borderColor:INK,alignItems:'center',justifyContent:'center',transform:[{rotate:'10deg'}]},posterTapeText:{color:INK,fontSize:7,fontWeight:'900',letterSpacing:.75},posterKicker:{color:'#773A24',fontSize:7,fontWeight:'900',letterSpacing:1},posterTitle:{color:INK,fontSize:29,lineHeight:32,fontWeight:'900',letterSpacing:-1,marginTop:3,paddingRight:55},posterDescription:{color:'#543022',fontSize:11,lineHeight:17,fontWeight:'700',marginTop:10},dateTicket:{minHeight:57,marginTop:14,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:PAPER,borderRadius:14,borderWidth:1.5,borderColor:INK,paddingHorizontal:11},dateKicker:{color:'#878079',fontSize:6.5,fontWeight:'900',letterSpacing:.8},dateText:{color:INK,fontSize:9,fontWeight:'900',marginTop:2},metricRow:{flexDirection:'row',gap:7,marginTop:12},metric:{flex:1,minHeight:64,borderRadius:14,borderWidth:1.5,borderColor:INK,backgroundColor:'#F18B61',alignItems:'center',justifyContent:'center',padding:6},metricLabel:{color:'#6E3A27',fontSize:5.7,fontWeight:'900',letterSpacing:.5,textAlign:'center'},metricValue:{color:INK,fontSize:14,fontWeight:'900',marginTop:3,textAlign:'center'},ruleRail:{marginHorizontal:14,marginTop:11,minHeight:70,flexDirection:'row',alignItems:'center',gap:9,backgroundColor:ACID,borderRadius:16,borderWidth:2,borderColor:INK,paddingHorizontal:12},ruleTitle:{color:INK,fontSize:8,fontWeight:'900',letterSpacing:.75},ruleText:{color:'#59611E',fontSize:8.5,lineHeight:13,fontWeight:'700',marginTop:2},
  empty:{marginHorizontal:14,marginTop:25,minHeight:235,borderRadius:24,borderWidth:1.5,borderColor:'#30343D',backgroundColor:'#13161C',alignItems:'center',justifyContent:'center',padding:24},emptyStamp:{width:64,height:64,borderRadius:19,backgroundColor:ACID,alignItems:'center',justifyContent:'center',transform:[{rotate:'-5deg'}]},emptyKicker:{color:ORANGE,fontSize:7,fontWeight:'900',letterSpacing:1,marginTop:14},emptyTitle:{color:PAPER,fontSize:15,fontWeight:'900',letterSpacing:.65,marginTop:3},emptyText:{color:'#7F8793',fontSize:11,lineHeight:17,textAlign:'center',marginTop:6,maxWidth:285},
  archive:{paddingHorizontal:14,marginTop:28},archiveHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:11,paddingHorizontal:4},archiveCount:{color:'#8B929E',fontSize:7,fontWeight:'900',letterSpacing:.7},archiveCard:{minHeight:86,marginBottom:10,backgroundColor:PAPER,borderRadius:18,borderWidth:1.5,borderColor:INK,padding:12,paddingLeft:16,flexDirection:'row',alignItems:'center',gap:10,overflow:'hidden',position:'relative'},tilt:{transform:[{rotate:'.3deg'}]},archiveStripe:{position:'absolute',left:0,top:0,bottom:0,width:6},archiveStamp:{width:44,height:44,borderRadius:13,borderWidth:1.5,borderColor:INK,alignItems:'center',justifyContent:'center',transform:[{rotate:'-4deg'}]},archiveCopy:{flex:1},archiveKicker:{color:ORANGE,fontSize:6.5,fontWeight:'900',letterSpacing:.8},archiveTitle:{color:INK,fontSize:15,fontWeight:'900',marginTop:2},archiveDate:{color:'#737871',fontSize:7.5,fontWeight:'700',marginTop:3},multiplier:{minWidth:45,height:35,borderRadius:11,backgroundColor:ACID,borderWidth:1.5,borderColor:INK,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:3},multiplierText:{color:INK,fontSize:8,fontWeight:'900'}
});
