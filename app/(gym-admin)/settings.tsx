import { useCallback, useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { ArrowLeft, Plus, LogOut } from 'lucide-react-native'
import { colors } from '@/lib/theme/colors'
import { WCard } from '@/components/ui/WCard'
import { WInput } from '@/components/ui/WInput'
import { WButton } from '@/components/ui/WButton'
import { WSelect } from '@/components/ui/WSelect'
import { WBadge } from '@/components/ui/WBadge'
import { LogoutOverlay } from '@/components/shared/LogoutOverlay'
import { useAuthStore } from '@/lib/stores/authStore'
import { useAuth } from '@/lib/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { NIGERIAN_STATES, CITIES_BY_STATE } from '@/lib/constants/nigeria'

interface GymProfile {
  id: string
  name: string
  description: string
  address: string
  city: string
  state: string
  phone: string
  email: string
  is_active: boolean
}

interface Plan {
  id: string
  name: string
  price_naira: number
  duration_days: number
  is_active: boolean
}

export default function GymSettingsScreen() {
  const user = useAuthStore((s) => s.user)
  const { signOut } = useAuth()
  const [gym, setGym] = useState<GymProfile | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [showLogout, setShowLogout] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const [planName, setPlanName] = useState('')
  const [planPrice, setPlanPrice] = useState('')
  const [planDuration, setPlanDuration] = useState('30')
  const [savingPlan, setSavingPlan] = useState(false)

  const cityOptions = useMemo(() => (state ? CITIES_BY_STATE[state] ?? [] : []), [state])

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    try {
      // Step 1: get the gym_id for this admin
      const { data: adminRow, error: adminError } = await supabase
        .from('gym_admins')
        .select('gym_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (adminError) throw adminError
      const gymId = adminRow?.gym_id
      if (!gymId) {
        setLoading(false)
        return
      }

      // Step 2: fetch gym and plans in parallel (avoids nested join RLS issues)
      const [gymRes, plansRes] = await Promise.all([
        supabase
          .from('gyms')
          .select('id, name, description, address, city, state, phone, email, is_active')
          .eq('id', gymId)
          .maybeSingle(),
        supabase
          .from('membership_plans')
          .select('id, name, price_naira, duration_days, is_active')
          .eq('gym_id', gymId)
          .order('price_naira', { ascending: true }),
      ])
      if (gymRes.error) throw gymRes.error
      if (plansRes.error) throw plansRes.error

      const g = gymRes.data
      if (!g) {
        setLoading(false)
        return
      }

      setGym({
        id: g.id,
        name: g.name,
        description: g.description ?? '',
        address: g.address,
        city: g.city,
        state: g.state,
        phone: g.phone ?? '',
        email: g.email ?? '',
        is_active: Boolean(g.is_active),
      })
      setName(g.name)
      setDescription(g.description ?? '')
      setAddress(g.address)
      setCity(g.city)
      setState(g.state)
      setPhone(g.phone ?? '')
      setEmail(g.email ?? '')
      setPlans((plansRes.data ?? []).map((plan) => ({ ...plan, is_active: Boolean(plan.is_active) })))
    } catch (err) {
      logger.error('gymAdmin', 'fetchGymSettings', err)
      const msg = err instanceof Error ? err.message : String(err)
      setLoadError(msg)
    } finally {
      setLoading(false)
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  function handleStateChange(newState: string) {
    setState(newState)
    setCity('')
  }

  async function handleSaveProfile() {
    if (!gym) return
    if (!name.trim() || !address.trim() || !city.trim() || !state.trim()) {
      Alert.alert('Missing fields', 'Gym name, address, city and state are required.')
      return
    }
    try {
      setSaving(true)
      const { error } = await supabase
        .from('gyms')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
        })
        .eq('id', gym.id)
      if (error) throw error
      Alert.alert('Saved', 'Gym profile updated.')
      await load()
    } catch (err) {
      logger.error('gymAdmin', 'saveGymProfile', err)
      Alert.alert('Error', 'Could not save gym profile.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddPlan() {
    if (!gym) return
    const price = parseInt(planPrice, 10)
    const duration = parseInt(planDuration, 10)
    if (!planName.trim() || !price || price <= 0 || !duration || duration <= 0) {
      Alert.alert('Missing fields', 'Enter a plan name, price and duration.')
      return
    }
    try {
      setSavingPlan(true)
      const { error } = await supabase.from('membership_plans').insert({
        gym_id: gym.id,
        name: planName.trim(),
        price_naira: price,
        duration_days: duration,
      })
      if (error) throw error
      setPlanName('')
      setPlanPrice('')
      setPlanDuration('30')
      setPlanModalOpen(false)
      await load()
    } catch (err) {
      logger.error('gymAdmin', 'addPlan', err)
      Alert.alert('Error', 'Could not add this plan.')
    } finally {
      setSavingPlan(false)
    }
  }

  async function handleTogglePlan(plan: Plan) {
    try {
      const { error } = await supabase
        .from('membership_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id)
      if (error) throw error
      await load()
    } catch (err) {
      logger.error('gymAdmin', 'togglePlan', err)
      Alert.alert('Error', 'Could not update this plan.')
    }
  }

  async function handleDeactivateGym() {
    if (!gym) return
    Alert.alert(
      'Deactivate gym',
      'This removes your gym from public listings. You can reactivate later by contacting support.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('gyms').update({ is_active: false }).eq('id', gym.id)
              if (error) throw error
              await load()
            } catch (err) {
              logger.error('gymAdmin', 'deactivateGym', err)
              Alert.alert('Error', 'Could not deactivate gym.')
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} />
      </View>
    )
  }

  if (!gym) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.text, marginBottom: 8 }}>
          {loadError ? 'Something went wrong' : 'No gym found'}
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
          {loadError ?? "Your account isn't linked to a gym yet."}
        </Text>
        <TouchableOpacity onPress={load} style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.obsidian, borderRadius: 10 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.white }}>Try again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={{ marginRight: 12 }}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.text, flex: 1 }}>Settings</Text>
        <TouchableOpacity
          onPress={() => setShowLogout(true)}
          hitSlop={12}
          style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: `${colors.ember}12`,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <LogOut size={17} color={colors.ember} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {gym && (
          <WCard style={{ marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <View>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 17, color: colors.text }}>{gym.name}</Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                {gym.city}, {gym.state}
              </Text>
            </View>
            <WBadge label={gym.is_active ? 'Live' : 'Pending'} variant={gym.is_active ? 'green' : 'amber'} />
          </WCard>
        )}

        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.text, marginBottom: 12 }}>
          Gym profile
        </Text>
        <View style={{ gap: 14, marginBottom: 24 }}>
          <WInput label="Gym name" value={name} onChangeText={setName} autoCapitalize="words" />
          <WInput label="Description" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
          <WInput label="Address" value={address} onChangeText={setAddress} autoCapitalize="words" />
          <WSelect label="State" value={state} onChange={handleStateChange} options={NIGERIAN_STATES as unknown as string[]} placeholder="Select state" />
          <WSelect label="City" value={city} onChange={setCity} options={cityOptions} placeholder={state ? 'Select city' : 'Select a state first'} />
          <WInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+234 801 234 5678" />
          <WInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="gym@example.com" />
          <WButton label="Save changes" variant="green" onPress={handleSaveProfile} loading={saving} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.text }}>Membership plans</Text>
          <TouchableOpacity
            onPress={() => setPlanModalOpen(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Plus size={16} color={colors.green} strokeWidth={2.5} />
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.green }}>Add plan</Text>
          </TouchableOpacity>
        </View>

        <WCard style={{ marginBottom: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          {plans.length === 0 ? (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 }}>
              No plans yet. Add one to start accepting members.
            </Text>
          ) : (
            plans.map((plan, i) => (
              <TouchableOpacity
                key={plan.id}
                onPress={() => handleTogglePlan(plan)}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                }}
              >
                <View>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>{plan.name}</Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    {plan.duration_days} days
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 14, color: colors.text }}>
                    {formatCurrency(plan.price_naira)}
                  </Text>
                  <WBadge label={plan.is_active ? 'Active' : 'Inactive'} variant={plan.is_active ? 'green' : 'slate'} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </WCard>

        <WButton label="Deactivate gym" variant="danger" onPress={handleDeactivateGym} />
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 8, lineHeight: 17 }}>
          Removes your gym from public listings.
        </Text>
      </ScrollView>

      <LogoutOverlay visible={showLogout} onCancel={() => setShowLogout(false)} onConfirm={() => { setShowLogout(false); signOut() }} />
      <Modal visible={planModalOpen} animationType="slide" onRequestClose={() => setPlanModalOpen(false)} transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.text, marginBottom: 16 }}>
              New plan
            </Text>
            <View style={{ gap: 14 }}>
              <WInput label="Plan name" value={planName} onChangeText={setPlanName} placeholder="e.g. Monthly" autoCapitalize="words" />
              <WInput label="Price (₦)" value={planPrice} onChangeText={setPlanPrice} keyboardType="number-pad" placeholder="35000" />
              <WInput label="Duration (days)" value={planDuration} onChangeText={setPlanDuration} keyboardType="number-pad" placeholder="30" />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <WButton
                  label="Cancel"
                  variant="dark"
                  onPress={() => setPlanModalOpen(false)}
                  style={{ flex: 1, backgroundColor: colors.surface }}
                />
                <WButton label="Add plan" variant="green" onPress={handleAddPlan} loading={savingPlan} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
