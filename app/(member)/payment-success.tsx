import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Pressable, View, Text } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Check } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useColors } from '@/lib/theme/colors'
import { native } from '@/lib/anim'

type ConfirmationState = 'confirming' | 'confirmed' | 'pending' | 'error'

export default function PaymentSuccessScreen() {
  const colors = useColors()
  const params = useLocalSearchParams<{ reference?: string; trxref?: string }>()
  const reference = params.reference || params.trxref

  const [state, setState] = useState<ConfirmationState>('confirming')
  const [attempt, setAttempt] = useState(0)
  const hasCelebrated = useRef(false)
  const ringScale = useRef(new Animated.Value(0)).current
  const ringOpacity = useRef(new Animated.Value(0)).current

  const confirmMembership = useCallback(async () => {
    if (!reference) {
      // If user navigated here without a reference, check if they have an active membership
      const { data: userAuth } = await supabase.auth.getUser()
      if (userAuth?.user) {
        const { data: existing } = await supabase
          .from('memberships')
          .select('id')
          .eq('member_id', userAuth.user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existing) {
          setState('confirmed')
          return
        }
      }
      setState('error')
      return
    }

    try {
      // 1. Direct query: check if membership row exists
      const { data, error } = await supabase
        .from('memberships')
        .select('id')
        .eq('paystack_reference', reference)
        .maybeSingle()
      if (error) throw error

      if (data) {
        setState('confirmed')
        return
      }

      // 2. Query Paystack directly via Edge Function to verify charge
      const { data: verifyRes } = await supabase.functions.invoke('paystack', {
        body: { action: 'verify_membership_charge', payload: { reference } },
      })

      const verifyData = verifyRes?.data
      if (verifyData?.status === 'success') {
        // Re-check if backend created it
        const { data: existingMem } = await supabase
          .from('memberships')
          .select('id')
          .eq('paystack_reference', reference)
          .maybeSingle()

        if (existingMem) {
          setState('confirmed')
          return
        }

        // Client-side fallback insert using RLS policy (memberships_member_insert)
        const meta = verifyData.metadata || {}
        const { data: userAuth } = await supabase.auth.getUser()
        const currentUserId = userAuth?.user?.id || meta.member_id

        if (currentUserId && meta.gym_id && meta.plan_id) {
          const { data: planRow } = await supabase
            .from('membership_plans')
            .select('duration_days, price_naira')
            .eq('id', meta.plan_id)
            .maybeSingle()

          const planDuration = planRow?.duration_days ?? 30
          const membershipAmount = planRow?.price_naira ?? Math.round((verifyData.amount ?? 0) / 100)
          const platformFee = Math.round(membershipAmount * 0.10)
          const gymPayout = membershipAmount - platformFee

          const startDate = new Date()
          const endDate = new Date(startDate.getTime() + planDuration * 24 * 60 * 60 * 1000)

          const { error: insertError } = await supabase.from('memberships').insert({
            member_id: currentUserId,
            gym_id: meta.gym_id,
            plan_id: meta.plan_id,
            status: 'active',
            start_date: startDate.toISOString().slice(0, 10),
            end_date: endDate.toISOString().slice(0, 10),
            payment_method: 'paystack',
            payment_verified_by: 'system',
            amount_paid_naira: membershipAmount,
            platform_fee_naira: platformFee,
            gym_payout_naira: gymPayout,
            paystack_reference: reference,
          })

          if (!insertError || insertError.code === '23505') {
            setState('confirmed')
            return
          }
        }
      }

      if (attempt >= 5) {
        setState('pending')
      } else {
        setState('confirming')
      }
    } catch (cause) {
      logger.error('payment', 'confirm-membership', cause)
      setState('error')
    }
  }, [reference, attempt])

  useEffect(() => {
    confirmMembership()
  }, [confirmMembership, attempt])

  useEffect(() => {
    if (state !== 'confirming') return
    const timeout = setTimeout(() => setAttempt((value) => value + 1), 2500)
    return () => clearTimeout(timeout)
  }, [state, attempt])

  useEffect(() => {
    if (state !== 'confirmed' || hasCelebrated.current) return
    hasCelebrated.current = true
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    Animated.parallel([
      Animated.spring(ringScale, { toValue: 1, useNativeDriver: native, speed: 14, bounciness: 10 }),
      Animated.timing(ringOpacity, { toValue: 1, duration: 240, useNativeDriver: native }),
    ]).start()

    // Auto-redirect to member area after 3 seconds of celebrating
    const redirectTimer = setTimeout(() => {
      router.replace('/(member)')
    }, 3000)
    return () => clearTimeout(redirectTimer)
  }, [ringOpacity, ringScale, state])

  const isPending = state === 'confirming' || state === 'pending'

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
      {state === 'confirming' ? (
        <>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={{ marginTop: 28, fontFamily: 'Syne_700Bold', fontSize: 26, color: colors.text, textAlign: 'center' }}>
            Confirming payment
          </Text>
          <Text style={{ marginTop: 10, fontFamily: 'DMSans_400Regular', fontSize: 15, lineHeight: 23, color: colors.textMuted, textAlign: 'center' }}>
            Verifying your transaction with Paystack. Your membership will activate automatically in a moment.
          </Text>
        </>
      ) : state === 'confirmed' ? (
        <>
          <Animated.View style={{
            width: 84, height: 84, borderRadius: 42, backgroundColor: colors.green,
            alignItems: 'center', justifyContent: 'center', marginBottom: 32,
            transform: [{ scale: ringScale }], opacity: ringOpacity,
          }}>
            <Check size={38} color={colors.obsidian} strokeWidth={3} />
          </Animated.View>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 38, letterSpacing: -1, color: colors.text, textAlign: 'center' }}>
            You're in.
          </Text>
          <Text style={{ marginTop: 14, marginBottom: 48, fontFamily: 'DMSans_400Regular', fontSize: 16, lineHeight: 25, color: colors.textMuted, textAlign: 'center' }}>
            Your membership is active. Redirecting to your dashboard...
          </Text>
          <Pressable
            onPress={() => router.replace('/(member)')}
            style={({ pressed }) => ({ width: '100%', height: 58, borderRadius: 18, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 17, color: colors.obsidian }}>Go to My Gym</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, color: colors.text, textAlign: 'center' }}>
            We're still confirming this payment.
          </Text>
          <Text style={{ marginTop: 10, marginBottom: 30, fontFamily: 'DMSans_400Regular', fontSize: 15, lineHeight: 23, color: colors.textMuted, textAlign: 'center' }}>
            If you completed payment, tap below to check again or return to your gym.
          </Text>
          <Pressable onPress={() => { setAttempt(0); setState('confirming'); }} style={{ width: '100%', height: 54, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.obsidian }}>Check again</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/(member)')} style={{ marginTop: 20 }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.textMuted }}>Back to My Gym</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}
