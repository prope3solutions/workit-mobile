import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { useAuthStore } from '@/lib/stores/authStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { createTrainerBooking } from '@/lib/services/createTrainerBooking'
import type { PricingType, ServiceType, TimeBlock } from '@/types/database'

interface Gym {
  id: string
  name: string
}

interface PricingTier {
  id: string
  pricingType: PricingType
  amountNaira: number
}

interface TrainerBookingInfo {
  id: string
  userId: string
  displayName: string
  isIndependent: boolean
  serviceTypes: ServiceType[]
}

const TIME_BLOCKS: { key: TimeBlock; label: string }[] = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' },
]

const PRICING_LABELS: Record<string, string> = {
  per_session: 'Per Session',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

const SERVICE_LABELS: Record<string, string> = {
  gym_training: 'Gym Training',
  home_training: 'Home Training',
  online_coaching: 'Online Coaching',
}

function nextNDates(n: number): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = []
  const today = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)
    const iso = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })
    out.push({ iso, label })
  }
  return out
}

export default function BookTrainerScreen() {
  const c = useColors()
  const { trainerId, preselectedGymId } = useLocalSearchParams<{ trainerId: string; preselectedGymId?: string }>()
  const user = useAuthStore((s) => s.user)
  const didPreselectGym = useRef(false)

  const [trainer, setTrainer] = useState<TrainerBookingInfo | null>(null)
  const [gyms, setGyms] = useState<Gym[]>([])
  const [pricing, setPricing] = useState<PricingTier[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [gymId, setGymId] = useState<string | null>(null)
  const [serviceType, setServiceType] = useState<ServiceType | null>(null)
  const [sessionDate, setSessionDate] = useState<string | null>(null)
  const [timeBlock, setTimeBlock] = useState<TimeBlock | null>(null)
  const [pricingId, setPricingId] = useState<string | null>(null)

  const dates = useMemo(() => nextNDates(14), [])

  const load = useCallback(async () => {
    if (!trainerId) return
    try {
      const { data: profile, error: profileError } = await supabase
        .from('trainer_profiles')
        .select('id, user_id, display_name, is_independent, service_types')
        .eq('id', trainerId)
        .eq('status', 'approved')
        .maybeSingle()
      if (profileError) throw profileError
      if (!profile) {
        setTrainer(null)
        return
      }
      setTrainer({
        id: profile.id,
        userId: profile.user_id,
        displayName: profile.display_name,
        isIndependent: profile.is_independent ?? false,
        serviceTypes: (profile.service_types as ServiceType[]) ?? [],
      })

      const [gymsRes, pricingRes] = await Promise.all([
        (profile.is_independent ?? false)
          ? Promise.resolve({ data: [], error: null })
          : supabase.from('trainer_gym_affiliations').select('gyms(id, name)').eq('trainer_id', profile.id),
        supabase.from('trainer_pricing').select('id, pricing_type, amount_naira').eq('trainer_id', profile.id).eq('is_active', true).order('amount_naira', { ascending: true }),
      ])
      if (gymsRes.error) throw gymsRes.error
      if (pricingRes.error) throw pricingRes.error

      setGyms((gymsRes.data ?? []).map((row) => {
        const gym = row.gyms as unknown as { id: string; name: string } | null
        return gym ? { id: gym.id, name: gym.name } : null
      }).filter((g): g is Gym => !!g))

      setPricing((pricingRes.data ?? []).map((p) => ({
        id: p.id,
        pricingType: p.pricing_type as PricingTier['pricingType'],
        amountNaira: p.amount_naira,
      })))
    } catch (err) {
      logger.error('memberTrainers', 'fetchBookingSetup', err)
    } finally {
      setLoading(false)
    }
  }, [trainerId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  useEffect(() => {
    if (didPreselectGym.current) return
    if (!preselectedGymId || gyms.length === 0) return
    if (gyms.some((g) => g.id === preselectedGymId)) {
      setGymId(preselectedGymId)
      didPreselectGym.current = true
    }
  }, [gyms, preselectedGymId])

  const selectedPricing = pricing.find((p) => p.id === pricingId) ?? null
  const needsGym = !!trainer && !trainer.isIndependent

  const canSubmit =
    !!trainer &&
    (!needsGym || !!gymId) &&
    !!serviceType &&
    !!sessionDate &&
    !!timeBlock &&
    !!selectedPricing

  async function handleConfirm() {
    if (!trainer || !user || !selectedPricing || !serviceType || !sessionDate || !timeBlock) return
    try {
      setSubmitting(true)

      const reference = `wkt_book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      const bookingResult = await createTrainerBooking({
        memberId: user.id,
        trainerId: trainer.id,
        gymId: needsGym ? gymId : null,
        serviceType,
        pricingType: selectedPricing.pricingType,
        amountNaira: selectedPricing.amountNaira,
        sessionDate,
        sessionTimeBlock: timeBlock,
        status: 'pending_payment',
        paystackReference: reference,
        notify: false,
      })
      if ('error' in bookingResult) throw new Error(bookingResult.error)
      const bookingId = bookingResult.bookingId

      const { data: initData, error: initError } = await supabase.functions.invoke('paystack', {
        body: {
          action: 'initialize_trainer_booking_charge',
          payload: {
            email: user.email,
            amount_naira: bookingResult.amountNaira,
            reference,
            metadata: { booking_id: bookingId, trainer_id: trainer.id, member_id: user.id },
          },
        },
      })
      if (initError) throw initError
      if (initData?.error) throw new Error(initData.error)

      router.replace({ pathname: '/(member)/trainers/book/confirm', params: { bookingId, reference } })
    } catch (err) {
      logger.error('memberTrainers', 'createBooking', err)
      const message = err instanceof Error ? err.message : 'Could not create this booking.'
      Alert.alert('Error', message)
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

  if (!trainer) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: c.text, textAlign: 'center' }}>
          Trainer not available for booking.
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
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: c.text }}>Book {trainer.displayName}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 160, gap: 22 }} keyboardShouldPersistTaps="handled">
        {needsGym && (
          <View>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: c.textMuted, marginBottom: 8, letterSpacing: 0.12 }}>
              GYM
            </Text>
            {gyms.length === 0 ? (
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: c.textMuted }}>
                This trainer has no gym affiliations set up.
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {gyms.map((gym) => {
                  const selected = gym.id === gymId
                  return (
                    <TouchableOpacity
                      key={gym.id}
                      onPress={() => setGymId(gym.id)}
                      style={{
                        padding: 14, borderRadius: 12,
                        backgroundColor: selected ? '#00E87A0D' : c.surface,
                        borderWidth: 1.5, borderColor: selected ? c.green : c.border,
                      }}
                    >
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: c.text }}>{gym.name}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </View>
        )}

        <View>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: c.textMuted, marginBottom: 8, letterSpacing: 0.12 }}>
            SERVICE TYPE
          </Text>
          <View style={{ gap: 8 }}>
            {trainer.serviceTypes.map((s) => {
              const selected = s === serviceType
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setServiceType(s)}
                  style={{
                    padding: 14, borderRadius: 12,
                    backgroundColor: selected ? '#00E87A0D' : c.surface,
                    borderWidth: 1.5, borderColor: selected ? c.green : c.border,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: c.text }}>{SERVICE_LABELS[s] ?? s}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <View>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: c.textMuted, marginBottom: 8, letterSpacing: 0.12 }}>
            DATE
          </Text>
          <ScrollView horizontal style={{ flexGrow: 0, height: 52 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
            {dates.map((d) => {
              const selected = d.iso === sessionDate
              return (
                <TouchableOpacity
                  key={d.iso}
                  onPress={() => setSessionDate(d.iso)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
                    backgroundColor: selected ? c.obsidian : c.surface,
                    borderWidth: 1.5, borderColor: selected ? c.obsidian : c.border,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: selected ? c.white : c.text }}>{d.label}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        <View>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: c.textMuted, marginBottom: 8, letterSpacing: 0.12 }}>
            TIME BLOCK
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {TIME_BLOCKS.map((tb) => {
              const selected = tb.key === timeBlock
              return (
                <TouchableOpacity
                  key={tb.key}
                  onPress={() => setTimeBlock(tb.key)}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                    backgroundColor: selected ? c.obsidian : c.surface,
                    borderWidth: 1.5, borderColor: selected ? c.obsidian : c.border,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: selected ? c.white : c.textMuted }}>{tb.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <View>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: c.textMuted, marginBottom: 8, letterSpacing: 0.12 }}>
            PRICING TIER
          </Text>
          {pricing.length === 0 ? (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: c.textMuted }}>
              This trainer has no active pricing set up.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {pricing.map((p) => {
                const selected = p.id === pricingId
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setPricingId(p.id)}
                    style={{
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      padding: 14, borderRadius: 12,
                      backgroundColor: selected ? '#00E87A0D' : c.surface,
                      borderWidth: 1.5, borderColor: selected ? c.green : c.border,
                    }}
                  >
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: c.text }}>{PRICING_LABELS[p.pricingType] ?? p.pricingType}</Text>
                    <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 14, color: selected ? c.green : c.textMuted }}>
                      {formatCurrency(p.amountNaira)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: c.surface,
        borderTopWidth: 1, borderTopColor: c.border,
        paddingHorizontal: 24, paddingTop: 14, paddingBottom: 32,
      }}>
        {selectedPricing && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: c.text }}>Total</Text>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.4, color: c.text }}>
              {formatCurrency(selectedPricing.amountNaira)}
            </Text>
          </View>
        )}
        <WButton label="Confirm & Pay" variant="green" onPress={handleConfirm} loading={submitting} disabled={!canSubmit} />
      </View>
    </View>
  )
}
