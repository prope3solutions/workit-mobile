import { useMemo, useState } from 'react'
import { View, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { WButton } from '@/components/ui/WButton'
import { WInput } from '@/components/ui/WInput'
import { WSelect } from '@/components/ui/WSelect'
import { OnboardingShell } from '@/components/gym-onboarding/OnboardingShell'
import { useGymOnboardingStore } from '@/lib/stores/gymOnboardingStore'
import { NIGERIAN_STATES, CITIES_BY_STATE } from '@/lib/constants/nigeria'

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function GymDetailsScreen() {
  const setGymId = useGymOnboardingStore((s) => s.setGymId)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const cityOptions = useMemo(() => (state ? CITIES_BY_STATE[state] ?? [] : []), [state])

  function handleStateChange(newState: string) {
    setState(newState)
    setCity('')
  }

  async function handleNext() {
    if (!name.trim() || !address.trim() || !city.trim() || !state.trim()) {
      Alert.alert('Missing fields', 'Gym name, address, city and state are required.')
      return
    }
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No session found')

      const slug = `${slugify(name)}-${user.id.slice(0, 6)}`

      const { data: gym, error: gymError } = await supabase
        .from('gyms')
        .insert({
          name: name.trim(),
          slug,
          description: description.trim() || null,
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          phone: phone.trim() || null,
          created_by: user.id,
          setup_gym_details: true,
        })
        .select('id')
        .single()
      if (gymError) throw gymError

      const { error: adminError } = await supabase
        .from('gym_admins')
        .insert({ gym_id: gym.id, user_id: user.id, admin_role: 'owner' })
      if (adminError) throw adminError

      const { error: userError } = await supabase.from('users').upsert({
        id: user.id,
        email: user.email ?? '',
        role: 'gym_admin',
        full_name: user.user_metadata?.full_name ?? null,
        phone: null,
      })
      if (userError) throw userError

      setGymId(gym.id)
      router.push('/(gym-onboarding)/equipment')
    } catch (err: unknown) {
      logger.error('gymOnboarding', 'gymDetails', err)
      const message = err instanceof Error ? err.message : 'Could not save gym details.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      step={1}
      title="Tell us about your gym."
      subtitle="This is what members will see when they discover you."
      footer={
        <WButton label="Continue" variant="green" onPress={handleNext} loading={loading} disabled={!name.trim() || !address.trim() || !city.trim() || !state.trim()} />
      }
    >
      <View style={{ gap: 16 }}>
        <WInput label="Gym name" value={name} onChangeText={setName} placeholder="e.g. Forge Gym" autoCapitalize="words" />
        <WInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What makes your gym stand out?"
          multiline
          numberOfLines={3}
        />
        <WInput label="Address" value={address} onChangeText={setAddress} placeholder="e.g. 15 Adeola Odeku Street" autoCapitalize="words" />
        <WSelect label="State" value={state} onChange={handleStateChange} options={NIGERIAN_STATES as unknown as string[]} placeholder="Select state" />
        <WSelect label="City" value={city} onChange={setCity} options={cityOptions} placeholder={state ? 'Select city' : 'Select a state first'} />
        <WInput label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="+234 801 234 5678" keyboardType="phone-pad" />
      </View>
    </OnboardingShell>
  )
}
