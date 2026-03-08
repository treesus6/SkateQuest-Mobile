import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { ChevronLeft, MapPin, Zap, Clock, Users } from 'lucide-react-native'
import { supabase } from '../lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

type CheckInRouteParams = {
  CheckIn: {
    spotId: string
    spotName: string
    latitude: number
    longitude: number
  }
}

interface CheckInProfile {
  username: string
}

interface CheckInRecord {
  id: string
  spot_id: string
  user_id: string
  latitude: number
  longitude: number
  created_at: string
  profiles: CheckInProfile
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const XP_PER_CHECKIN = 25

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function CheckInScreen() {
  const navigation = useNavigation()
  const route = useRoute<RouteProp<CheckInRouteParams, 'CheckIn'>>()
  const { spotId, spotName, latitude, longitude } = route.params

  const [allCheckIns, setAllCheckIns] = useState<CheckInRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
  const [justEarnedXP, setJustEarnedXP] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const fetchCheckIns = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      const uid = user?.id ?? null
      setCurrentUserId(uid)

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data, error: fetchError } = await supabase
        .from('check_ins')
        .select('*, profiles(username)')
        .eq('spot_id', spotId)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      const records = (data as CheckInRecord[]) ?? []
      setAllCheckIns(records)

      // Check if user already checked in today
      if (uid) {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const checkedToday = records.some(
          (c) => c.user_id === uid && new Date(c.created_at) >= todayStart
        )
        setAlreadyCheckedIn(checkedToday)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load check-ins')
    } finally {
      setLoading(false)
    }
  }, [spotId])

  useEffect(() => {
    fetchCheckIns()
  }, [fetchCheckIns])

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert('Login required', 'Please log in to check in.')
        return
      }

      // Insert check-in
      const { error: insertError } = await supabase.from('check_ins').insert({
        spot_id: spotId,
        user_id: user.id,
        latitude,
        longitude,
        created_at: new Date().toISOString(),
      })
      if (insertError) throw insertError

      // Update user XP (increment by XP_PER_CHECKIN using RPC or direct update)
      await supabase.rpc('increment_user_xp', {
        uid: user.id,
        amount: XP_PER_CHECKIN,
      })

      setAlreadyCheckedIn(true)
      setJustEarnedXP(true)
      fetchCheckIns()

      setTimeout(() => setJustEarnedXP(false), 4000)
    } catch (err: unknown) {
      Alert.alert('Check-in failed', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setCheckingIn(false)
    }
  }

  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  const hereNow = allCheckIns.filter((c) => c.created_at >= threeHoursAgo)
  const recentHistory = allCheckIns.filter((c) => c.created_at < threeHoursAgo)

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
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Check In</Text>
          <Text style={{ color: '#666', fontSize: 13 }} numberOfLines={1}>
            {spotName}
          </Text>
        </View>
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
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          {/* XP earned badge (shows after successful check-in) */}
          {justEarnedXP && (
            <View
              style={{
                backgroundColor: '#4CAF50',
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 20,
              }}
            >
              <Zap size={22} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>
                +{XP_PER_CHECKIN} XP Earned!
              </Text>
            </View>
          )}

          {/* Big check-in button */}
          <View
            style={{
              alignItems: 'center',
              marginBottom: 32,
              marginTop: 12,
            }}
          >
            <TouchableOpacity
              onPress={handleCheckIn}
              disabled={alreadyCheckedIn || checkingIn}
              style={{
                width: 180,
                height: 180,
                borderRadius: 90,
                backgroundColor: alreadyCheckedIn ? '#1a1a1a' : '#FF6B35',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: alreadyCheckedIn ? 2 : 0,
                borderColor: '#333',
                // subtle shadow via elevation
                elevation: alreadyCheckedIn ? 0 : 8,
              }}
            >
              {checkingIn ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <>
                  <MapPin
                    size={56}
                    color={alreadyCheckedIn ? '#333' : '#fff'}
                    fill={alreadyCheckedIn ? 'transparent' : '#fff'}
                  />
                  <Text
                    style={{
                      color: alreadyCheckedIn ? '#444' : '#fff',
                      fontSize: 16,
                      fontWeight: '800',
                      marginTop: 10,
                      textAlign: 'center',
                    }}
                  >
                    {alreadyCheckedIn ? 'Checked In\nToday' : 'Check In'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {!alreadyCheckedIn && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 14,
                }}
              >
                <Zap size={16} color="#FF6B35" />
                <Text style={{ color: '#FF6B35', fontSize: 14, fontWeight: '700' }}>
                  +{XP_PER_CHECKIN} XP
                </Text>
              </View>
            )}

            {alreadyCheckedIn && (
              <Text style={{ color: '#666', fontSize: 13, marginTop: 10 }}>
                Come back tomorrow for more XP
              </Text>
            )}
          </View>

          {/* Who's here now */}
          <View
            style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <Users size={18} color="#FF6B35" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                Who's Here Now
              </Text>
              <View
                style={{
                  backgroundColor: '#FF6B35',
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                  {hereNow.length}
                </Text>
              </View>
            </View>

            {hereNow.length === 0 ? (
              <Text style={{ color: '#666', fontSize: 14, textAlign: 'center', paddingVertical: 8 }}>
                Nobody checked in recently — be the first!
              </Text>
            ) : (
              hereNow.map((c) => (
                <View
                  key={c.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#222',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#4CAF50',
                      }}
                    />
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                      {c.profiles?.username ?? 'Skater'}
                    </Text>
                  </View>
                  <Text style={{ color: '#666', fontSize: 12 }}>{timeAgo(c.created_at)}</Text>
                </View>
              ))
            )}
          </View>

          {/* Recent check-ins (past 7 days) */}
          <View
            style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 16,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <Clock size={18} color="#666" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                Recent Check-ins
              </Text>
              <Text style={{ color: '#666', fontSize: 12 }}>— last 7 days</Text>
            </View>

            {recentHistory.length === 0 ? (
              <Text style={{ color: '#666', fontSize: 14, textAlign: 'center', paddingVertical: 8 }}>
                No recent check-ins at this spot.
              </Text>
            ) : (
              recentHistory.slice(0, 20).map((c) => (
                <View
                  key={c.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#222',
                  }}
                >
                  <Text style={{ color: '#ccc', fontSize: 14 }}>
                    {c.profiles?.username ?? 'Skater'}
                  </Text>
                  <Text style={{ color: '#666', fontSize: 12 }}>
                    {formatDateTime(c.created_at)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
