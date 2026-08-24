import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native'
import { useNavigation, useRoute, RouteProp } from '../lib/useNavigation'
import { ChevronLeft, MessageSquare, X, PenLine, MapPin, Users, Sparkles, Star } from 'lucide-react-native'
import { supabase } from '../lib/supabase'
import { spotsService } from '../lib/spotsService'
import { getSpotSubmissionErrorMessage } from '../lib/spotSubmission'
import { useAuthStore } from '../stores/useAuthStore'
import { SkateSpot, SpotRating } from '../types'

type SpotReviewsRouteParams = {
  SpotReviews: { spotId: string; spotName: string }
}

interface SpotComment {
  id: string
  spot_id: string
  user_id: string
  content: string
  created_at: string
  profiles: { username: string } | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.max(0, Math.floor(diff / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return formatDate(iso)
}

export default function SpotReviewsScreen() {
  const navigation = useNavigation()
  const route = useRoute<RouteProp<SpotReviewsRouteParams, 'SpotReviews'>>()
  const { spotId, spotName } = route.params
  const user = useAuthStore(state => state.user)

  const [comments, setComments] = useState<SpotComment[]>([])
  const [spotSummary, setSpotSummary] = useState<SkateSpot | null>(null)
  const [myRating, setMyRating] = useState<SpotRating | null>(null)
  const [potential, setPotential] = useState(3)
  const [difficulty, setDifficulty] = useState(3)
  const [quality, setQuality] = useState(3)
  const [savingRating, setSavingRating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [commentText, setCommentText] = useState('')

  const fetchPage = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)
      const commentsRequest = supabase
        .from('spot_comments')
        .select('*, profiles(username)')
        .eq('spot_id', spotId)
        .order('created_at', { ascending: false })
      const [commentsResult, spotResult, ratingResult] = await Promise.all([
        commentsRequest,
        spotsService.getById(spotId),
        user ? spotsService.getMyRating(spotId, user.id) : Promise.resolve({ data: null, error: null }),
      ])

      if (commentsResult.error) throw commentsResult.error
      if (spotResult.error) throw spotResult.error
      if (ratingResult.error) throw ratingResult.error

      const savedRating = ratingResult.data as SpotRating | null
      setComments((commentsResult.data as SpotComment[]) ?? [])
      setSpotSummary(spotResult.data as SkateSpot)
      setMyRating(savedRating)
      setPotential(savedRating?.potential ?? 3)
      setDifficulty(savedRating?.difficulty ?? 3)
      setQuality(savedRating?.quality ?? 3)
    } catch (err: unknown) {
      setError(getSpotSubmissionErrorMessage(err, 'Failed to load this spot.'))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [spotId, user])

  useEffect(() => {
    void fetchPage()
  }, [fetchPage])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchPage(true)
    setRefreshing(false)
  }, [fetchPage])

  const handleSubmit = async () => {
    if (!commentText.trim()) {
      Alert.alert('Comment required', 'Please write something about this spot.')
      return
    }
    try {
      setSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { error: insertError } = await supabase.from('spot_comments').insert({
        spot_id: spotId,
        user_id: user.id,
        content: commentText.trim(),
      })
      if (insertError) throw insertError

      setModalVisible(false)
      setCommentText('')
      await fetchPage(true)
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to submit comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveRating = async () => {
    if (!user) {
      Alert.alert('Sign in to rate', 'Your rating is tied to your SkateQuest account.')
      return
    }

    try {
      setSavingRating(true)
      const { data, error: saveError } = await spotsService.rate(spotId, { potential, difficulty, quality })
      if (saveError) throw saveError

      const saved = data as SpotRating | null
      if (!saved || saved.user_id !== user.id || saved.spot_id !== spotId || saved.potential !== potential || saved.difficulty !== difficulty || saved.quality !== quality) {
        throw new Error('Your rating could not be verified after saving.')
      }

      const [ratingReadback, spotReadback] = await Promise.all([
        spotsService.getMyRating(spotId, user.id),
        spotsService.getById(spotId),
      ])
      if (ratingReadback.error) throw ratingReadback.error
      if (spotReadback.error) throw spotReadback.error

      const persisted = ratingReadback.data as SpotRating | null
      if (!persisted || persisted.potential !== potential || persisted.difficulty !== difficulty || persisted.quality !== quality) {
        throw new Error('Your saved rating could not be read back.')
      }

      setMyRating(persisted)
      setSpotSummary(spotReadback.data as SkateSpot)
      Alert.alert('Rating saved', 'Your take is now part of the spot score.')
    } catch (err: unknown) {
      Alert.alert('Could not save rating', getSpotSubmissionErrorMessage(err, 'Please try again.'))
    } finally {
      setSavingRating(false)
    }
  }

  const uniqueSkaters = new Set(comments.map(c => c.user_id)).size

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#07090D' }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#111722', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#232A36' }}
          >
            <ChevronLeft size={22} color="#F3F4F6" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#D2673D', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 }}>SPOT TALK</Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }} numberOfLines={1}>{spotName}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#D2673D', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14 }}
          >
            <PenLine size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>Post</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#D2673D" />
          <Text style={{ color: '#7B8493', marginTop: 12 }}>Loading the scene…</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#F87171', fontSize: 15, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity onPress={() => fetchPage()} style={{ marginTop: 16, backgroundColor: '#D2673D', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 44 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#D2673D" />}
        >
          <View style={{ backgroundColor: '#10151D', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#252D39', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Star size={18} color="#FFD166" fill="#FFD166" />
              <Text style={{ color: '#F3F4F6', fontSize: 17, fontWeight: '900' }}>Rate the spot</Text>
            </View>
            <Text style={{ color: '#7B8493', fontSize: 12, lineHeight: 18, marginTop: 5 }}>One rating per skater. You can update yours anytime.</Text>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 15 }}>
              <RatingSummary label="POTENTIAL" value={spotSummary?.potential_rating} color="#D9F34A" />
              <RatingSummary label="HOW HARD" value={spotSummary?.difficulty_rating} color="#72A9FF" />
              <RatingSummary label="HOW GOOD" value={spotSummary?.rating} color="#E36D3F" />
            </View>
            <Text style={{ color: '#596271', fontSize: 11, marginTop: 8 }}>
              {spotSummary?.rating_count ? `${spotSummary.rating_count} skater${spotSummary.rating_count === 1 ? '' : 's'} rated this spot` : 'Be the first skater to rate this spot'}
            </Text>

            {user ? (
              <View style={{ marginTop: 18 }}>
                <RatingPicker label="Potential" value={potential} onChange={setPotential} />
                <RatingPicker label="How hard" value={difficulty} onChange={setDifficulty} />
                <RatingPicker label="How good" value={quality} onChange={setQuality} />
                <TouchableOpacity onPress={handleSaveRating} disabled={savingRating} style={{ backgroundColor: savingRating ? '#353B45' : '#D2673D', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 }}>
                  {savingRating ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>{myRating ? 'Update my rating' : 'Save my rating'}</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={{ color: '#AEB5C0', fontSize: 13, marginTop: 16 }}>Sign in to add your rating.</Text>
            )}
          </View>

          <View style={{ backgroundColor: '#10151D', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#252D39', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <MapPin size={17} color="#D2673D" />
              <Text style={{ color: '#F3F4F6', fontSize: 16, fontWeight: '900' }}>What skaters are saying</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: '#0B1017', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#202733' }}>
                <MessageSquare size={17} color="#D2673D" />
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 7 }}>{comments.length}</Text>
                <Text style={{ color: '#7B8493', fontSize: 12 }}>posts</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#0B1017', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#202733' }}>
                <Users size={17} color="#8B5CF6" />
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 7 }}>{uniqueSkaters}</Text>
                <Text style={{ color: '#7B8493', fontSize: 12 }}>skaters</Text>
              </View>
            </View>
          </View>

          {comments.length === 0 ? (
            <View style={{ backgroundColor: '#10151D', borderRadius: 22, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#252D39' }}>
              <View style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: '#171018', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={26} color="#D2673D" />
              </View>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 14 }}>Start the spot talk</Text>
              <Text style={{ color: '#7B8493', fontSize: 14, lineHeight: 20, marginTop: 6, textAlign: 'center' }}>Share the ground, security, traffic, best lines, or anything skaters should know.</Text>
              <TouchableOpacity onPress={() => setModalVisible(true)} style={{ marginTop: 18, backgroundColor: '#D2673D', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 }}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>Post first report</Text>
              </TouchableOpacity>
            </View>
          ) : (
            comments.map(comment => (
              <View key={comment.id} style={{ backgroundColor: '#10151D', borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#252D39' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: '#1B1110', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#D2673D', fontWeight: '900' }}>{(comment.profiles?.username ?? 'S').slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={{ color: '#F3F4F6', fontSize: 14, fontWeight: '900' }}>@{comment.profiles?.username ?? 'skater'}</Text>
                      <Text style={{ color: '#5F6876', fontSize: 11 }}>{timeAgo(comment.created_at)}</Text>
                    </View>
                  </View>
                </View>
                <Text style={{ color: '#C5CAD2', fontSize: 14, lineHeight: 21 }}>{comment.content}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => { setModalVisible(false); setCommentText('') }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#10151D', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, borderWidth: 1, borderColor: '#2A303A' }}>
            <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: '#343B47', alignSelf: 'center', marginBottom: 18 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <View style={{ flex: 1, paddingRight: 20 }}>
                <Text style={{ color: '#D2673D', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 }}>ADD TO THE SCENE</Text>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 3 }}>{spotName}</Text>
                <Text style={{ color: '#7B8493', fontSize: 13, marginTop: 5 }}>Keep it useful for skaters who are about to pull up.</Text>
              </View>
              <TouchableOpacity onPress={() => { setModalVisible(false); setCommentText('') }} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#0B1017', alignItems: 'center', justifyContent: 'center' }}>
                <X size={19} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={5}
              maxLength={280}
              placeholder="Ground quality, bust factor, best line, crowd, lighting…"
              placeholderTextColor="#596271"
              style={{ backgroundColor: '#090D13', borderRadius: 16, padding: 15, color: '#fff', fontSize: 14, minHeight: 130, textAlignVertical: 'top', borderWidth: 1, borderColor: '#252D39' }}
            />
            <Text style={{ color: '#596271', fontSize: 11, textAlign: 'right', marginTop: 7 }}>{commentText.length}/280</Text>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || !commentText.trim()}
              style={{ backgroundColor: submitting || !commentText.trim() ? '#353B45' : '#D2673D', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 14 }}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>Post spot report</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function RatingSummary({ label, value, color }: { label: string; value?: number; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0B1017', borderRadius: 14, padding: 11, borderWidth: 1, borderColor: '#202733' }}>
      <Text style={{ color, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 }}>{label}</Text>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 4 }}>{typeof value === 'number' ? value.toFixed(1) : '—'}</Text>
    </View>
  )
}

function RatingPicker({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <Text style={{ color: '#D4D8DE', fontSize: 13, fontWeight: '800' }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => onChange(star)} accessibilityLabel={`${label} ${star} out of 5`}>
            <Star size={25} color={star <= value ? '#FFD166' : '#46505E'} fill={star <= value ? '#FFD166' : 'transparent'} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}
