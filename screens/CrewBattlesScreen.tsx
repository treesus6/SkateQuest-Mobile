import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import {
  ChevronLeft,
  Trophy,
  Swords,
  Clock,
  Plus,
  X,
  Zap,
  CheckCircle2,
} from 'lucide-react-native'
import { supabase } from '../lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

interface CrewInfo {
  id: string
  name: string
}

interface CrewBattle {
  id: string
  crew_a_id: string
  crew_b_id: string
  spot_id: string
  trick_name: string
  votes_a: number
  votes_b: number
  ends_at: string
  winner_crew_id: string | null
  status: 'active' | 'completed'
  crew_a?: CrewInfo
  crew_b?: CrewInfo
  winner_crew?: CrewInfo
}

interface UserVote {
  battle_id: string
  crew_voted: 'a' | 'b'
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function useCountdown(endsAt: string): string {
  const [label, setLabel] = useState('')

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) {
        setLabel('Ended')
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setLabel(`${h}h ${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  return label
}

const BATTLE_XP = 500
const DURATIONS = [
  { label: '24h', hours: 24 },
  { label: '48h', hours: 48 },
  { label: '72h', hours: 72 },
]

// ── Sub-components ────────────────────────────────────────────────────────────

interface VoteBarProps {
  votesA: number
  votesB: number
}

function VoteBar({ votesA, votesB }: VoteBarProps) {
  const total = votesA + votesB || 1
  const pctA = (votesA / total) * 100
  return (
    <View style={{ height: 6, flexDirection: 'row', borderRadius: 3, overflow: 'hidden', marginVertical: 8 }}>
      <View style={{ flex: pctA, backgroundColor: '#FF6B35' }} />
      <View style={{ flex: 100 - pctA, backgroundColor: '#2a2a2a' }} />
    </View>
  )
}

interface CountdownBadgeProps {
  endsAt: string
}

function CountdownBadge({ endsAt }: CountdownBadgeProps) {
  const label = useCountdown(endsAt)
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <Clock size={12} color="#FF6B35" />
      <Text style={{ color: '#FF6B35', fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  )
}

// ── Active Battle Card ────────────────────────────────────────────────────────

interface ActiveBattleCardProps {
  battle: CrewBattle
  myVote: UserVote | undefined
  onVote: (battleId: string, side: 'a' | 'b') => void
  voting: boolean
}

function ActiveBattleCard({ battle, myVote, onVote, voting }: ActiveBattleCardProps) {
  const votedA = myVote?.crew_voted === 'a'
  const votedB = myVote?.crew_voted === 'b'
  const hasVoted = !!myVote

  return (
    <View
      style={{
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {/* Trick + timer */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Swords size={16} color="#FF6B35" />
          <Text style={{ color: '#FF6B35', fontSize: 13, fontWeight: '700' }}>
            {battle.trick_name}
          </Text>
        </View>
        <CountdownBadge endsAt={battle.ends_at} />
      </View>

      {/* Crews row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {/* Crew A */}
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 2 }}
            numberOfLines={1}
          >
            {battle.crew_a?.name ?? 'Crew A'}
          </Text>
          <Text style={{ color: '#666', fontSize: 12 }}>{battle.votes_a} votes</Text>
        </View>
        <Text style={{ color: '#444', fontSize: 18, fontWeight: '900' }}>VS</Text>
        {/* Crew B */}
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text
            style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 2, textAlign: 'right' }}
            numberOfLines={1}
          >
            {battle.crew_b?.name ?? 'Crew B'}
          </Text>
          <Text style={{ color: '#666', fontSize: 12, textAlign: 'right' }}>
            {battle.votes_b} votes
          </Text>
        </View>
      </View>

      <VoteBar votesA={battle.votes_a} votesB={battle.votes_b} />

      {/* XP stake */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          marginBottom: 14,
          marginTop: 2,
        }}
      >
        <Zap size={13} color="#FF6B35" />
        <Text style={{ color: '#666', fontSize: 12 }}>
          Winner crew earns{' '}
          <Text style={{ color: '#FF6B35', fontWeight: '700' }}>{BATTLE_XP} XP</Text>
        </Text>
      </View>

      {/* Vote buttons */}
      {hasVoted ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: '#2a2a2a',
            borderRadius: 10,
            paddingVertical: 10,
          }}
        >
          <CheckCircle2 size={16} color="#4CAF50" />
          <Text style={{ color: '#4CAF50', fontSize: 13, fontWeight: '700' }}>
            Voted for {myVote.crew_voted === 'a' ? battle.crew_a?.name ?? 'Crew A' : battle.crew_b?.name ?? 'Crew B'}
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => onVote(battle.id, 'a')}
            disabled={voting}
            style={{
              flex: 1,
              backgroundColor: votedA ? '#FF6B35' : '#2a2a2a',
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: votedA ? '#fff' : '#ccc', fontSize: 13, fontWeight: '700' }}>
              Vote {battle.crew_a?.name ?? 'Crew A'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onVote(battle.id, 'b')}
            disabled={voting}
            style={{
              flex: 1,
              backgroundColor: votedB ? '#FF6B35' : '#2a2a2a',
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: votedB ? '#fff' : '#ccc', fontSize: 13, fontWeight: '700' }}>
              Vote {battle.crew_b?.name ?? 'Crew B'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ── Completed Battle Card ─────────────────────────────────────────────────────

interface CompletedBattleCardProps {
  battle: CrewBattle
}

function CompletedBattleCard({ battle }: CompletedBattleCardProps) {
  const winnerIsA = battle.winner_crew_id === battle.crew_a_id
  const winnerName = battle.winner_crew?.name ?? (winnerIsA ? battle.crew_a?.name : battle.crew_b?.name) ?? 'Unknown'

  return (
    <View
      style={{
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginBottom: 12,
        }}
      >
        <Swords size={14} color="#666" />
        <Text style={{ color: '#666', fontSize: 12 }}>{battle.trick_name}</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: winnerIsA ? '#fff' : '#444', fontSize: 14, fontWeight: '700' }}>
            {battle.crew_a?.name ?? 'Crew A'}
          </Text>
          <Text style={{ color: '#666', fontSize: 12 }}>{battle.votes_a} votes</Text>
        </View>
        <Text style={{ color: '#333', fontWeight: '900' }}>VS</Text>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text
            style={{ color: !winnerIsA ? '#fff' : '#444', fontSize: 14, fontWeight: '700', textAlign: 'right' }}
          >
            {battle.crew_b?.name ?? 'Crew B'}
          </Text>
          <Text style={{ color: '#666', fontSize: 12, textAlign: 'right' }}>
            {battle.votes_b} votes
          </Text>
        </View>
      </View>

      <VoteBar votesA={battle.votes_a} votesB={battle.votes_b} />

      {/* Winner badge */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: '#2a2a2a',
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginTop: 8,
          alignSelf: 'flex-start',
        }}
      >
        <Trophy size={16} color="#FFD700" />
        <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '800' }}>
          {winnerName} wins +{BATTLE_XP} XP
        </Text>
      </View>
    </View>
  )
}

// ── Create Battle Modal ───────────────────────────────────────────────────────

interface CreateBattleModalProps {
  visible: boolean
  onClose: () => void
  onCreated: () => void
  crews: CrewInfo[]
}

function CreateBattleModal({ visible, onClose, onCreated, crews }: CreateBattleModalProps) {
  const [crewA, setCrewA] = useState<string>('')
  const [crewB, setCrewB] = useState<string>('')
  const [trick, setTrick] = useState('')
  const [durationHours, setDurationHours] = useState(24)
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setCrewA('')
    setCrewB('')
    setTrick('')
    setDurationHours(24)
  }

  const handleCreate = async () => {
    if (!crewA || !crewB || crewA === crewB) {
      Alert.alert('Error', 'Select two different crews.')
      return
    }
    if (!trick.trim()) {
      Alert.alert('Error', 'Enter a trick name.')
      return
    }
    try {
      setSubmitting(true)
      const endsAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString()
      const { error } = await supabase.from('crew_battles').insert({
        crew_a_id: crewA,
        crew_b_id: crewB,
        trick_name: trick.trim(),
        votes_a: 0,
        votes_b: 0,
        ends_at: endsAt,
        status: 'active',
        winner_crew_id: null,
      })
      if (error) throw error
      reset()
      onCreated()
      onClose()
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create battle')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#0a0a0a',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            maxHeight: '85%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
              Create Battle
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Crew A */}
            <Text style={{ color: '#ccc', fontSize: 13, marginBottom: 8 }}>Crew A</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {crews.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCrewA(c.id)}
                  style={{
                    backgroundColor: crewA === c.id ? '#FF6B35' : '#1a1a1a',
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{ color: crewA === c.id ? '#fff' : '#ccc', fontSize: 13, fontWeight: '600' }}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Crew B */}
            <Text style={{ color: '#ccc', fontSize: 13, marginBottom: 8 }}>Crew B</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {crews.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCrewB(c.id)}
                  style={{
                    backgroundColor: crewB === c.id ? '#FF6B35' : '#1a1a1a',
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{ color: crewB === c.id ? '#fff' : '#ccc', fontSize: 13, fontWeight: '600' }}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Trick */}
            <Text style={{ color: '#ccc', fontSize: 13, marginBottom: 8 }}>Trick</Text>
            <View
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 12,
                paddingHorizontal: 14,
                marginBottom: 16,
              }}
            >
              <Text
                style={{ color: trick ? '#fff' : '#444', fontSize: 14, paddingVertical: 12 }}
                onPress={() => {}}
              >
                {trick || 'e.g. Kickflip, 360 Flip...'}
              </Text>
              {/* Use a simple text prompt — proper TextInput below */}
            </View>
            {/* Real input overlay */}
            <View
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 12,
                paddingHorizontal: 14,
                marginBottom: 16,
                marginTop: -64,
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 14,
                  paddingVertical: 12,
                }}
                onPress={() => Alert.alert('Trick', 'Type the trick name')}
              />
            </View>
            {/* Simple trick selector chips */}
            <Text style={{ color: '#ccc', fontSize: 13, marginBottom: 8 }}>Quick Pick Trick</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {['Kickflip', 'Heelflip', '360 Flip', 'Backside 180', 'Nosegrind', 'Crooked Grind', 'Manual'].map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTrick(t)}
                  style={{
                    backgroundColor: trick === t ? '#FF6B35' : '#1a1a1a',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: trick === t ? '#fff' : '#ccc', fontSize: 12 }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Duration */}
            <Text style={{ color: '#ccc', fontSize: 13, marginBottom: 8 }}>Battle Duration</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
              {DURATIONS.map((d) => (
                <TouchableOpacity
                  key={d.hours}
                  onPress={() => setDurationHours(d.hours)}
                  style={{
                    flex: 1,
                    backgroundColor: durationHours === d.hours ? '#FF6B35' : '#1a1a1a',
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: durationHours === d.hours ? '#fff' : '#ccc',
                      fontSize: 15,
                      fontWeight: '700',
                    }}
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* XP stake info */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#1a1a1a',
                borderRadius: 12,
                padding: 14,
                marginBottom: 20,
              }}
            >
              <Zap size={18} color="#FF6B35" />
              <Text style={{ color: '#ccc', fontSize: 13 }}>
                Winning crew earns{' '}
                <Text style={{ color: '#FF6B35', fontWeight: '800' }}>{BATTLE_XP} XP</Text>
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleCreate}
              disabled={submitting}
              style={{
                backgroundColor: submitting ? '#333' : '#FF6B35',
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                  Start Battle
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function CrewBattlesScreen() {
  const navigation = useNavigation()

  const [battles, setBattles] = useState<CrewBattle[]>([])
  const [crews, setCrews] = useState<CrewInfo[]>([])
  const [myVotes, setMyVotes] = useState<UserVote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [battlesRes, crewsRes] = await Promise.all([
        supabase
          .from('crew_battles')
          .select(`
            *,
            crew_a:crew_a_id(id, name),
            crew_b:crew_b_id(id, name),
            winner_crew:winner_crew_id(id, name)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('crews').select('id, name').order('name'),
      ])

      if (battlesRes.error) throw battlesRes.error
      if (crewsRes.error) throw crewsRes.error

      setBattles((battlesRes.data as CrewBattle[]) ?? [])
      setCrews((crewsRes.data as CrewInfo[]) ?? [])

      // Fetch user's votes
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: votesData } = await supabase
          .from('crew_battle_votes')
          .select('battle_id, crew_voted')
          .eq('user_id', user.id)
        setMyVotes((votesData as UserVote[]) ?? [])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load battles')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleVote = async (battleId: string, side: 'a' | 'b') => {
    try {
      setVoting(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert('Login required', 'Log in to vote.')
        return
      }

      // Record vote
      const { error: voteError } = await supabase.from('crew_battle_votes').insert({
        battle_id: battleId,
        user_id: user.id,
        crew_voted: side,
      })
      if (voteError) throw voteError

      // Increment vote count
      const voteField = side === 'a' ? 'votes_a' : 'votes_b'
      const battle = battles.find((b) => b.id === battleId)
      if (battle) {
        const newCount = (side === 'a' ? battle.votes_a : battle.votes_b) + 1
        await supabase
          .from('crew_battles')
          .update({ [voteField]: newCount })
          .eq('id', battleId)
      }

      setMyVotes((prev) => [...prev, { battle_id: battleId, crew_voted: side }])
      fetchData()
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to vote')
    } finally {
      setVoting(false)
    }
  }

  const activeBattles = battles.filter((b) => b.status === 'active')
  const completedBattles = battles.filter((b) => b.status === 'completed')

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#1a1a1a',
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <ChevronLeft size={24} color="#FF6B35" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Crew Battles</Text>
          <Text style={{ color: '#666', fontSize: 13 }}>
            {activeBattles.length} active battle{activeBattles.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setCreateModalVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#FF6B35',
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Plus size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Battle</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#FF6B35', fontSize: 15, textAlign: 'center' }}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
          {/* Active battles */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Swords size={18} color="#FF6B35" />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Active Battles</Text>
          </View>

          {activeBattles.length === 0 ? (
            <View
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 16,
                padding: 32,
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <Swords size={36} color="#333" />
              <Text style={{ color: '#666', fontSize: 14, marginTop: 10, textAlign: 'center' }}>
                No active battles. Start one!
              </Text>
            </View>
          ) : (
            activeBattles.map((battle) => (
              <ActiveBattleCard
                key={battle.id}
                battle={battle}
                myVote={myVotes.find((v) => v.battle_id === battle.id)}
                onVote={handleVote}
                voting={voting}
              />
            ))
          )}

          {/* Completed battles */}
          {completedBattles.length > 0 && (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                  marginTop: 8,
                }}
              >
                <Trophy size={18} color="#FFD700" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                  Completed Battles
                </Text>
              </View>
              {completedBattles.map((battle) => (
                <CompletedBattleCard key={battle.id} battle={battle} />
              ))}
            </>
          )}
        </ScrollView>
      )}

      <CreateBattleModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={fetchData}
        crews={crews}
      />
    </SafeAreaView>
  )
}
