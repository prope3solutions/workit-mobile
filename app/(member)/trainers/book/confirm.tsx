import { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, Animated, ActivityIndicator, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Check, Lock } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { native } from '@/lib/anim'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export default function ConfirmBookingPaymentScreen() {
  const c = useColors()
  const { bookingId, reference } = useLocalSearchParams<{ bookingId: string; reference: string }>()
  const [status, setStatus] = useState<'charging' | 'success' | 'error'>('charging')
  const ringScale = useRef(new Animated.Value(0)).current

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('paystack', {
          body: { action: 'verify_trainer_booking_charge', payload: { reference } },
        })
        if (verifyError) throw verifyError
        if (verifyData?.data?.status !== 'success') {
          throw new Error(verifyData?.data?.gateway_response || 'Payment was not successful.')
        }

        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .select('id, trainer_id, trainer_profiles(user_id)')
          .eq('id', bookingId)
          .single()
        if (bookingError) throw bookingError

        const trainerUserId = (booking.trainer_profiles as unknown as { user_id: string } | null)?.user_id
        if (trainerUserId) {
          const { error: notifError } = await supabase.from('notifications').insert({
            user_id: trainerUserId,
            title: 'New booking',
            body: 'A member just booked a session with you.',
            type: 'trainer_booking',
            metadata: { booking_id: bookingId },
          })
          if (notifError) throw notifError

          const { error: paidNotifError } = await supabase.from('notifications').insert({
            user_id: trainerUserId,
            title: 'Payment received',
            body: 'Payment for a new booking has been confirmed.',
            type: 'payment_received',
            metadata: { booking_id: bookingId },
          })
          if (paidNotifError) throw paidNotifError
        }

        if (!cancelled) {
          setStatus('success')
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          Animated.spring(ringScale, { toValue: 1, useNativeDriver: native, speed: 14, bounciness: 10 }).start()
        }
      } catch (err) {
        logger.error('memberTrainers', 'confirmBookingPayment', err)
        if (!cancelled) {
          setStatus('error')
          Alert.alert('Payment error', 'Could not confirm your payment. Please try again.')
        }
      }
    }

    if (bookingId && reference) run()
    return () => { cancelled = true }
  }, [bookingId, reference])

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
      {status === 'charging' && (
        <View style={{ alignItems: 'center', gap: 20 }}>
          <ActivityIndicator color={c.green} size="large" />
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: c.textMuted }}>Confirming payment...</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Lock size={11} color={c.textFaint} strokeWidth={2} />
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: c.textFaint }}>Secured by Paystack</Text>
          </View>
        </View>
      )}

      {status === 'success' && (
        <>
          <Animated.View style={{
            width: 84, height: 84, borderRadius: 42,
            backgroundColor: c.green,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 36,
            transform: [{ scale: ringScale }],
          }}>
            <Check size={38} color={c.obsidian} strokeWidth={3} />
          </Animated.View>

          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 30, letterSpacing: -0.6, color: c.text, textAlign: 'center', marginBottom: 12 }}>
            Booking confirmed
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: c.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: 48 }}>
            Your trainer has been notified. See your session details anytime from your bookings.
          </Text>

          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.replace('/(member)') }}
            style={({ pressed }) => ({
              height: 56, borderRadius: 16, width: '100%',
              backgroundColor: c.text,
              alignItems: 'center', justifyContent: 'center',
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: c.chalk }}>Done</Text>
          </Pressable>
        </>
      )}

      {status === 'error' && (
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            height: 52, borderRadius: 14, paddingHorizontal: 24,
            backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: c.text }}>Go back</Text>
        </Pressable>
      )}
    </View>
  )
}
