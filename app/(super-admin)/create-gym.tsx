import { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, Alert, ScrollView, Share } from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { WInput } from '@/components/ui/WInput'
import { WSelect } from '@/components/ui/WSelect'
import { WButton } from '@/components/ui/WButton'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { NIGERIAN_STATES, CITIES_BY_STATE } from '@/lib/constants/nigeria'

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function randomToken() {
  return Array.from({ length: 24 }, () => Math.random().toString(36)[2] ?? '0').join('')
}

export default function CreateGymScreen() {
  const colors = useColors()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [goLive, setGoLive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [claimLink, setClaimLink] = useState<string | null>(null)

  const cityOptions = useMemo(() => (state ? CITIES_BY_STATE[state] ?? [] : []), [state])

  function handleStateChange(newState: string) {
    setState(newState)
    setCity('')
  }

  const canSubmit = name.trim().length > 0 && address.trim().length > 0 && !!city && !!state

  async function handleCreate() {
    if (!canSubmit) return
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No session found')

      const claimToken = randomToken()
      const slug = `${slugify(name)}-${claimToken.slice(0, 6)}`

      const { data: gym, error } = await supabase
        .from('gyms')
        .insert({
          name: name.trim(),
          slug,
          address: address.trim(),
          city,
          state,
          phone: phone.trim() || null,
          email: email.trim() || null,
          is_active: goLive,
          setup_gym_details: true,
          setup_submitted: true,
          claim_token: claimToken,
          created_by: user.id,
        })
        .select('id')
        .single()
      if (error) throw error

      setClaimLink(`https://workit.prope3.com/claim-gym?token=${claimToken}`)
    } catch (err: unknown) {
      logger.error('superAdmin', 'createGym', err)
      const message = err instanceof Error ? err.message : 'Could not create this gym.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  async function handleShareLink() {
    if (!claimLink) return
    await Share.share({ message: `Your WorkIt gym profile is ready. Claim it here: ${claimLink}` })
  }

  if (claimLink) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.obsidian, padding: 24, paddingTop: 80 }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 24, color: colors.white, marginBottom: 8 }}>
          {name} is set up.
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.slate, marginBottom: 28, lineHeight: 20 }}>
          Send this link to the gym owner. They'll set their password and take over the profile from here.
        </Text>

        <View style={{ backgroundColor: colors.deep, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 13, color: colors.green }} selectable>
            {claimLink}
          </Text>
        </View>

        <WButton label="Share link" variant="green" onPress={handleShareLink} style={{ marginBottom: 12 }} />
        <WButton label="Done" variant="outline" onPress={() => router.replace('/(super-admin)/gyms')} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={colors.white} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.white }}>Add a gym</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.slate, lineHeight: 19, marginBottom: 4 }}>
          Set up a gym's profile yourself before its owner joins. You'll get a link to hand off once you're done.
        </Text>

        <WInput label="Gym name" value={name} onChangeText={setName} placeholder="e.g. Forge Gym" autoCapitalize="words" />
        <WInput label="Address" value={address} onChangeText={setAddress} placeholder="e.g. 15 Adeola Odeku Street" autoCapitalize="words" />
        <WSelect label="State" value={state} onChange={handleStateChange} options={NIGERIAN_STATES as unknown as string[]} placeholder="Select state" />
        <WSelect label="City" value={city} onChange={setCity} options={cityOptions} placeholder={state ? 'Select city' : 'Select a state first'} />
        <WInput label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="+234 801 234 5678" keyboardType="phone-pad" />
        <WInput label="Email (optional)" value={email} onChangeText={setEmail} placeholder="gym@email.com" keyboardType="email-address" autoCapitalize="none" />

        <TouchableOpacity
          onPress={() => setGoLive((v) => !v)}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: colors.deep, borderRadius: 12, padding: 16, marginTop: 4,
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.white }}>
              {goLive ? 'Goes live immediately' : 'Saved as inactive'}
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.slate, marginTop: 2 }}>
              {goLive ? 'Visible on Discover right away.' : 'You can activate it later from the gyms list.'}
            </Text>
          </View>
          <View
            style={{
              width: 44, height: 24, borderRadius: 12,
              backgroundColor: goLive ? colors.green : colors.adminBorder,
              justifyContent: 'center',
            }}
          >
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.white, marginLeft: goLive ? 23 : 3 }} />
          </View>
        </TouchableOpacity>

        <WButton label="Create gym" variant="green" onPress={handleCreate} loading={loading} disabled={!canSubmit} style={{ marginTop: 8 }} />
      </ScrollView>
    </View>
  )
}
