import { useState } from 'react'
import { View, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { WButton } from '@/components/ui/WButton'
import { WInput } from '@/components/ui/WInput'
import { OnboardingShell } from '@/components/gym-onboarding/OnboardingShell'
import { useTrainerOnboardingId } from '@/lib/hooks/useTrainerOnboardingId'

const STEPS = ['Basic info', 'Professional info', 'Certifications', 'Bio', 'Pricing', 'Availability', 'Service type', 'Preferred gyms', 'Identity']

const PRICING_TYPES: { type: 'per_session' | 'weekly' | 'monthly'; label: string }[] = [
  { type: 'per_session', label: 'Per session' },
  { type: 'weekly', label: 'Weekly' },
  { type: 'monthly', label: 'Monthly' },
]

export default function PricingScreen() {
  const { trainerId } = useTrainerOnboardingId()
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function setAmount(type: string, value: string) {
    setAmounts((prev) => ({ ...prev, [type]: value }))
  }

  async function handleNext() {
    if (!trainerId) {
      Alert.alert('Error', 'Missing trainer profile. Please restart onboarding.')
      return
    }
    const rows = PRICING_TYPES.filter(({ type }) => amounts[type]?.trim()).map(({ type }) => ({
      trainer_id: trainerId,
      pricing_type: type,
      amount_naira: Number(amounts[type].trim()),
    }))
    if (rows.length === 0) {
      Alert.alert('Missing pricing', 'Add at least one pricing option.')
      return
    }
    try {
      setLoading(true)
      const { error } = await supabase.from('trainer_pricing').insert(rows)
      if (error) throw error

      const { error: profileError } = await supabase
        .from('trainer_profiles')
        .update({ setup_pricing: true })
        .eq('id', trainerId)
      if (profileError) throw profileError

      router.push('/(trainer-onboarding)/availability')
    } catch (err: unknown) {
      logger.error('trainerOnboarding', 'pricing', err)
      const message = err instanceof Error ? err.message : 'Could not save pricing.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      step={5}
      steps={STEPS}
      title="Set your pricing."
      subtitle="Add at least one pricing option in naira."
      footer={<WButton label="Continue" variant="green" onPress={handleNext} loading={loading} />}
    >
      <View style={{ gap: 16 }}>
        {PRICING_TYPES.map(({ type, label }) => (
          <WInput
            key={type}
            label={`${label} (₦)`}
            value={amounts[type] ?? ''}
            onChangeText={(v) => setAmount(type, v)}
            placeholder="e.g. 15000"
            keyboardType="number-pad"
          />
        ))}
      </View>
    </OnboardingShell>
  )
}
