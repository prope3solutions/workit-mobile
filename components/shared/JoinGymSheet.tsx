import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, Modal, Animated, Pressable, ScrollView, Dimensions,
  ActivityIndicator, Alert, PanResponder, Platform,
} from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { X, ShieldCheck, Landmark, CreditCard, ChevronRight, Copy } from 'lucide-react-native'
import * as Clipboard from 'expo-clipboard'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { WInput } from '@/components/ui/WInput'
import { useColors } from '@/lib/theme/colors'
import { native } from '@/lib/anim'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useAuthStore } from '@/lib/stores/authStore'
import { createTrainerBooking } from '@/lib/services/createTrainerBooking'
import { TrainerCard } from '@/components/member/TrainerCard'
import { PLATFORM_FEE_PCT } from '@/lib/constants'
import type { PricingType } from '@/types/database'

const { height: SCREEN_H } = Dimensions.get('window')
const SHEET_HEIGHT = Math.min(SCREEN_H * 0.9, 720)

function formatPrice(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

interface Plan {
  id: string
  name: string
  priceNaira: number
  durationDays: number
}

interface AddOnTrainer {
  id: string
  displayName: string
  photoUrl: string | null
  specializations: string[]
  isIndependent: boolean
  pricingId: string
  pricingType: PricingType
  feeNaira: number
}

interface Props {
  visible: boolean
  gymId: string
  gymName: string
  onClose: () => void
}

export function JoinGymSheet({ visible, gymId, gymName, onClose }: Props) {
  const colors = useColors()
  const user = useAuthStore((s) => s.user)

  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current
  const backdropOp = useRef(new Animated.Value(0)).current

  const [step, setStep] = useState<'plan' | 'pay'>('plan')
  const [subaccountCode, setSubaccountCode] = useState<string | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [trainers, setTrainers] = useState<AddOnTrainer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [trainerOn, setTrainerOn] = useState(false)
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null)

  const [status, setStatus] = useState<'idle' | 'charging' | 'verifying'>('idle')
  const activeReference = useRef<string | null>(null)

  // White-label payment method state
  const [payMethod, setPayMethod] = useState<'select' | 'transfer' | 'card'>('select')
  const [transferInfo, setTransferInfo] = useState<{ bank: string; account: string; expiresAt: number } | null>(null)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  // Card fields (tokenized to Paystack — never persisted/logged)
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  // Kept in sync with `busy` so the (once-created) PanResponder reads a fresh value.
  const busyRef = useRef(false)

  // Slide the sheet in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: native, speed: 18, bounciness: 4 }),
        Animated.timing(backdropOp, { toValue: 1, duration: 200, useNativeDriver: native }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(sheetY, { toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: native }),
        Animated.timing(backdropOp, { toValue: 0, duration: 180, useNativeDriver: native }),
      ]).start()
    }
  }, [visible])

  // Drag-to-dismiss (Bolt-style) — attached to the handle/header area only,
  // so the inner ScrollView still scrolls without fighting the gesture.
  const dragResponder = useRef(
    PanResponder.create({
      // Only claim the gesture on a deliberate downward drag, and never mid-payment.
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        !busyRef.current && gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_evt, gesture) => {
        if (gesture.dy > 0) sheetY.setValue(gesture.dy) // downward only
      },
      onPanResponderRelease: (_evt, gesture) => {
        // Dismiss if dragged far enough OR flicked down fast; else spring back.
        const shouldDismiss = gesture.dy > SHEET_HEIGHT * 0.28 || gesture.vy > 1.2
        if (shouldDismiss) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          Animated.timing(sheetY, {
            toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: native,
          }).start(() => onClose())
        } else {
          Animated.spring(sheetY, { toValue: 0, useNativeDriver: native, speed: 18, bounciness: 4 }).start()
        }
      },
    })
  ).current

  // Reset to a clean state whenever the sheet opens for a new gym
  useEffect(() => {
    if (visible) {
      setStep('plan')
      setSelectedPlan(null)
      setTrainerOn(false)
      setSelectedTrainerId(null)
      setStatus('idle')
    }
  }, [visible, gymId])

  const load = useCallback(async () => {
    if (!gymId) return
    setLoading(true)
    try {
      // Gym's Paystack subaccount — drives the split at charge time.
      const { data: gymRow } = await supabase
        .from('gyms')
        .select('paystack_subaccount_code')
        .eq('id', gymId)
        .single()
      setSubaccountCode(gymRow?.paystack_subaccount_code ?? null)

      const { data: plansData, error: plansError } = await supabase
        .from('membership_plans')
        .select('id, name, price_naira, duration_days')
        .eq('gym_id', gymId)
        .eq('is_active', true)
        .order('price_naira', { ascending: true })
      if (plansError) throw plansError

      setPlans((plansData ?? []).map((p) => ({
        id: p.id, name: p.name, priceNaira: p.price_naira, durationDays: p.duration_days,
      })))

      const { data: affData, error: affError } = await supabase
        .from('trainer_gym_affiliations')
        .select('trainer_profiles(id, display_name, photo_url, specializations, is_independent, status, availability_paused, trainer_pricing(id, amount_naira, pricing_type, is_active))')
        .eq('gym_id', gymId)
      if (affError) throw affError

      const list: AddOnTrainer[] = []
      for (const row of affData ?? []) {
        const tp = row.trainer_profiles as any
        if (!tp) continue
        if (tp.status !== 'approved' || tp.availability_paused) continue
        const activePricing = (tp.trainer_pricing ?? []).filter((p: any) => p.is_active)
        if (activePricing.length === 0) continue
        const perSession = activePricing.filter((p: any) => p.pricing_type === 'per_session')
        const pool = perSession.length > 0 ? perSession : activePricing
        const cheapest = pool.reduce((min: any, p: any) => (p.amount_naira < min.amount_naira ? p : min), pool[0])
        list.push({
          id: tp.id,
          displayName: tp.display_name,
          photoUrl: tp.photo_url,
          specializations: tp.specializations ?? [],
          isIndependent: tp.is_independent,
          pricingId: cheapest.id,
          pricingType: cheapest.pricing_type,
          feeNaira: cheapest.amount_naira,
        })
      }
      setTrainers(list)
    } catch (err) {
      logger.error('joinGym', 'load', err)
    } finally {
      setLoading(false)
    }
  }, [gymId])

  useEffect(() => {
    if (visible) load()
  }, [visible, load])

  const plan = plans.find((p) => p.id === selectedPlan) ?? plans[0] ?? null
  const trainer = trainers.find((t) => t.id === selectedTrainerId)
  const membershipAmount = plan?.priceNaira ?? 0
  // Trainer sessions have their own checkout and booking flow. Do not combine
  // them with a membership charge until the server can create both records as
  // one verified transaction.
  const trainerAddOnAvailable = false
  const total = membershipAmount

  // ── Step 1 → 2 ──
  function goToPay() {
    if (!plan) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setStep('pay')
  }

  // ── White-label bank transfer: get a dynamic account, then poll for payment ──
  async function startPaystackCheckout() {
    if (!user || !gymId || !plan) {
      Alert.alert('Missing information', 'Could not determine which plan to purchase.')
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setStatus('charging')
    try {
      const reference = `wkt_mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      activeReference.current = reference

      const callbackUrl = Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/payment-success`
        : Linking.createURL('/payment-success')

      const { data, error } = await supabase.functions.invoke('paystack', {
        body: {
          action: 'initialize_membership_charge',
          payload: {
            gym_id: gymId,
            plan_id: plan.id,
            callback_url: callbackUrl,
          },
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      const authorizationUrl = data?.data?.authorization_url
      const paymentReference = data?.data?.reference
      if (!authorizationUrl || !paymentReference) {
        throw new Error('Could not start secure checkout. Please try again.')
      }
      activeReference.current = paymentReference
      await WebBrowser.openBrowserAsync(authorizationUrl)
      onClose()
      router.replace(`/(member)/payment-success?reference=${encodeURIComponent(paymentReference)}`)
      return

      // Paystack returns the transfer account under data.data (bank_transfer channel).
      const acct = data?.data?.account_number ?? data?.data?.account_details?.account_number
      const bank = data?.data?.bank?.name ?? data?.data?.account_details?.bank_name ?? 'Bank'
      const expiresRaw = data?.data?.account_expires_at ?? data?.data?.account_details?.expires_at
      if (!acct) throw new Error('Could not generate a transfer account. Please try again.')

      setTransferInfo({
        bank,
        account: acct,
        expiresAt: expiresRaw ? new Date(expiresRaw).getTime() : Date.now() + 30 * 60 * 1000,
      })
      setPayMethod('transfer')
      setStatus('verifying') // now waiting for the transfer to land
      startPolling(reference)
    } catch (err) {
      logger.error('joinGym', 'bankTransfer', err)
      setStatus('idle')
      // Don't strand the user on a dead pay screen — send them back to plans.
      setPayMethod('select')
      setTransferInfo(null)
      setStep('plan')
      Alert.alert('Payment unavailable', 'We couldn\'t start the transfer right now. Please try again.')
    }
  }

  // Poll the charge status until Paystack confirms the transfer landed.
  function startPolling(reference: string) {
    if (pollTimer.current) clearInterval(pollTimer.current)
    pollTimer.current = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke('paystack', {
          body: { action: 'check_charge', payload: { reference } },
        })
        if (data?.data?.status === 'success') {
          if (pollTimer.current) clearInterval(pollTimer.current)
          await completePayment()
        }
      } catch {
        // transient — keep polling
      }
    }, 5000)
  }

  // Stop polling on unmount / close
  useEffect(() => () => { if (pollTimer.current) clearInterval(pollTimer.current) }, [])

  async function completePayment(opts?: { silentFail?: boolean }) {
    const reference = activeReference.current
    if (!reference || !user || !gymId || !plan) return
    // Membership activation is webhook-only. This compatibility callback is
    // retained for the legacy transfer poller but must never write a membership
    // from the client.
    onClose()
    router.replace(`/(member)/payment-success?reference=${encodeURIComponent(reference)}`)
    setStatus('verifying')
    try {
      const { data: planRow, error: planError } = await supabase
        .from('membership_plans')
        .select('id, duration_days')
        .eq('id', plan.id)
        .single()
      if (planError) throw planError

      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('paystack', {
        body: { action: 'verify_membership_charge', payload: { reference } },
      })
      if (verifyError) throw verifyError
      if (verifyData?.data?.status !== 'success') {
        throw new Error(verifyData?.data?.gateway_response || 'Payment was not successful.')
      }

      const startDate = new Date()
      const endDate = new Date(startDate.getTime() + planRow.duration_days * 24 * 60 * 60 * 1000)

      // Commission split — mirrors what Paystack actually split via the subaccount's
      // percentage_charge. Platform keeps PLATFORM_FEE_PCT of the membership amount;
      // the remainder is the gym's payout (accrued in their subaccount).
      const platformFee = Math.round(membershipAmount * (PLATFORM_FEE_PCT / 100))
      const gymPayout = membershipAmount - platformFee

      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          member_id: user.id,
          gym_id: gymId,
          plan_id: plan.id,
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
      if (membershipError) throw membershipError

      if (trainerOn && trainer) {
        const { data: trainerProfile, error: tpErr } = await supabase
          .from('trainer_profiles')
          .select('service_types')
          .eq('id', trainer.id)
          .single()
        if (tpErr) throw tpErr
        const serviceType = ((trainerProfile.service_types ?? ['gym_training'])[0] ?? 'gym_training') as import('@/types/database').ServiceType
        const sessionDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        const bookingResult = await createTrainerBooking({
          memberId: user.id,
          trainerId: trainer.id,
          gymId,
          serviceType,
          pricingType: trainer.pricingType,
          amountNaira: trainer.feeNaira,
          sessionDate,
          sessionTimeBlock: null,
          status: 'upcoming',
          paystackReference: reference,
        })
        if ('error' in bookingResult) throw new Error(bookingResult.error)
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onClose()
      router.replace('/(member)/payment-success')
    } catch (err) {
      logger.error('joinGym', 'completePayment', err)
      setStatus('idle')
      // Suppress the error when the user simply dismissed the browser without paying.
      if (!opts?.silentFail) {
        const message = err instanceof Error ? err.message : 'Could not complete this payment.'
        Alert.alert('Payment error', message)
      }
    }
  }

  const busy = status === 'charging' || status === 'verifying'
  busyRef.current = busy

  if (!visible) return null

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={busy ? undefined : onClose}>
      {/* Backdrop */}
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: backdropOp }}>
        <Pressable style={{ flex: 1 }} onPress={busy ? undefined : onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: SHEET_HEIGHT,
        backgroundColor: colors.bg,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        transform: [{ translateY: sheetY }],
        overflow: 'hidden',
      }}>
        {/* Handle + step label — this whole area is the drag target (Bolt-style) */}
        <View {...dragResponder.panHandlers} style={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: 8 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, letterSpacing: -0.44, color: colors.text }}>
              {step === 'plan' ? 'Choose your plan' : 'Confirm & pay'}
            </Text>
            <Pressable
              onPress={busy ? undefined : onClose}
              hitSlop={12}
              style={({ pressed }) => ({
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
                alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
              })}
            >
              <X size={16} color={colors.text} strokeWidth={2.2} />
            </Pressable>
          </View>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, marginTop: 2 }}>
            {gymName}
          </Text>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.green} />
          </View>
        ) : step === 'plan' ? (
          <>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 }} showsVerticalScrollIndicator={false}>
              {plans.length === 0 ? (
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted }}>
                  This gym has no active plans right now.
                </Text>
              ) : (
                <View style={{ gap: 12 }}>
                  {plans.map((p, i) => {
                    const isSel = (selectedPlan ?? plans[0]?.id) === p.id
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPlan(p.id) }}
                        style={{
                          borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16,
                          backgroundColor: isSel ? colors.obsidian : colors.surface,
                          borderWidth: 1.5, borderColor: isSel ? colors.obsidian : colors.border,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View>
                            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 17, color: isSel ? colors.chalk : colors.text }}>{p.name}</Text>
                            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: isSel ? 'rgba(245,245,240,0.45)' : colors.textMuted }}>
                              {p.durationDays === 1 ? '1 day' : `${p.durationDays} days`}
                            </Text>
                          </View>
                          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 19, color: isSel ? colors.green : colors.text }}>
                            {formatPrice(p.priceNaira)}
                          </Text>
                        </View>
                      </Pressable>
                    )
                  })}
                </View>
              )}

              {/* Trainer add-on */}
              {trainerAddOnAvailable && trainers.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setTrainerOn((v) => { if (v) setSelectedTrainerId(null); return !v })
                    }}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: colors.surface, borderRadius: 14,
                      borderWidth: 1, borderColor: colors.border,
                      paddingHorizontal: 14, paddingVertical: 14,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text }}>Add a trainer?</Text>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 1 }}>Optional · fee added to plan</Text>
                    </View>
                    <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: trainerOn ? colors.green : colors.stone, justifyContent: 'center', padding: 3 }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white, alignSelf: trainerOn ? 'flex-end' : 'flex-start' }} />
                    </View>
                  </Pressable>

                  {trainerOn && (
                    <View style={{ gap: 8, marginTop: 10 }}>
                      {trainers.map((t) => (
                        <TrainerCard
                          key={t.id}
                          id={t.id}
                          displayName={t.displayName}
                          photoUrl={t.photoUrl}
                          rating={0}
                          reviewCount={0}
                          yearsExperience={null}
                          primarySpecialization={t.specializations[0] ?? null}
                          startingPriceNaira={t.feeNaira}
                          gymNames={gymName ? [gymName] : []}
                          isIndependent={t.isIndependent}
                          compact
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                            setSelectedTrainerId((prev) => (prev === t.id ? null : t.id))
                          }}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Sticky footer — total + proceed */}
            <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>Total</Text>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.text }}>{formatPrice(total)}</Text>
              </View>
              <Pressable
                onPress={goToPay}
                disabled={!plan}
                style={{
                  height: 54, borderRadius: 16, backgroundColor: colors.green,
                  alignItems: 'center', justifyContent: 'center',
                  opacity: plan ? 1 : 0.5,
                }}
              >
                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.obsidian }}>Proceed to payment</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {/* Pay step */}
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 }} showsVerticalScrollIndicator={false}>
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>{plan?.name ?? 'Plan'}</Text>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textMuted }}>{formatPrice(membershipAmount)}</Text>
                </View>
                {trainerAddOnAvailable && trainerOn && trainer && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>Trainer · {trainer.displayName}</Text>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textMuted }}>{formatPrice(trainer.feeNaira)}</Text>
                  </View>
                )}
                <View style={{ height: 1, backgroundColor: colors.border }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>Total</Text>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text }}>{formatPrice(total)}</Text>
                </View>
              </View>

              {/* ── Payment method selection ── */}
              {payMethod === 'select' && (
                <View style={{ marginTop: 20, gap: 12 }}>
                  <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 15, color: colors.text }}>Payment method</Text>

                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); startPaystackCheckout() }}
                    disabled={busy}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 14,
                      backgroundColor: colors.surface, borderRadius: 16,
                      borderWidth: 1.5, borderColor: colors.border, padding: 16,
                    }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.green}18`, alignItems: 'center', justifyContent: 'center' }}>
                      <Landmark size={20} color={colors.green} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text }}>Pay via Bank Transfer</Text>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 1 }}>Instant account number to transfer to</Text>
                    </View>
                    {busy ? <ActivityIndicator color={colors.green} /> : <ChevronRight size={18} color={colors.textFaint} strokeWidth={2} />}
                  </Pressable>

                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); startPaystackCheckout() }}
                    disabled={busy}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 14,
                      backgroundColor: colors.surface, borderRadius: 16,
                      borderWidth: 1.5, borderColor: colors.border, padding: 16,
                    }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.stone2, alignItems: 'center', justifyContent: 'center' }}>
                      <CreditCard size={20} color={colors.textMuted} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text }}>Pay with Card</Text>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 1 }}>Debit or credit card</Text>
                    </View>
                    <ChevronRight size={18} color={colors.textFaint} strokeWidth={2} />
                  </Pressable>
                </View>
              )}

              {/* ── Bank transfer: dynamic account details ── */}
              {payMethod === 'transfer' && transferInfo && (
                <View style={{ marginTop: 20, gap: 14 }}>
                  <View style={{ backgroundColor: colors.obsidian, borderRadius: 18, padding: 20 }}>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(245,245,240,0.5)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
                      Transfer exactly
                    </Text>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 28, color: colors.green, marginBottom: 16 }}>{formatPrice(total)}</Text>

                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(245,245,240,0.5)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
                      Bank
                    </Text>
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: colors.chalk, marginBottom: 14 }}>{transferInfo.bank}</Text>

                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(245,245,240,0.5)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
                      Account number
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 24, color: colors.chalk, letterSpacing: 2 }}>{transferInfo.account}</Text>
                      <Pressable
                        onPress={async () => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          await Clipboard.setStringAsync(transferInfo.account)
                          Alert.alert('Copied', 'Account number copied to clipboard.')
                        }}
                        style={({ pressed }) => ({
                          flexDirection: 'row', alignItems: 'center', gap: 5,
                          backgroundColor: 'rgba(0,232,122,0.14)', borderRadius: 10,
                          paddingHorizontal: 12, paddingVertical: 8, opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <Copy size={14} color={colors.green} strokeWidth={2} />
                        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.green }}>Copy</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14 }}>
                    <ActivityIndicator color={colors.green} size="small" />
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>Waiting for your transfer…</Text>
                  </View>

                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textFaint, textAlign: 'center', lineHeight: 18 }}>
                    This temporary account automatically matches your payment. Send exactly {formatPrice(total)} — we'll confirm it here in seconds.
                  </Text>
                </View>
              )}

              {/* ── Card: native fields (tokenization TODO) ── */}
              {payMethod === 'card' && (
                <View style={{ marginTop: 20, gap: 12 }}>
                  <WInput label="Card number" value={cardNumber} onChangeText={setCardNumber} keyboardType="number-pad" placeholder="0000 0000 0000 0000" maxLength={19} />
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <WInput label="Expiry" value={cardExpiry} onChangeText={setCardExpiry} placeholder="MM/YY" maxLength={5} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <WInput label="CVV" value={cardCvv} onChangeText={setCardCvv} keyboardType="number-pad" placeholder="123" maxLength={4} secureTextEntry />
                    </View>
                  </View>
                  <View style={{ backgroundColor: `${colors.amber}14`, borderRadius: 12, padding: 12 }}>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.amber, lineHeight: 18 }}>
                      Card payments are being finalised. Please use Bank Transfer for now — it's instant and confirmed automatically.
                    </Text>
                  </View>
                </View>
              )}

              <Pressable
                onPress={() => {
                  if (busy) return
                  if (payMethod === 'select') setStep('plan')
                  else { setPayMethod('select'); setTransferInfo(null); setStatus('idle'); if (pollTimer.current) clearInterval(pollTimer.current) }
                }}
                style={{ marginTop: 20, alignSelf: 'flex-start' }}
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.textMuted, textDecorationLine: 'underline' }}>
                  {payMethod === 'select' ? '← Back to plans' : '← Change payment method'}
                </Text>
              </Pressable>
            </ScrollView>

            {/* Secured footer */}
            <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ShieldCheck size={11} color={colors.textFaint} strokeWidth={2} />
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textFaint }}>Secured · 256-bit TLS</Text>
              </View>
            </View>
          </>
        )}
      </Animated.View>
    </Modal>
  )
}
