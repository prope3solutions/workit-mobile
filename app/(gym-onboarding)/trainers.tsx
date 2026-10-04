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

interface TrainerDraft {
  fullName: string
  monthlyFeeNaira: string
}

export default function TrainersScreen() {
  const { gymId } = useGymOnboardingId()
  const [trainers, setTrainers] = useState<TrainerDraft[]>([{ fullName: '', monthlyFeeNaira: '' }])
  const [loading, setLoading] = useState(false)

  function updateTrainer(index: number, field: keyof TrainerDraft, value: string) {
    setTrainers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)))
  }

  function addTrainer() {
    setTrainers((prev) => [...prev, { fullName: '', monthlyFeeNaira: '' }])
  }

  function removeTrainer(index: number) {
    setTrainers((prev) => prev.filter((_, i) => i !== index))
  }

  const validTrainers = trainers.filter((t) => t.fullName.trim() && t.monthlyFeeNaira.trim())

  async function markDoneAndContinue() {
    if (!gymId) {
      Alert.alert('Error', 'Missing gym. Please restart onboarding.')
      return
    }
    try {
      setLoading(true)
      if (validTrainers.length > 0) {
        const rows = validTrainers.map((t) => ({
          gym_id: gymId,
          full_name: t.fullName.trim(),
          monthly_fee_naira: parseInt(t.monthlyFeeNaira, 10),
        }))
        const { error } = await supabase.from('trainers').insert(rows)
        if (error) throw error
      }

      const { error: gymError } = await supabase
        .from('gyms')
        .update({ setup_trainers: true })
        .eq('id', gymId)
      if (gymError) throw gymError

      router.push('/(gym-onboarding)/payout')
    } catch (err: unknown) {
      logger.error('gymOnboarding', 'trainers', err)
      const message = err instanceof Error ? err.message : 'Could not save trainers.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      step={4}
      title="Add your trainers."
      subtitle="Optional — you can add or invite trainers later."
      footer={
        <View style={{ gap: 12 }}>
          <WButton label="Continue" variant="green" onPress={markDoneAndContinue} loading={loading} />
          <WButton label="Skip for now" variant="ghost" onPress={markDoneAndContinue} disabled={loading} />
        </View>
      }
    >
      <View style={{ gap: 12 }}>
        {trainers.map((trainer, index) => (
          <WCard key={index} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.textMuted }}>
                Trainer {index + 1}
              </Text>
              {trainers.length > 1 && (
                <TouchableOpacity onPress={() => removeTrainer(index)}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.ember }}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ gap: 12 }}>
              <WInput
                label="Full name"
                value={trainer.fullName}
                onChangeText={(v) => updateTrainer(index, 'fullName', v)}
                placeholder="e.g. Chidi Okafor"
                autoCapitalize="words"
              />
              <WInput
                label="Monthly fee (₦)"
                value={trainer.monthlyFeeNaira}
                onChangeText={(v) => updateTrainer(index, 'monthlyFeeNaira', v.replace(/[^0-9]/g, ''))}
                placeholder="15000"
                keyboardType="number-pad"
              />
            </View>
          </WCard>
        ))}
      </View>

      <TouchableOpacity onPress={addTrainer} style={{ marginTop: 16, alignSelf: 'flex-start' }}>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>
          + Add another trainer
        </Text>
      </TouchableOpacity>
    </OnboardingShell>
  )
}
