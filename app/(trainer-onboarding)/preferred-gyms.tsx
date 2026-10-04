import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { OnboardingShell } from '@/components/gym-onboarding/OnboardingShell'
import { useTrainerOnboardingId } from '@/lib/hooks/useTrainerOnboardingId'

const STEPS = ['Basic info', 'Professional info', 'Certifications', 'Bio', 'Pricing', 'Availability', 'Service type', 'Preferred gyms', 'Identity']

interface GymItem {
  id: string
  name: string
}

export default function PreferredGymsScreen() {
  const { trainerId } = useTrainerOnboardingId()
  const [gyms, setGyms] = useState<GymItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [independent, setIndependent] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase
      .from('gyms')
      .select('id, name')
      .eq('is_active', true)
      .then(({ data, error }) => {
        if (error) logger.error('trainerOnboarding', 'fetchGyms', error)
        setGyms(data ?? [])
        setFetching(false)
      })
  }, [])

  function toggle(id: string) {
    setIndependent(false)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleIndependent() {
    setSelected(new Set())
    setIndependent((prev) => !prev)
  }

  async function handleNext() {
    if (!trainerId) {
      Alert.alert('Error', 'Missing trainer profile. Please restart onboarding.')
      return
    }
    try {
      setLoading(true)
      if (selected.size > 0) {
        const rows = Array.from(selected).map((gym_id) => ({ trainer_id: trainerId, gym_id }))
        const { error } = await supabase.from('trainer_gym_affiliations').insert(rows)
        if (error) throw error
      }

      const { error: profileError } = await supabase
        .from('trainer_profiles')
        .update({ is_independent: independent, setup_gyms: true })
        .eq('id', trainerId)
      if (profileError) throw profileError

      router.push('/(trainer-onboarding)/identity')
    } catch (err: unknown) {
      logger.error('trainerOnboarding', 'preferredGyms', err)
      const message = err instanceof Error ? err.message : 'Could not save preferred gyms.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  const canContinue = selected.size > 0 || independent

  return (
    <OnboardingShell
      step={8}
      steps={STEPS}
      title="Where do you train?"
      subtitle="Pick the gyms you work with, or tell us you train independently."
      footer={
        <WButton
          label={selected.size > 0 ? `Continue (${selected.size} selected)` : 'Continue'}
          variant="green"
          onPress={handleNext}
          loading={loading}
          disabled={!canContinue}
        />
      }
    >
      <View style={{ gap: 16 }}>
        <TouchableOpacity
          onPress={toggleIndependent}
          activeOpacity={0.85}
          style={{
            paddingVertical: 16,
            paddingHorizontal: 18,
            borderRadius: 14,
            borderWidth: 2,
            borderColor: independent ? colors.text : colors.border,
            backgroundColor: independent ? colors.stone2 : colors.surface,
          }}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text }}>
            I train independently
          </Text>
        </TouchableOpacity>

        {fetching ? (
          <ActivityIndicator color={colors.text} style={{ marginTop: 20 }} />
        ) : (
          <View style={{ gap: 10 }}>
            {gyms.map((gym) => {
              const isSelected = selected.has(gym.id)
              return (
                <TouchableOpacity
                  key={gym.id}
                  onPress={() => toggle(gym.id)}
                  activeOpacity={0.85}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.text : colors.border,
                    backgroundColor: isSelected ? colors.stone2 : colors.surface,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>{gym.name}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </View>
    </OnboardingShell>
  )
}
