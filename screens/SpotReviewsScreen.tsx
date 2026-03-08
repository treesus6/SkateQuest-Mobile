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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { ChevronLeft, Star, X, PenLine } from 'lucide-react-native'
import { supabase } from '../lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

type SpotReviewsRouteParams = {
  SpotReviews: { spotId: string; spotName: string }
}

interface ReviewProfile {
  username: string
}

interface SpotReview {
  id: string
  spot_id: string
  user_id: string
  rating: number
  ledge_quality: number
  security_risk: number
  pavement: number
  fun_factor: number
  review_text: string
  created_at: string
  profiles: ReviewProfile
}

interface CategoryAverages {
  ledge_quality: number
  security_risk: number
  pavement: number
  fun_factor: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function average(arr: number[]): number {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface StarRowProps {
  rating: number
  size?: number
  onSelect?: (r: number) => void
}

function StarRow({ rating, size = 20, onSelect }: StarRowProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => onSelect?.(n)}
          disabled={!onSelect}
          activeOpacity={onSelect ? 0.7 : 1}
        >
          <Star
            size={size}
            color="#FF6B35"
            fill={n <= rating ? '#FF6B35' : 'transparent'}
          />
        </TouchableOpacity>
      ))}
    </View>
  )
}

interface CategoryBarProps {
  label: string
  value: number // 0–5
}

function CategoryBar({ label, value }: CategoryBarProps) {
  const pct = Math.min(Math.max((value / 5) * 100, 0), 100)
  return (
    <View className="mb-3">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: '#ccc', fontSize: 13 }}>{label}</Text>
        <Text style={{ color: '#FF6B35', fontSize: 13, fontWeight: '600' }}>
          {value.toFixed(1)}
        </Text>
      </View>
      <View
        style={{
          height: 6,
          backgroundColor: '#2a2a2a',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: '#FF6B35',
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  )
}

interface CategorySliderProps {
  label: string
  value: number
  onChange: (v: number) => void
}

function CategorySlider({ label, value, onChange }: CategorySliderProps) {
  return (
    <View className="mb-4">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ color: '#ccc', fontSize: 13 }}>{label}</Text>
        <Text style={{ color: '#FF6B35', fontSize: 13, fontWeight: '700' }}>{value}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n)}
            style={{
              flex: 1,
              height: 32,
              borderRadius: 6,
              backgroundColor: n <= value ? '#FF6B35' : '#2a2a2a',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: n <= value ? '#fff' : '#666', fontSize: 12, fontWeight: '700' }}>
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function SpotReviewsScreen() {
  const navigation = useNavigation()
  const route = useRoute<RouteProp<SpotReviewsRouteParams, 'SpotReviews'>>()
  const { spotId, spotName } = route.params

  const [reviews, setReviews] = useState<SpotReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Modal form state
  const [newRating, setNewRating] = useState(0)
  const [ledge, setLedge] = useState(3)
  const [security, setSecurity] = useState(3)
  const [pavement, setPavement] = useState(3)
  const [funFactor, setFunFactor] = useState(3)
  const [reviewText, setReviewText] = useState('')

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('spot_reviews')
        .select('*, profiles(username)')
        .eq('spot_id', spotId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setReviews((data as SpotReview[]) ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }, [spotId])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const avgRating = average(reviews.map((r) => r.rating))
  const catAverages: CategoryAverages = {
    ledge_quality: average(reviews.map((r) => r.ledge_quality)),
    security_risk: average(reviews.map((r) => r.security_risk)),
    pavement: average(reviews.map((r) => r.pavement)),
    fun_factor: average(reviews.map((r) => r.fun_factor)),
  }

  const resetForm = () => {
    setNewRating(0)
    setLedge(3)
    setSecurity(3)
    setPavement(3)
    setFunFactor(3)
    setReviewText('')
  }

  const handleSubmit = async () => {
    if (newRating === 0) {
      Alert.alert('Rating required', 'Please tap the stars to give a rating.')
      return
    }
    try {
      setSubmitting(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { error: insertError } = await supabase.from('spot_reviews').insert({
        spot_id: spotId,
        user_id: user.id,
        rating: newRating,
        ledge_quality: ledge,
        security_risk: security,
        pavement: pavement,
        fun_factor: funFactor,
        review_text: reviewText.trim(),
      })
      if (insertError) throw insertError

      setModalVisible(false)
      resetForm()
      fetchReviews()
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to submit review')
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
          {/* Overall rating summary */}
          <View
            style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ color: '#FF6B35', fontSize: 56, fontWeight: '900', lineHeight: 60 }}>
              {reviews.length ? avgRating.toFixed(1) : '—'}
            </Text>
            <StarRow rating={Math.round(avgRating)} size={28} />
            <Text style={{ color: '#666', fontSize: 13, marginTop: 8 }}>
              {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
            </Text>
          </View>

          {/* Category averages */}
          {reviews.length > 0 && (
            <View
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <Text
                style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 16 }}
              >
                Category Ratings
              </Text>
              <CategoryBar label="Ledge Quality" value={catAverages.ledge_quality} />
              <CategoryBar label="Security Risk" value={catAverages.security_risk} />
              <CategoryBar label="Pavement" value={catAverages.pavement} />
              <CategoryBar label="Fun Factor" value={catAverages.fun_factor} />
            </View>
          )}

          {/* Reviews list */}
          {reviews.length === 0 ? (
            <View
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 16,
                padding: 32,
                alignItems: 'center',
              }}
            >
              <Star size={40} color="#333" />
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
            reviews.map((review) => (
              <View
                key={review.id}
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
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                    {review.profiles?.username ?? 'Skater'}
                  </Text>
                  <Text style={{ color: '#666', fontSize: 12 }}>
                    {formatDate(review.created_at)}
                  </Text>
                </View>
                <StarRow rating={review.rating} size={16} />
                {review.review_text ? (
                  <Text style={{ color: '#ccc', fontSize: 14, marginTop: 10, lineHeight: 20 }}>
                    {review.review_text}
                  </Text>
                ) : null}
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  {[
                    { label: 'Ledge', val: review.ledge_quality },
                    { label: 'Security', val: review.security_risk },
                    { label: 'Pavement', val: review.pavement },
                    { label: 'Fun', val: review.fun_factor },
                  ].map(({ label, val }) => (
                    <View
                      key={label}
                      style={{
                        backgroundColor: '#2a2a2a',
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Text style={{ color: '#666', fontSize: 11 }}>{label}</Text>
                      <Text style={{ color: '#FF6B35', fontSize: 11, fontWeight: '700' }}>
                        {val}/5
                      </Text>
                    </View>
                  ))}
                </View>
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
          resetForm()
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
              maxHeight: '90%',
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
                  resetForm()
                }}
              >
                <X size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Star rating */}
              <Text style={{ color: '#ccc', fontSize: 13, marginBottom: 10 }}>
                Overall Rating *
              </Text>
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <StarRow rating={newRating} size={40} onSelect={setNewRating} />
              </View>

              {/* Category sliders */}
              <Text
                style={{ color: '#ccc', fontSize: 13, marginBottom: 12, fontWeight: '600' }}
              >
                Category Scores
              </Text>
              <CategorySlider label="Ledge Quality" value={ledge} onChange={setLedge} />
              <CategorySlider label="Security Risk" value={security} onChange={setSecurity} />
              <CategorySlider label="Pavement" value={pavement} onChange={setPavement} />
              <CategorySlider label="Fun Factor" value={funFactor} onChange={setFunFactor} />

              {/* Review text */}
              <Text style={{ color: '#ccc', fontSize: 13, marginBottom: 8, marginTop: 4 }}>
                Write your review (optional)
              </Text>
              <TextInput
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                numberOfLines={4}
                placeholder="Describe the spot, the vibe, the security..."
                placeholderTextColor="#444"
                style={{
                  backgroundColor: '#1a1a1a',
                  borderRadius: 12,
                  padding: 14,
                  color: '#fff',
                  fontSize: 14,
                  minHeight: 100,
                  textAlignVertical: 'top',
                  marginBottom: 24,
                }}
              />

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSubmit}
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
                    Submit Review
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
