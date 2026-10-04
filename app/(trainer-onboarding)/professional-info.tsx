import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { WInput } from '@/components/ui/WInput'
import { OnboardingShell } from '@/components/gym-onboarding/OnboardingShell'
import { useTrainerOnboardingId } from '@/lib/hooks/useTrainerOnboardingId'
import { TRAINER_SPECIALIZATIONS } from '@/lib/constants/trainerSpecializations'
import { Plus } from 'lucide-react-native'

const STEPS = ['Basic info', 'Professional info', 'Certifications', 'Bio', 'Pricing', 'Availability', 'Service type', 'Preferred gyms', 'Identity']

export default function ProfessionalInfoScreen() {
  const { trainerId } = useTrainerOnboardingId()
  const [yearsExperience, setYearsExperience] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [customInput, setCustomInput] = useState('')
  const [customSpecs, setCustomSpecs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  function toggle(spec: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(spec)) next.delete(spec)
      else next.add(spec)
      return next
    })
  }

  function addCustom() {
    const val = customInput.trim()
    if (!val) return
    if ([...TRAINER_SPECIALIZATIONS, ...customSpecs].some(s => s.toLowerCase() === val.toLowerCase())) {
      setCustomInput('')
      return
    }
    setCustomSpecs(prev => [...prev, val])
    setSelected(prev => new Set([...prev, val]))
    setCustomInput('')
  }

  function removeCustom(spec: string) {
    setCustomSpecs(prev => prev.filter(s => s !== spec))
    setSelected(prev => { const n = new Set(prev); n.delete(spec); return n })
  }

  async function handleNext() {
    if (!trainerId) {
      Alert.alert('Error', 'Missing trainer profile. Please restart onboarding.')
      return
    }
    try {
      setLoading(true)
      const { error } = await supabase
        .from('trainer_profiles')
        .update({
          years_experience: yearsExperience.trim() ? Number(yearsExperience.trim()) : null,
          specializations: Array.from(selected),
          setup_professional_info: true,
        })
        .eq('id', trainerId)
      if (error) throw error

      router.push('/(trainer-onboarding)/certifications')
    } catch (err: unknown) {
      logger.error('trainerOnboarding', 'professionalInfo', err)
      const message = err instanceof Error ? err.message : 'Could not save professional info.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      step={2}
      steps={STEPS}
      title="Your professional background."
      subtitle="Helps members understand your expertise."
      footer={<WButton label="Continue" variant="green" onPress={handleNext} loading={loading} />}
    >
      <View style={{ gap: 16 }}>
        <WInput
          label="Years of experience"
          value={yearsExperience}
          onChangeText={(v) => setYearsExperience(v.replace(/\D/g, ''))}
          placeholder="e.g. 5"
          keyboardType="number-pad"
        />

        <View>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.textMuted, marginBottom: 10 }}>
            Specializations
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TRAINER_SPECIALIZATIONS.map((spec) => {
              const isSelected = selected.has(spec)
              return (
                <TouchableOpacity
                  key={spec}
                  onPress={() => toggle(spec)}
                  activeOpacity={0.8}
                  style={{
                    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.text : colors.border,
                    backgroundColor: isSelected ? colors.stone2 : colors.surface,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.text }}>{spec}</Text>
                </TouchableOpacity>
              )
            })}
            {/* Custom specializations */}
            {customSpecs.map((spec) => (
              <TouchableOpacity
                key={spec}
                onPress={() => removeCustom(spec)}
                activeOpacity={0.8}
                style={{
                  paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: colors.green,
                  backgroundColor: `${colors.green}15`,
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.greenDeep }}>{spec}</Text>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.greenDeep }}>×</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Add custom */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <View style={{
              flex: 1, flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface, borderRadius: 10,
              borderWidth: 1.5, borderColor: colors.border,
              paddingHorizontal: 12, height: 44,
            }}>
              <TextInput
                value={customInput}
                onChangeText={setCustomInput}
                onSubmitEditing={addCustom}
                placeholder="Add your own (e.g. Dance Fitness)"
                placeholderTextColor={colors.textFaint}
                style={{ flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.text }}
                returnKeyType="done"
              />
            </View>
            <TouchableOpacity
              onPress={addCustom}
              activeOpacity={0.8}
              style={{
                width: 44, height: 44, borderRadius: 10,
                backgroundColor: customInput.trim() ? colors.text : colors.stone2,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Plus size={18} color={customInput.trim() ? colors.chalk : colors.textFaint} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textFaint, marginTop: 6 }}>
            Don't see yours? Type it above and tap +
          </Text>
        </View>
      </View>
    </OnboardingShell>
  )
}
