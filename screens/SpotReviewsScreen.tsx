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
import { ChevronLeft, MessageSquare, X, PenLine, MapPin, Users, Sparkles } from 'lucide-react-native'
import { supabase } from '../lib/supabase'

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

  const [comments, setComments] = useState<SpotComment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [commentText, setCommentText] = useState('')

  const fetchComments = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('spot_comments')
        .select('*, profiles(username)')
        .eq('spot_id', spotId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setComments((data as SpotComment[]) ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load comments')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [spotId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchComments(true)
    setRefreshing(false)
  }, [fetchComments])

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
      await fetchComments(true)
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to submit comment')
    } finally {
      setSubmitting(false)
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
          <TouchableOpacity onPress={() => fetchComments()} style={{ marginTop: 16, backgroundColor: '#D2673D', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 44 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#D2673D" />}
        >
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
