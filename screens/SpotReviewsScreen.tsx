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
} from 'react-native'
import { useNavigation, useRoute, RouteProp } from '../lib/useNavigation'
import { ChevronLeft, MessageSquare, X, PenLine } from 'lucide-react-native'
import { supabase } from '../lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function SpotReviewsScreen() {
  const navigation = useNavigation()
  const route = useRoute<RouteProp<SpotReviewsRouteParams, 'SpotReviews'>>()
  const { spotId, spotName } = route.params

  const [comments, setComments] = useState<SpotComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [commentText, setCommentText] = useState('')

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true)
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
      setLoading(false)
    }
  }, [spotId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleSubmit = async () => {
    if (!commentText.trim()) {
      Alert.alert('Comment required', 'Please write something about this spot.')
      return
    }
    try {
      setSubmitting(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { error: insertError } = await supabase.from('spot_comments').insert({
        spot_id: spotId,
        user_id: user.id,
        content: commentText.trim(),
      })
      if (insertError) throw insertError

      setModalVisible(false)
      setCommentText('')
      fetchComments()
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to submit comment')
    } finally {
      setSubmitting(false)
    }
  }

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
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Reviews</Text>
          <Text style={{ color: '#666', fontSize: 13 }} numberOfLines={1}>
            {spotName}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FF6B35',
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            gap: 6,
          }}
        >
          <PenLine size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Review</Text>
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
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Comment count summary */}
          <View
            style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <MessageSquare size={36} color="#FF6B35" />
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 8 }}>
              {comments.length}
            </Text>
            <Text style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
              {comments.length === 1 ? 'review' : 'reviews'}
            </Text>
          </View>

          {/* Comments list */}
          {comments.length === 0 ? (
            <View
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 16,
                padding: 32,
                alignItems: 'center',
              }}
            >
              <MessageSquare size={40} color="#333" />
              <Text
                style={{
                  color: '#666',
                  fontSize: 15,
                  marginTop: 12,
                  textAlign: 'center',
                }}
              >
                No reviews yet. Be the first to review this spot!
              </Text>
            </View>
          ) : (
            comments.map((comment) => (
              <View
                key={comment.id}
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
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                    {comment.profiles?.username ?? 'Skater'}
                  </Text>
                  <Text style={{ color: '#666', fontSize: 12 }}>
                    {formatDate(comment.created_at)}
                  </Text>
                </View>
                <Text style={{ color: '#ccc', fontSize: 14, lineHeight: 20 }}>
                  {comment.content}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Write Review Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setModalVisible(false)
          setCommentText('')
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.75)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#0a0a0a',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              maxHeight: '70%',
            }}
          >
            {/* Modal header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                Write a Review
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false)
                  setCommentText('')
                }}
              >
                <X size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={5}
              placeholder="Describe the spot, the vibe, the security..."
              placeholderTextColor="#444"
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 12,
                padding: 14,
                color: '#fff',
                fontSize: 14,
                minHeight: 120,
                textAlignVertical: 'top',
                marginBottom: 24,
              }}
            />

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={{
                backgroundColor: submitting ? '#333' : '#FF6B35',
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                  Submit Review
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
