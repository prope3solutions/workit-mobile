import { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { ArrowLeft, Star } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { useAuthStore } from '@/lib/stores/authStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export default function ReviewBookingScreen() {
  const c = useColors()
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>()
  const user = useAuthStore((s) => s.user)

  const [eligible, setEligible] = useState<boolean | null>(null)
  const [trainerId, setTrainerId] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!user || !bookingId) return
    try {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, trainer_id, member_id, status')
        .eq('id', bookingId)
        .eq('member_id', user.id)
        .eq('status', 'completed')
        .maybeSingle()
      if (bookingError) throw bookingError
      if (!booking) {
        setEligible(false)
        return
      }

      const { data: existingReview, error: reviewError } = await supabase
        .from('trainer_reviews')
        .select('id')
        .eq('booking_id', bookingId)
        .maybeSingle()
      if (reviewError) throw reviewError

      if (existingReview) {
        setEligible(false)
        return
      }

      setTrainerId(booking.trainer_id)
      setEligible(true)
    } catch (err) {
      logger.error('memberTrainers', 'fetchReviewEligibility', err)
      setEligible(false)
    } finally {
      setLoading(false)
    }
  }, [user, bookingId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleSubmit() {
    if (!user || !trainerId || !bookingId || rating < 1) return
    try {
      setSubmitting(true)
      const { error } = await supabase.from('trainer_reviews').insert({
        booking_id: bookingId,
        trainer_id: trainerId,
        member_id: user.id,
        rating,
        comment: comment.trim() || null,
      })
      if (error) {
        if (error.code === '23505') {
          Alert.alert('Already reviewed', 'You have already left a review for this booking.')
          setEligible(false)
          return
        }
        throw error
      }
      router.back()
    } catch (err) {
      logger.error('memberTrainers', 'submitReview', err)
      Alert.alert('Error', 'Could not submit your review.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.green} />
      </View>
    )
  }

  if (!eligible) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: c.text, textAlign: 'center', marginBottom: 8 }}>
          Can't review this booking
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: c.textMuted, textAlign: 'center' }}>
          This booking isn't completed yet, or you've already left a review for it.
        </Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={c.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: c.text }}>Leave a review</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: c.textMuted }}>How was your session?</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={6}>
                <Star
                  size={36}
                  color={n <= rating ? c.amber : c.border}
                  fill={n <= rating ? c.amber : 'transparent'}
                  strokeWidth={1.5}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: c.textMuted, marginBottom: 8, letterSpacing: 0.12 }}>
            COMMENT (OPTIONAL)
          </Text>
          <View style={{
            backgroundColor: c.surface, borderRadius: 12,
            borderWidth: 1.5, borderColor: c.border,
            minHeight: 100, paddingHorizontal: 16, paddingVertical: 14,
          }}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Share more about your experience..."
              placeholderTextColor={c.textFaint}
              multiline
              style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: c.text, textAlignVertical: 'top' }}
            />
          </View>
        </View>

        <WButton label="Submit review" variant="green" onPress={handleSubmit} loading={submitting} disabled={rating < 1} />
      </ScrollView>
    </View>
  )
}
