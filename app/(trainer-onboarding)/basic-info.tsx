import { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { WInput } from '@/components/ui/WInput'
import { WSelect } from '@/components/ui/WSelect'
import { OnboardingShell } from '@/components/gym-onboarding/OnboardingShell'
import { useTrainerOnboardingStore } from '@/lib/stores/trainerOnboardingStore'
import { NIGERIAN_STATES, CITIES_BY_STATE } from '@/lib/constants/nigeria'
import { uploadTrainerAsset } from '@/lib/upload/uploadTrainerAsset'

const STEPS = ['Basic info', 'Professional info', 'Certifications', 'Bio', 'Pricing', 'Availability', 'Service type', 'Preferred gyms', 'Identity']

export default function BasicInfoScreen() {
  const setTrainerId = useTrainerOnboardingStore((s) => s.setTrainerId)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [loading, setLoading] = useState(false)

  const cityOptions = useMemo(() => (state ? CITIES_BY_STATE[state] ?? [] : []), [state])

  function handleStateChange(newState: string) {
    setState(newState)
    setCity('')
  }

  async function handlePickPhoto() {
    try {
      setUploadingPhoto(true)
      const result = await uploadTrainerAsset('photo')
      if (result) {
        setPhotoPath(result.path)
        setPhotoUri(supabase.storage.from(result.bucket).getPublicUrl(result.path).data.publicUrl)
      }
    } catch (err: unknown) {
      logger.error('trainerOnboarding', 'pickPhoto', err)
      Alert.alert('Error', 'Could not upload photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleNext() {
    if (!firstName.trim() || !lastName.trim() || !displayName.trim() || !phone.trim()) {
      Alert.alert('Missing fields', 'First name, last name, display name and phone are required.')
      return
    }
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No session found')

      const { data, error } = await supabase
        .from('trainer_profiles')
        .insert({
          user_id: user.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          display_name: displayName.trim(),
          photo_url: photoPath,
          date_of_birth: dateOfBirth.trim() || null,
          gender: gender ? (gender as 'male' | 'female' | 'prefer_not_to_say') : null,
          phone: phone.trim(),
          email: user.email ?? '',
          city: city.trim() || null,
          state: state.trim() || null,
          setup_basic_info: true,
        })
        .select('id')
        .single()
      if (error) throw error

      const { error: userError } = await supabase.from('users').upsert({
        id: user.id,
        email: user.email ?? '',
        role: 'trainer',
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        phone: phone.trim() || null,
      })
      if (userError) throw userError

      setTrainerId(data.id)
      router.push('/(trainer-onboarding)/professional-info')
    } catch (err: unknown) {
      logger.error('trainerOnboarding', 'basicInfo', err)
      const message = err instanceof Error ? err.message : 'Could not save your details.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      step={1}
      steps={STEPS}
      title="Tell us about yourself."
      subtitle="This is what members will see on your trainer profile."
      footer={
        <WButton
          label="Continue"
          variant="green"
          onPress={handleNext}
          loading={loading}
          disabled={!firstName.trim() || !lastName.trim() || !displayName.trim() || !phone.trim()}
        />
      }
    >
      <View style={{ gap: 16 }}>
        <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8} style={{ alignSelf: 'center', marginBottom: 8 }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: colors.surface,
              borderWidth: 1.5,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: 96, height: 96 }} />
            ) : (
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.textMuted }}>
                {uploadingPhoto ? 'Uploading...' : 'Add photo'}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <WInput label="First name" value={firstName} onChangeText={setFirstName} placeholder="e.g. Ada" autoCapitalize="words" />
        <WInput label="Last name" value={lastName} onChangeText={setLastName} placeholder="e.g. Nwosu" autoCapitalize="words" />
        <WInput label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="How members will see you" autoCapitalize="words" />
        <WInput label="Phone" value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 11))} placeholder="08012345678" keyboardType="phone-pad" maxLength={11} />
        <WInput label="Date of birth (optional)" value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" />
        <WSelect
          label="Gender (optional)"
          value={gender}
          onChange={setGender}
          options={['male', 'female', 'prefer_not_to_say']}
          placeholder="Select gender"
        />
        <WSelect label="State" value={state} onChange={handleStateChange} options={NIGERIAN_STATES as unknown as string[]} placeholder="Select state" />
        <WSelect label="City" value={city} onChange={setCity} options={cityOptions} placeholder={state ? 'Select city' : 'Select a state first'} />
      </View>
    </OnboardingShell>
  )
}
