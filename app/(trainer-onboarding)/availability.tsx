import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { OnboardingShell } from '@/components/gym-onboarding/OnboardingShell'
import { useTrainerOnboardingId } from '@/lib/hooks/useTrainerOnboardingId'
import { TimeBlock } from '@/types/database'

const STEPS = ['Basic info', 'Professional info', 'Certifications', 'Bio', 'Pricing', 'Availability', 'Service type', 'Preferred gyms', 'Identity']

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIME_BLOCKS: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening']

interface DayState {
  isAvailable: boolean
  timeBlocks: Set<string>
}

function initialDays(): DayState[] {
  return DAYS.map(() => ({ isAvailable: false, timeBlocks: new Set<string>() }))
}

export default function AvailabilityScreen() {
  const { trainerId } = useTrainerOnboardingId()
  const [days, setDays] = useState<DayState[]>(initialDays())
  const [loading, setLoading] = useState(false)

  function toggleDay(index: number) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, isAvailable: !d.isAvailable } : d)))
  }

  function toggleBlock(index: number, block: string) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d
        const next = new Set(d.timeBlocks)
        if (next.has(block)) next.delete(block)
        else next.add(block)
        return { ...d, timeBlocks: next }
      })
    )
  }

  async function handleNext() {
    if (!trainerId) {
      Alert.alert('Error', 'Missing trainer profile. Please restart onboarding.')
      return
    }
    try {
      setLoading(true)
      const rows = days.map((d, dayOfWeek) => ({
        trainer_id: trainerId,
        day_of_week: dayOfWeek,
        is_available: d.isAvailable,
        time_blocks: Array.from(d.timeBlocks) as TimeBlock[],
      }))
      const { error } = await supabase.from('trainer_availability').insert(rows)
      if (error) throw error

      const { error: profileError } = await supabase
        .from('trainer_profiles')
        .update({ setup_availability: true })
        .eq('id', trainerId)
      if (profileError) throw profileError

      router.push('/(trainer-onboarding)/service-type')
    } catch (err: unknown) {
      logger.error('trainerOnboarding', 'availability', err)
      const message = err instanceof Error ? err.message : 'Could not save availability.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      step={6}
      steps={STEPS}
      title="Set your availability."
      subtitle="Pick which days and times you're generally free to train."
      footer={<WButton label="Continue" variant="green" onPress={handleNext} loading={loading} />}
    >
      <View style={{ gap: 16 }}>
        {DAYS.map((label, i) => {
          const day = days[i]
          return (
            <View
              key={label}
              style={{
                padding: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                gap: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => toggleDay(i)}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text }}>{label}</Text>
                <View
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: day.isAvailable ? colors.green : colors.stone2,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 12,
                      color: day.isAvailable ? colors.onAccent : colors.textMuted,
                    }}
                  >
                    {day.isAvailable ? 'Available' : 'Off'}
                  </Text>
                </View>
              </TouchableOpacity>
              {day.isAvailable && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {TIME_BLOCKS.map((block) => {
                    const isSelected = day.timeBlocks.has(block)
                    return (
                      <TouchableOpacity
                        key={block}
                        onPress={() => toggleBlock(i, block)}
                        activeOpacity={0.8}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 999,
                          borderWidth: 1.5,
                          borderColor: isSelected ? colors.text : colors.border,
                          backgroundColor: isSelected ? colors.stone2 : colors.bg,
                        }}
                      >
                        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.text, textTransform: 'capitalize' }}>
                          {block}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
            </View>
          )
        })}
      </View>
    </OnboardingShell>
  )
}
