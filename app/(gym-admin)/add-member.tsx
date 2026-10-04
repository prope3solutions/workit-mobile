import { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { colors } from '@/lib/theme/colors'
import { WInput } from '@/components/ui/WInput'
import { WButton } from '@/components/ui/WButton'
import { useAuthStore } from '@/lib/stores/authStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import type { PaymentMethod } from '@/types/database'

interface Plan {
  id: string
  name: string
  price_naira: number
  duration_days: number
}

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'cash', label: 'Cash' },
  { key: 'pos', label: 'POS' },
  { key: 'transfer', label: 'Transfer' },
]

export default function AddMemberScreen() {
  const user = useAuthStore((s) => s.user)
  const [gymId, setGymId] = useState<string | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [planId, setPlanId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('gym_admins')
      .select('gym_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error) {
          logger.error('gymAdmin', 'fetchGymIdForAddMember', error)
          return
        }
        const gid = data?.gym_id ?? null
        setGymId(gid)
        if (!gid) return
        const { data: planRows, error: planError } = await supabase
          .from('membership_plans')
          .select('id, name, price_naira, duration_days')
          .eq('gym_id', gid)
          .eq('is_active', true)
          .order('price_naira', { ascending: true })
        if (planError) {
          logger.error('gymAdmin', 'fetchPlansForAddMember', planError)
          return
        }
        setPlans(planRows ?? [])
      })
  }, [user])

  const selectedPlan = useMemo(() => plans.find((p) => p.id === planId) ?? null, [plans, planId])

  useEffect(() => {
    if (selectedPlan) setAmount(String(selectedPlan.price_naira))
  }, [selectedPlan])

  const canSubmit = fullName.trim().length > 0 && (email.trim().length > 0 || phone.trim().length > 0) && planId && amount.trim().length > 0

  async function handleSave() {
    if (!gymId || !user || !selectedPlan) return
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPhone = phone.trim()
    const parsedAmount = parseInt(amount, 10)

    if (!fullName.trim()) {
      Alert.alert('Missing name', 'Please enter the member’s full name.')
      return
    }
    if (!trimmedEmail && !trimmedPhone) {
      Alert.alert('Missing contact', 'Please enter an email or phone number.')
      return
    }
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount paid.')
      return
    }

    try {
      setLoading(true)

      let memberId: string | null = null

      if (trimmedEmail) {
        const { data: existing, error: existingError } = await supabase
          .from('users')
          .select('id')
          .eq('email', trimmedEmail)
          .maybeSingle()
        if (existingError) throw existingError
        memberId = existing?.id ?? null
      }
      if (!memberId && trimmedPhone) {
        const { data: existing, error: existingError } = await supabase
          .from('users')
          .select('id')
          .eq('phone', trimmedPhone)
          .maybeSingle()
        if (existingError) throw existingError
        memberId = existing?.id ?? null
      }

      let inviteToken: string | null = null

      if (!memberId) {
        if (!trimmedEmail) {
          Alert.alert('Email required', 'An email is required to create a new member account.')
          setLoading(false)
          return
        }
        // Uses an edge function with the service-role key so the new member's
        // account is created without swapping out the gym admin's own session
        // (supabase.auth.signUp() on the client would sign this device in as
        // the newly created member instead).
        const { data: created, error: createError } = await supabase.functions.invoke('create-member', {
          body: { email: trimmedEmail, fullName: fullName.trim(), phone: trimmedPhone || undefined, gymId },
        })
        if (createError) throw createError
        if (created?.error) throw new Error(created.error)
        memberId = created?.memberId ?? null
        if (!memberId) throw new Error('Could not create member account.')
        inviteToken = memberId
      }

      const startDate = new Date()
      const endDate = new Date(startDate.getTime() + selectedPlan.duration_days * 24 * 60 * 60 * 1000)

      const { error: membershipError } = await supabase.from('memberships').insert({
        member_id: memberId,
        gym_id: gymId,
        plan_id: selectedPlan.id,
        status: 'active',
        start_date: startDate.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
        payment_method: paymentMethod,
        payment_verified_by: 'gym_admin',
        amount_paid_naira: parsedAmount,
        platform_fee_naira: 0,
        gym_payout_naira: parsedAmount,
        added_by_admin_id: user.id,
        invite_token: inviteToken,
      })
      if (membershipError) throw membershipError

      router.back()
    } catch (err: unknown) {
      logger.error('gymAdmin', 'addMember', err)
      const message = err instanceof Error ? err.message : 'Could not add this member.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.text }}>Add member</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: 16 }} keyboardShouldPersistTaps="handled">
        <WInput label="Full name" value={fullName} onChangeText={setFullName} placeholder="e.g. Chinonso Eze" autoCapitalize="words" />
        <WInput label="Email" value={email} onChangeText={setEmail} placeholder="member@example.com" keyboardType="email-address" autoCapitalize="none" />
        <WInput label="Phone" value={phone} onChangeText={setPhone} placeholder="+234 800 000 0000" keyboardType="phone-pad" />

        <View>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.textMuted, marginBottom: 8, letterSpacing: 0.12 }}>
            MEMBERSHIP PLAN
          </Text>
          {plans.length === 0 ? (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>
              No plans set up yet. Add one from Gym settings first.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {plans.map((plan) => {
                const selected = plan.id === planId
                return (
                  <TouchableOpacity
                    key={plan.id}
                    onPress={() => setPlanId(plan.id)}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: selected ? '#00E87A0D' : colors.surface,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.green : colors.border,
                    }}
                  >
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>{plan.name}</Text>
                    <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 14, color: selected ? colors.green : colors.textMuted }}>
                      {formatCurrency(plan.price_naira)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>

        <View>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.textMuted, marginBottom: 8, letterSpacing: 0.12 }}>
            PAYMENT METHOD
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PAYMENT_METHODS.map((pm) => {
              const selected = pm.key === paymentMethod
              return (
                <TouchableOpacity
                  key={pm.key}
                  onPress={() => setPaymentMethod(pm.key)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    backgroundColor: selected ? colors.obsidian : colors.surface,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.obsidian : colors.border,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: selected ? colors.white : colors.textMuted }}>
                    {pm.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <WInput
          label="Amount paid (₦)"
          value={amount}
          onChangeText={setAmount}
          placeholder="35000"
          keyboardType="number-pad"
        />

        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
          If this member doesn't have a WorkIt account yet, we'll create one and they can set their own password later.
        </Text>

        <WButton label="Save member" variant="green" onPress={handleSave} loading={loading} disabled={!canSubmit} />
      </ScrollView>
    </View>
  )
}
