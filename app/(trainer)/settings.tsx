import { useCallback, useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { Plus, LogOut, ChevronRight } from 'lucide-react-native'
import { LogoutOverlay } from '@/components/shared/LogoutOverlay'
import { colors } from '@/lib/theme/colors'
import { WCard } from '@/components/ui/WCard'
import { WInput } from '@/components/ui/WInput'
import { WButton } from '@/components/ui/WButton'
import { WSelect } from '@/components/ui/WSelect'
import { WBadge } from '@/components/ui/WBadge'
import { useAuthStore } from '@/lib/stores/authStore'
import { useAuth } from '@/lib/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { NIGERIAN_STATES, CITIES_BY_STATE } from '@/lib/constants/nigeria'
import { PricingType } from '@/types/database'

interface TrainerProfile {
  id: string
  displayName: string
  bio: string
  phone: string
  city: string
  state: string
}

interface PricingRow {
  id: string
  pricingType: PricingType
  amountNaira: number
  isActive: boolean
}

const PRICING_LABELS: Record<PricingType, string> = {
  per_session: 'Per Session',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

export default function TrainerSettingsScreen() {
  const user = useAuthStore((s) => s.user)
  const { signOut } = useAuth()
  const [profile, setProfile] = useState<TrainerProfile | null>(null)
  const [pricing, setPricing] = useState<PricingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pricingModalOpen, setPricingModalOpen] = useState(false)
  const [showLogout, setShowLogout] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')

  const [pricingType, setPricingType] = useState<PricingType>('per_session')
  const [pricingAmount, setPricingAmount] = useState('')
  const [savingPricing, setSavingPricing] = useState(false)

  const [notifBookings, setNotifBookings] = useState(true)
  const [notifPayments, setNotifPayments] = useState(true)
  const [phonePublic, setPhonePublic] = useState(true)

  const cityOptions = useMemo(() => (state ? CITIES_BY_STATE[state] ?? [] : []), [state])

  const load = useCallback(async () => {
    if (!user) return
    try {
      const { data: p, error: profileError } = await supabase
        .from('trainer_profiles')
        .select('id, display_name, bio, phone, city, state')
        .eq('user_id', user.id)
        .maybeSingle()
      if (profileError) throw profileError
      if (!p) return

      setProfile({
        id: p.id,
        displayName: p.display_name,
        bio: p.bio ?? '',
        phone: p.phone,
        city: p.city ?? '',
        state: p.state ?? '',
      })
      setDisplayName(p.display_name)
      setBio(p.bio ?? '')
      setPhone(p.phone)
      setCity(p.city ?? '')
      setState(p.state ?? '')

      const { data: pricingRows, error: pricingError } = await supabase
        .from('trainer_pricing')
        .select('id, pricing_type, amount_naira, is_active')
        .eq('trainer_id', p.id)
        .order('amount_naira', { ascending: true })
      if (pricingError) throw pricingError
      setPricing((pricingRows ?? []).map((r) => ({ id: r.id, pricingType: r.pricing_type as PricingType, amountNaira: r.amount_naira, isActive: Boolean(r.is_active) })))
    } catch (err) {
      logger.error('trainerDashboard', 'fetchTrainerSettings', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function handleStateChange(newState: string) {
    setState(newState)
    setCity('')
  }

  async function handleSaveProfile() {
    if (!profile) return
    if (!displayName.trim() || !phone.trim()) {
      Alert.alert('Missing fields', 'Display name and phone are required.')
      return
    }
    try {
      setSaving(true)
      const { error } = await supabase
        .from('trainer_profiles')
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          phone: phone.trim(),
          city: city.trim() || null,
          state: state.trim() || null,
        })
        .eq('id', profile.id)
      if (error) throw error
      Alert.alert('Saved', 'Profile updated.')
      await load()
    } catch (err) {
      logger.error('trainerDashboard', 'saveTrainerProfile', err)
      Alert.alert('Error', 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddPricing() {
    if (!profile) return
    const amount = parseInt(pricingAmount, 10)
    if (!amount || amount <= 0) {
      Alert.alert('Missing fields', 'Enter a valid price.')
      return
    }
    try {
      setSavingPricing(true)
      const { error } = await supabase.from('trainer_pricing').insert({
        trainer_id: profile.id,
        pricing_type: pricingType,
        amount_naira: amount,
      })
      if (error) throw error
      setPricingAmount('')
      setPricingModalOpen(false)
      await load()
    } catch (err) {
      logger.error('trainerDashboard', 'addPricing', err)
      Alert.alert('Error', 'Could not add this price.')
    } finally {
      setSavingPricing(false)
    }
  }

  async function handleTogglePricing(row: PricingRow) {
    try {
      const { error } = await supabase.from('trainer_pricing').update({ is_active: !row.isActive }).eq('id', row.id)
      if (error) throw error
      await load()
    } catch (err) {
      logger.error('trainerDashboard', 'togglePricing', err)
      Alert.alert('Error', 'Could not update this price.')
    }
  }

  function handleSignOut() {
    setShowLogout(true)
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} />
      </View>
    )
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.text, marginBottom: 8 }}>No profile found</Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
          Your account isn't linked to a trainer profile yet.
        </Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, color: colors.text, letterSpacing: -0.5, flex: 1 }}>Settings</Text>
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
        <WCard style={{ marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <View>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 17, color: colors.text }}>{profile.displayName}</Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              {profile.city && profile.state ? `${profile.city}, ${profile.state}` : 'Location not set'}
            </Text>
          </View>
        </WCard>

        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.text, marginBottom: 12 }}>
          Edit profile
        </Text>
        <View style={{ gap: 14, marginBottom: 24 }}>
          <WInput label="Display name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
          <WInput label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={3} />
          <WInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+234 801 234 5678" />
          <WSelect label="State" value={state} onChange={handleStateChange} options={NIGERIAN_STATES as unknown as string[]} placeholder="Select state" />
          <WSelect label="City" value={city} onChange={setCity} options={cityOptions} placeholder={state ? 'Select city' : 'Select a state first'} />
          <WButton label="Save changes" variant="green" onPress={handleSaveProfile} loading={saving} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.text }}>Pricing</Text>
          <TouchableOpacity
            onPress={() => setPricingModalOpen(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Plus size={16} color={colors.green} strokeWidth={2.5} />
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.green }}>Add price</Text>
          </TouchableOpacity>
        </View>

        <WCard style={{ marginBottom: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          {pricing.length === 0 ? (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 }}>
              No pricing set yet. Add a price so members can book you.
            </Text>
          ) : (
            pricing.map((row, i) => (
              <TouchableOpacity
                key={row.id}
                onPress={() => handleTogglePricing(row)}
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
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>{PRICING_LABELS[row.pricingType]}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 14, color: colors.text }}>
                    {formatCurrency(row.amountNaira)}
                  </Text>
                  <WBadge label={row.isActive ? 'Active' : 'Inactive'} variant={row.isActive ? 'green' : 'slate'} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </WCard>

        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.text, marginBottom: 12 }}>
          Notification preferences
        </Text>
        <WCard style={{ marginBottom: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 14 }}>
          {[
            { label: 'Booking updates', value: notifBookings, onToggle: () => setNotifBookings((v) => !v) },
            { label: 'Payment updates', value: notifPayments, onToggle: () => setNotifPayments((v) => !v) },
          ].map((row) => (
            <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.text }}>{row.label}</Text>
              <TouchableOpacity
                onPress={row.onToggle}
                hitSlop={8}
                style={{
                  width: 40, height: 24, borderRadius: 12,
                  backgroundColor: row.value ? colors.green : colors.border,
                  justifyContent: 'center',
                }}
              >
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.white, marginLeft: row.value ? 19 : 3 }} />
              </TouchableOpacity>
            </View>
          ))}
        </WCard>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginBottom: 24, lineHeight: 17 }}>
          These preferences are informational only for now — all trainer-relevant notifications are still delivered.
        </Text>

        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.text, marginBottom: 12 }}>
          Privacy
        </Text>
        <WCard style={{ marginBottom: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.text }}>Show phone number publicly</Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                Local preference only — not yet enforced on your public profile.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setPhonePublic((v) => !v)}
              hitSlop={8}
              style={{
                width: 40, height: 24, borderRadius: 12,
                backgroundColor: phonePublic ? colors.green : colors.border,
                justifyContent: 'center',
              }}
            >
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.white, marginLeft: phonePublic ? 19 : 3 }} />
            </TouchableOpacity>
          </View>
        </WCard>

        <TouchableOpacity
          onPress={() => router.push('/(trainer)/availability')}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
            borderRadius: 14, padding: 16, marginBottom: 24,
          }}
        >
          <View>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text }}>Manage availability</Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              Set your schedule and pause bookings
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.8} />
        </TouchableOpacity>

        <WButton label="Log out" variant="danger" onPress={handleSignOut} />
      </ScrollView>

      <LogoutOverlay visible={showLogout} onCancel={() => setShowLogout(false)} onConfirm={() => { setShowLogout(false); signOut() }} />
      <Modal visible={pricingModalOpen} animationType="slide" onRequestClose={() => setPricingModalOpen(false)} transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.text, marginBottom: 16 }}>
              New price
            </Text>
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['per_session', 'weekly', 'monthly'] as PricingType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setPricingType(t)}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 10,
                      alignItems: 'center',
                      backgroundColor: pricingType === t ? colors.obsidian : colors.surface,
                      borderWidth: 1,
                      borderColor: pricingType === t ? colors.obsidian : colors.border,
                    }}
                  >
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: pricingType === t ? colors.white : colors.textMuted }}>
                      {PRICING_LABELS[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <WInput label="Amount (₦)" value={pricingAmount} onChangeText={setPricingAmount} keyboardType="number-pad" placeholder="15000" />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <WButton
                  label="Cancel"
                  variant="dark"
                  onPress={() => setPricingModalOpen(false)}
                  style={{ flex: 1, backgroundColor: colors.surface }}
                />
                <WButton label="Add price" variant="green" onPress={handleAddPricing} loading={savingPricing} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
