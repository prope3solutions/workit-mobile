import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { WInput } from '@/components/ui/WInput'
import { WCard } from '@/components/ui/WCard'
import { OnboardingShell } from '@/components/gym-onboarding/OnboardingShell'
import { useGymOnboardingId } from '@/lib/hooks/useGymOnboardingId'

interface PlanDraft {
  name: string
  priceNaira: string
  durationDays: string
}

const TEMPLATES: PlanDraft[] = [
  { name: 'Day Pass', priceNaira: '2000', durationDays: '1' },
  { name: 'Monthly', priceNaira: '25000', durationDays: '30' },
  { name: 'Quarterly', priceNaira: '65000', durationDays: '90' },
]

export default function PlansScreen() {
  const { gymId } = useGymOnboardingId()
  const [plans, setPlans] = useState<PlanDraft[]>([{ name: '', priceNaira: '', durationDays: '' }])
  const [loading, setLoading] = useState(false)

  function updatePlan(index: number, field: keyof PlanDraft, value: string) {
    setPlans((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  function addPlan() {
    setPlans((prev) => [...prev, { name: '', priceNaira: '', durationDays: '' }])
  }

  function removePlan(index: number) {
    setPlans((prev) => prev.filter((_, i) => i !== index))
  }

  function useTemplates() {
    setPlans(TEMPLATES)
  }

  const validPlans = plans.filter((p) => p.name.trim() && p.priceNaira.trim() && p.durationDays.trim())

  async function handleNext() {
    if (!gymId) {
      Alert.alert('Error', 'Missing gym. Please restart onboarding.')
      return
    }
    if (validPlans.length === 0) {
      Alert.alert('Add a plan', 'You need at least one membership plan before you can accept members.')
      return
    }
    try {
      setLoading(true)
      const rows = validPlans.map((p) => ({
        gym_id: gymId,
        name: p.name.trim(),
        price_naira: parseInt(p.priceNaira, 10),
        duration_days: parseInt(p.durationDays, 10),
      }))
      const { error } = await supabase.from('membership_plans').insert(rows)
      if (error) throw error

      const { error: gymError } = await supabase
        .from('gyms')
        .update({ setup_plans: true })
        .eq('id', gymId)
      if (gymError) throw gymError

      router.push('/(gym-onboarding)/trainers')
    } catch (err: unknown) {
      logger.error('gymOnboarding', 'plans', err)
      const message = err instanceof Error ? err.message : 'Could not save plans.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      step={3}
      title="Set your membership plans."
      subtitle="You need at least one plan so members can join."
      footer={
        <WButton label="Continue" variant="green" onPress={handleNext} loading={loading} disabled={validPlans.length === 0} />
      }
    >
      <TouchableOpacity onPress={useTemplates} style={{ marginBottom: 20 }}>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.text, textDecorationLine: 'underline' }}>
          Use suggested plans (Day / Monthly / Quarterly)
        </Text>
      </TouchableOpacity>

      <View style={{ gap: 12 }}>
        {plans.map((plan, index) => (
          <WCard key={index} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.textMuted }}>
                Plan {index + 1}
              </Text>
              {plans.length > 1 && (
                <TouchableOpacity onPress={() => removePlan(index)}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.ember }}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ gap: 12 }}>
              <WInput
                label="Plan name"
                value={plan.name}
                onChangeText={(v) => updatePlan(index, 'name', v)}
                placeholder="e.g. Monthly"
                autoCapitalize="words"
              />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <WInput
                    label="Price (₦)"
                    value={plan.priceNaira}
                    onChangeText={(v) => updatePlan(index, 'priceNaira', v.replace(/[^0-9]/g, ''))}
                    placeholder="25000"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <WInput
                    label="Duration (days)"
                    value={plan.durationDays}
                    onChangeText={(v) => updatePlan(index, 'durationDays', v.replace(/[^0-9]/g, ''))}
                    placeholder="30"
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>
          </WCard>
        ))}
      </View>

      <TouchableOpacity onPress={addPlan} style={{ marginTop: 16, alignSelf: 'flex-start' }}>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>
          + Add another plan
        </Text>
      </TouchableOpacity>
    </OnboardingShell>
  )
}
