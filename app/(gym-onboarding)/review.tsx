import { useEffect, useState } from 'react'
import { View, Text, Alert, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { WCard } from '@/components/ui/WCard'
import { OnboardingShell } from '@/components/gym-onboarding/OnboardingShell'
import { useGymOnboardingStore } from '@/lib/stores/gymOnboardingStore'
import { useGymOnboardingId } from '@/lib/hooks/useGymOnboardingId'

interface GymSummary {
  name: string
  address: string
  city: string
  state: string
  setup_payout: boolean
}

export default function ReviewScreen() {
  const { gymId } = useGymOnboardingId()
  const reset = useGymOnboardingStore((s) => s.reset)
  const [gym, setGym] = useState<GymSummary | null>(null)
  const [planCount, setPlanCount] = useState(0)
  const [equipmentCount, setEquipmentCount] = useState(0)
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!gymId) return
    Promise.all([
      supabase.from('gyms').select('name, address, city, state, setup_payout').eq('id', gymId).single(),
      supabase.from('membership_plans').select('id', { count: 'exact', head: true }).eq('gym_id', gymId),
      supabase.from('gym_equipment').select('id', { count: 'exact', head: true }).eq('gym_id', gymId),
    ]).then(([gymRes, plansRes, equipmentRes]) => {
      if (gymRes.error) logger.error('gymOnboarding', 'reviewFetch', gymRes.error)
      setGym(gymRes.data ? { ...gymRes.data, setup_payout: Boolean(gymRes.data.setup_payout) } : null)
      setPlanCount(plansRes.count ?? 0)
      setEquipmentCount(equipmentRes.count ?? 0)
      setFetching(false)
    })
  }, [gymId])

  async function handleSubmit() {
    if (!gymId) {
      Alert.alert('Error', 'Missing gym. Please restart onboarding.')
      return
    }
    try {
      setLoading(true)
      const { error } = await supabase
        .from('gyms')
        .update({ setup_submitted: true })
        .eq('id', gymId)
      if (error) throw error

      reset()
      router.replace('/(gym-admin)')
    } catch (err: unknown) {
      logger.error('gymOnboarding', 'submit', err)
      const message = err instanceof Error ? err.message : 'Could not submit for review.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      step={6}
      title="Review & submit."
      subtitle="Our team reviews every new gym before it goes live to members — usually within 24 hours."
      footer={<WButton label="Submit for review" variant="green" onPress={handleSubmit} loading={loading} disabled={fetching} />}
    >
      {fetching ? (
        <ActivityIndicator color={colors.text} style={{ marginTop: 40 }} />
      ) : (
        <View style={{ gap: 12 }}>
          <WCard style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
              Gym
            </Text>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.text, marginBottom: 4 }}>
              {gym?.name}
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted }}>
              {gym?.address}, {gym?.city}, {gym?.state}
            </Text>
          </WCard>

          <WCard style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted }}>Equipment listed</Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>{equipmentCount}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted }}>Membership plans</Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>{planCount}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted }}>Payout account</Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: gym?.setup_payout ? colors.green : colors.amber }}>
                {gym?.setup_payout ? 'Connected' : 'Skipped'}
              </Text>
            </View>
          </WCard>
        </View>
      )}
    </OnboardingShell>
  )
}
