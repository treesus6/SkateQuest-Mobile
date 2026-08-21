import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CalendarDays, CheckCircle2, Flame, Gift, Lock, ShieldCheck, Zap } from 'lucide-react-native';
import { seasonalEventsService } from '../lib/seasonalEventsService';
import { useAuthStore } from '../stores/useAuthStore';
import { useSeasonalEventStore } from '../stores/useSeasonalEventStore';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function SeasonalPassScreen() {
  const user = useAuthStore(state => state.user);
  const { activeEvent, claims, loading, error, initialize, refresh, claimReward } = useSeasonalEventStore();
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(false);

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
  const multiplier = activeEvent ? seasonalEventsService.getXpMultiplier(activeEvent) : 1;
  const claimedToday = claims.some(claim => claim.claim_date === isoToday());
  const claimedDays = useMemo(() => new Set(claims.map(claim => claim.day_number)), [claims]);
  const actualXpByDay = useMemo(() => new Map(claims.map(claim => [claim.day_number, claim.xp_awarded])), [claims]);
  const totalClaimedXp = useMemo(() => claims.reduce((sum, claim) => sum + Number(claim.xp_awarded || 0), 0), [claims]);
  const dayTrack = useMemo(
    () => Array.from({ length: totalDays }, (_, index) => ({ day: index + 1 })),
    [totalDays]
  );

  const claimToday = async () => {
    if (!user?.id || !activeEvent || claimedToday) return;
    setClaiming(true);
    try {
      const result = await claimReward(user.id, activeEvent.id);
      if (result.error) throw new Error(result.error);
      if (!result.claimed) {
        Alert.alert('Already claimed', 'The server has already recorded today’s seasonal reward.');
        return;
      }
      Alert.alert('Season reward claimed', `Day ${result.day_number ?? currentDay}: +${result.xp_awarded ?? todayXp} XP`);
    } catch (claimError) {
      Alert.alert('Reward not claimed', claimError instanceof Error ? claimError.message : 'Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  if (loading && !activeEvent) {
    return (
      <SafeAreaView style={s.loading}>
        <View style={s.loadingStamp}><Gift color={INK} size={30} strokeWidth={2.8} /></View>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={s.loadingText}>CHECKING THE LIVE SEASON PASS</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ORANGE} />}
      >
        <View style={s.hero}>
          <View style={s.orangeSlash} />
          <View style={s.acidSlash} />
          <View style={s.blueOrb} />
          <View style={s.heroTop}>
            <View style={s.heroStamp}><Gift color={INK} size={29} strokeWidth={2.8} /></View>
            <View style={s.serverChip}><ShieldCheck color={INK} size={12} strokeWidth={3} /><Text style={s.serverChipText}>SERVER CLAIMS</Text></View>
          </View>
          <Text style={s.eyebrow}>ONE REAL SEASON REWARD PER DAY</Text>
          <Text style={s.title}>SEASON{`\n`}PASS.</Text>
          <Text style={s.subtitle}>This screen now shows only rewards the live backend actually supports. No hardcoded trick challenges or fabricated milestone prizes.</Text>
        </View>

        {error ? <View style={s.errorCard}><Text style={s.errorTitle}>PASS DATA ISSUE</Text><Text style={s.errorText}>{error}</Text></View> : null}

        {!activeEvent ? (
          <View style={s.empty}>
            <View style={s.emptyStamp}><CalendarDays color={INK} size={31} strokeWidth={2.8} /></View>
            <Text style={s.emptyKicker}>PASS CLOSED</Text>
            <Text style={s.emptyTitle}>NO REAL SEASON IS ACTIVE</Text>
            <Text style={s.emptyText}>There are currently no rows in the production seasonal-events table. Nothing is being mocked to fill this screen.</Text>
          </View>
        ) : (
          <>
            <View style={s.passCard}>
              <View style={s.dayTape}><Text style={s.dayTapeText}>DAY {currentDay}</Text></View>
              <Text style={s.passKicker}>ACTIVE SEASON PASS</Text>
              <Text style={s.passName}>{activeEvent.name}</Text>
              {activeEvent.description ? <Text style={s.passDescription}>{activeEvent.description}</Text> : null}

              <View style={s.passStats}>
                <View style={s.passStat}><CalendarDays color={INK} size={17} strokeWidth={2.8} /><Text style={s.passStatValue}>{currentDay}/{totalDays || '?'}</Text><Text style={s.passStatLabel}>EVENT DAY</Text></View>
                <View style={s.passStat}><Flame color={INK} size={17} strokeWidth={2.8} /><Text style={s.passStatValue}>{daysRemaining}</Text><Text style={s.passStatLabel}>DAYS LEFT</Text></View>
                <View style={s.passStat}><Zap color={INK} size={17} strokeWidth={2.8} /><Text style={s.passStatValue}>×{multiplier}</Text><Text style={s.passStatLabel}>XP MULTIPLIER</Text></View>
              </View>
            </View>

            <View style={s.todayCard}>
              <View style={s.todayTop}>
                <View style={s.todayIcon}>{claimedToday ? <CheckCircle2 color={INK} size={25} strokeWidth={2.8} /> : <Zap color={INK} size={25} strokeWidth={2.8} />}</View>
                <View style={s.todayCopy}><Text style={s.todayKicker}>TODAY’S SERVER REWARD</Text><Text style={s.todayTitle}>+{todayXp} XP</Text><Text style={s.todayText}>The claim RPC calculates this from event day × 25 × the event XP multiplier.</Text></View>
              </View>
              <TouchableOpacity
                style={[s.claimButton, claimedToday && s.claimedButton, (claiming || claimedToday) && s.disabled]}
                disabled={claiming || claimedToday}
                onPress={() => void claimToday()}
              >
                {claiming ? <ActivityIndicator color={INK} /> : claimedToday ? <CheckCircle2 color={INK} size={18} strokeWidth={3} /> : <Gift color={INK} size={18} strokeWidth={2.8} />}
                <Text style={s.claimButtonText}>{claiming ? 'CLAIMING...' : claimedToday ? 'CLAIMED TODAY' : 'CLAIM TODAY’S REWARD'}</Text>
              </TouchableOpacity>
            </View>

            <View style={s.receiptRail}><ShieldCheck color={INK} size={18} strokeWidth={2.8} /><View style={{ flex: 1 }}><Text style={s.receiptTitle}>REWARD RECEIPTS</Text><Text style={s.receiptText}>{claims.length} real claim{claims.length === 1 ? '' : 's'} • {totalClaimedXp.toLocaleString()} XP awarded by the server in this event.</Text></View></View>

            <View style={s.trackHeader}><View><Text style={s.trackKicker}>EVENT CALENDAR</Text><Text style={s.trackTitle}>DAILY CLAIM TRACK</Text></View><Text style={s.trackCount}>{claims.length}/{totalDays || 0}</Text></View>
            <FlatList
              horizontal
              data={dayTrack}
              keyExtractor={item => String(item.day)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.trackContent}
              renderItem={({ item }) => {
                const claimed = claimedDays.has(item.day);
                const current = item.day === currentDay;
                const future = item.day > currentDay;
                const xp = claimed ? actualXpByDay.get(item.day) ?? seasonalEventsService.getExpectedXp(activeEvent, item.day) : seasonalEventsService.getExpectedXp(activeEvent, item.day);
                return (
                  <View style={[s.dayCard, current && s.dayCardCurrent, claimed && s.dayCardClaimed]}>
                    <View style={[s.dayIcon, claimed && s.dayIconClaimed, current && !claimed && s.dayIconCurrent]}>
                      {claimed ? <CheckCircle2 color={INK} size={17} strokeWidth={2.8} /> : future ? <Lock color="#6F7681" size={16} strokeWidth={2.5} /> : <Gift color={INK} size={16} strokeWidth={2.6} />}
                    </View>
                    <Text style={s.dayLabel}>DAY {item.day}</Text>
                    <Text style={[s.dayXp, future && s.dayXpFuture]}>+{xp} XP</Text>
                    <Text style={s.dayState}>{claimed ? 'CLAIMED' : current ? 'TODAY' : future ? 'LOCKED' : 'MISSED'}</Text>
                  </View>
                );
              }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:INK},content:{paddingBottom:118},loading:{flex:1,backgroundColor:INK,alignItems:'center',justifyContent:'center',gap:12},loadingStamp:{width:64,height:64,borderRadius:19,backgroundColor:ACID,alignItems:'center',justifyContent:'center',transform:[{rotate:'-6deg'}]},loadingText:{color:PAPER,fontSize:9,fontWeight:'900',letterSpacing:1.15},
  hero:{minHeight:300,paddingHorizontal:18,paddingTop:20,paddingBottom:28,overflow:'hidden',position:'relative'},orangeSlash:{position:'absolute',width:310,height:94,right:-105,top:55,backgroundColor:ORANGE,transform:[{rotate:'31deg'}]},acidSlash:{position:'absolute',width:220,height:27,left:-70,bottom:35,backgroundColor:ACID,transform:[{rotate:'-10deg'}]},blueOrb:{position:'absolute',width:165,height:165,borderRadius:83,right:8,bottom:-58,backgroundColor:BLUE,opacity:.12},heroTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},heroStamp:{width:60,height:60,borderRadius:18,backgroundColor:ACID,borderWidth:3,borderColor:INK,alignItems:'center',justifyContent:'center',transform:[{rotate:'-6deg'}]},serverChip:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:PAPER,borderRadius:999,borderWidth:2,borderColor:INK,paddingHorizontal:10,paddingVertical:7},serverChipText:{color:INK,fontSize:7,fontWeight:'900',letterSpacing:.9},eyebrow:{color:ORANGE,fontSize:8,fontWeight:'900',letterSpacing:1.45,marginTop:27},title:{color:PAPER,fontSize:50,lineHeight:46,fontWeight:'900',letterSpacing:-2.9,marginTop:3},subtitle:{color:'#A3AAB5',fontSize:12,lineHeight:18,fontWeight:'700',maxWidth:310,marginTop:8},
  errorCard:{marginHorizontal:14,marginTop:-5,padding:13,borderRadius:16,backgroundColor:'#20110E',borderWidth:1,borderColor:'#63362A'},errorTitle:{color:ORANGE,fontSize:8,fontWeight:'900',letterSpacing:.9},errorText:{color:'#C6A99F',fontSize:10,lineHeight:15,marginTop:3},empty:{marginHorizontal:14,marginTop:-8,minHeight:245,borderRadius:24,borderWidth:1.5,borderColor:'#30343D',backgroundColor:'#13161C',alignItems:'center',justifyContent:'center',padding:24},emptyStamp:{width:64,height:64,borderRadius:19,backgroundColor:ACID,alignItems:'center',justifyContent:'center',transform:[{rotate:'-5deg'}]},emptyKicker:{color:ORANGE,fontSize:7,fontWeight:'900',letterSpacing:1,marginTop:14},emptyTitle:{color:PAPER,fontSize:15,fontWeight:'900',letterSpacing:.65,marginTop:3},emptyText:{color:'#7F8793',fontSize:11,lineHeight:17,textAlign:'center',marginTop:6,maxWidth:285},
  passCard:{marginHorizontal:14,marginTop:-9,backgroundColor:ORANGE,borderRadius:24,borderWidth:2,borderColor:INK,padding:16,position:'relative',overflow:'hidden',transform:[{rotate:'-.4deg'}]},dayTape:{position:'absolute',right:-18,top:16,minWidth:82,height:27,backgroundColor:ACID,borderWidth:1.5,borderColor:INK,alignItems:'center',justifyContent:'center',transform:[{rotate:'10deg'}]},dayTapeText:{color:INK,fontSize:7,fontWeight:'900',letterSpacing:.75},passKicker:{color:'#773A24',fontSize:7,fontWeight:'900',letterSpacing:1},passName:{color:INK,fontSize:29,lineHeight:32,fontWeight:'900',letterSpacing:-1,marginTop:3,paddingRight:50},passDescription:{color:'#543022',fontSize:11,lineHeight:17,fontWeight:'700',marginTop:10},passStats:{flexDirection:'row',gap:7,marginTop:14},passStat:{flex:1,minHeight:68,borderRadius:14,borderWidth:1.5,borderColor:INK,backgroundColor:'#F18B61',alignItems:'center',justifyContent:'center',padding:6},passStatValue:{color:INK,fontSize:15,fontWeight:'900',marginTop:3,textAlign:'center'},passStatLabel:{color:'#6E3A27',fontSize:5.6,fontWeight:'900',letterSpacing:.45,textAlign:'center'},
  todayCard:{marginHorizontal:14,marginTop:13,backgroundColor:PAPER,borderRadius:22,borderWidth:2,borderColor:INK,padding:14},todayTop:{flexDirection:'row',alignItems:'center',gap:10},todayIcon:{width:50,height:50,borderRadius:15,backgroundColor:ACID,borderWidth:1.5,borderColor:INK,alignItems:'center',justifyContent:'center',transform:[{rotate:'-4deg'}]},todayCopy:{flex:1},todayKicker:{color:ORANGE,fontSize:6.5,fontWeight:'900',letterSpacing:.85},todayTitle:{color:INK,fontSize:24,fontWeight:'900',letterSpacing:-.7,marginTop:2},todayText:{color:'#666A65',fontSize:8.5,lineHeight:13,fontWeight:'700',marginTop:3},claimButton:{minHeight:49,marginTop:13,backgroundColor:ORANGE,borderRadius:14,borderWidth:2,borderColor:INK,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},claimedButton:{backgroundColor:ACID},claimButtonText:{color:INK,fontSize:8.5,fontWeight:'900',letterSpacing:.7},disabled:{opacity:.65},
  receiptRail:{marginHorizontal:14,marginTop:11,minHeight:67,flexDirection:'row',alignItems:'center',gap:9,backgroundColor:ACID,borderRadius:16,borderWidth:2,borderColor:INK,paddingHorizontal:12},receiptTitle:{color:INK,fontSize:8,fontWeight:'900',letterSpacing:.75},receiptText:{color:'#59611E',fontSize:8.5,lineHeight:13,fontWeight:'700',marginTop:2},trackHeader:{marginHorizontal:18,marginTop:25,marginBottom:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},trackKicker:{color:ORANGE,fontSize:7,fontWeight:'900',letterSpacing:1},trackTitle:{color:PAPER,fontSize:19,fontWeight:'900',letterSpacing:-.4,marginTop:2},trackCount:{color:ACID,fontSize:13,fontWeight:'900'},trackContent:{paddingHorizontal:14,paddingBottom:6,gap:8},dayCard:{width:100,minHeight:125,backgroundColor:PAPER,borderRadius:18,borderWidth:1.5,borderColor:INK,padding:10,alignItems:'center'},dayCardCurrent:{borderWidth:3,borderColor:BLUE},dayCardClaimed:{backgroundColor:ACID},dayIcon:{width:37,height:37,borderRadius:11,backgroundColor:'#E7E1D7',borderWidth:1,borderColor:'#CFC7BB',alignItems:'center',justifyContent:'center'},dayIconCurrent:{backgroundColor:BLUE,borderColor:INK},dayIconClaimed:{backgroundColor:PAPER,borderColor:INK},dayLabel:{color:INK,fontSize:7,fontWeight:'900',letterSpacing:.65,marginTop:7},dayXp:{color:INK,fontSize:12,fontWeight:'900',marginTop:3},dayXpFuture:{color:'#777D87'},dayState:{color:'#747871',fontSize:6,fontWeight:'900',letterSpacing:.6,marginTop:3}
});
