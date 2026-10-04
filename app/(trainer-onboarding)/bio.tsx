import { useEffect, useState } from 'react'
import { View, Text, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { WInput } from '@/components/ui/WInput'
import { OnboardingShell } from '@/components/gym-onboarding/OnboardingShell'
import { useTrainerOnboardingId } from '@/lib/hooks/useTrainerOnboardingId'

const STEPS = ['Basic info', 'Professional info', 'Certifications', 'Bio', 'Pricing', 'Availability', 'Service type', 'Preferred gyms', 'Identity']
const MAX_LENGTH = 500

function buildSampleBio(specs: string[], yearsExp: number | null): string {
  const topSpecs = specs.slice(0, 2)
  const specText = topSpecs.length > 0
    ? topSpecs.join(' & ').toLowerCase()
    : 'fitness'
  const expText = yearsExp && yearsExp > 0
    ? `With ${yearsExp}+ years of experience`
    : 'As a dedicated trainer'
  return `${expText} in ${specText}, I help clients break limits and build habits that stick. My sessions are challenging, intentional, and tailored to where you are — whether you're just starting or pushing to the next level. Let's build something real together.`
}

export default function BioScreen() {
  const { trainerId } = useTrainerOnboardingId()
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!trainerId) return
    supabase
      .from('trainer_profiles')
      .select('specializations, years_experience')
      .eq('id', trainerId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const specs: string[] = data.specializations ?? []
          const sample = buildSampleBio(specs, data.years_experience)
          setBio(sample)
        }
      })
  }, [trainerId])

  async function handleNext() {
    if (!trainerId) {
      Alert.alert('Error', 'Missing trainer profile. Please restart onboarding.')
      return
    }
    try {
      setLoading(true)
      const { error } = await supabase
        .from('trainer_profiles')
        .update({ bio: bio.trim() || null, setup_bio: true })
        .eq('id', trainerId)
      if (error) throw error

      router.push('/(trainer-onboarding)/pricing')
    } catch (err: unknown) {
      logger.error('trainerOnboarding', 'bio', err)
      const message = err instanceof Error ? err.message : 'Could not save your bio.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      step={4}
      steps={STEPS}
      title="Write a short bio."
      subtitle="We've drafted one for you — edit it to make it yours."
      footer={<WButton label="Continue" variant="green" onPress={handleNext} loading={loading} />}
    >
      <View style={{ gap: 8 }}>
        <WInput
          value={bio}
          onChangeText={(v) => setBio(v.slice(0, MAX_LENGTH))}
          placeholder="Share your training philosophy, experience and what members can expect..."
          multiline
          numberOfLines={6}
        />
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textFaint, textAlign: 'right' }}>
          {bio.length}/{MAX_LENGTH}
        </Text>
      </View>
    </OnboardingShell>
  )
}
