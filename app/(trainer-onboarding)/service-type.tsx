import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { OnboardingShell } from '@/components/gym-onboarding/OnboardingShell'
import { useTrainerOnboardingId } from '@/lib/hooks/useTrainerOnboardingId'
import { ServiceType } from '@/types/database'

const STEPS = ['Basic info', 'Professional info', 'Certifications', 'Bio', 'Pricing', 'Availability', 'Service type', 'Preferred gyms', 'Identity']

const SERVICE_TYPES: { type: 'gym_training' | 'home_training' | 'online_coaching'; label: string }[] = [
  { type: 'gym_training', label: 'Gym training' },
  { type: 'home_training', label: 'Home training' },
  { type: 'online_coaching', label: 'Online coaching' },
]

export default function ServiceTypeScreen() {
  const { trainerId } = useTrainerOnboardingId()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  function toggle(type: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  async function handleNext() {
    if (!trainerId) {
      Alert.alert('Error', 'Missing trainer profile. Please restart onboarding.')
      return
    }
    if (selected.size === 0) {
      Alert.alert('Missing selection', 'Choose at least one service type.')
      return
    }
    try {
      setLoading(true)
      const { error } = await supabase
        .from('trainer_profiles')
        .update({ service_types: Array.from(selected) as ServiceType[], setup_service_type: true })
        .eq('id', trainerId)
      if (error) throw error

      router.push('/(trainer-onboarding)/preferred-gyms')
    } catch (err: unknown) {
      logger.error('trainerOnboarding', 'serviceType', err)
      const message = err instanceof Error ? err.message : 'Could not save service types.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      step={7}
      steps={STEPS}
      title="How do you train members?"
      subtitle="Select all that apply."
      footer={<WButton label="Continue" variant="green" onPress={handleNext} loading={loading} disabled={selected.size === 0} />}
    >
      <View style={{ gap: 12 }}>
        {SERVICE_TYPES.map(({ type, label }) => {
          const isSelected = selected.has(type)
          return (
            <TouchableOpacity
              key={type}
              onPress={() => toggle(type)}
              activeOpacity={0.85}
              style={{
                paddingVertical: 18,
                paddingHorizontal: 18,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: isSelected ? colors.text : colors.border,
                backgroundColor: isSelected ? colors.stone2 : colors.surface,
              }}
            >
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text }}>{label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </OnboardingShell>
  )
}
