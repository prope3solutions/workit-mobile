import { useCallback, useState } from 'react'
import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { ArrowLeft } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { WCard } from '@/components/ui/WCard'
import { WButton } from '@/components/ui/WButton'
import { WBadge } from '@/components/ui/WBadge'
import { useAuthStore } from '@/lib/stores/authStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { formatDate } from '@/lib/utils/formatDate'

interface PayoutRequest {
  id: string
  amount: number
  status: 'pending' | 'completed' | 'rejected'
  requestedAt: string
}

export default function GymPayoutsScreen() {
  const colors = useColors()
  const user = useAuthStore((s) => s.user)
  const [gymId, setGymId] = useState<string | null>(null)
  const [subaccountCode, setSubaccountCode] = useState<string | null>(null)
  const [totalEarnings, setTotalEarnings] = useState<number | null>(null)
  const [pendingPayouts, setPendingPayouts] = useState<number | null>(null)
  const [completedPayouts, setCompletedPayouts] = useState<number | null>(null)
  const [availableBalance, setAvailableBalance] = useState<number | null>(null)
  const [requests, setRequests] = useState<PayoutRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const { data: adminRow, error: adminErr } = await supabase
        .from('gym_admins')
        .select('gym_id, gyms(paystack_subaccount_code)')
        .eq('user_id', user.id)
        .maybeSingle()
      if (adminErr) throw adminErr
      const gid = adminRow?.gym_id ?? null
      setGymId(gid)
      setSubaccountCode((adminRow?.gyms as any)?.paystack_subaccount_code ?? null)
      if (!gid) return

      const [membershipsRes, requestsRes] = await Promise.all([
        supabase.from('memberships').select('gym_payout_naira').eq('gym_id', gid),
        supabase.from('gym_payout_requests').select('id, amount_naira, status, requested_at').eq('gym_id', gid).order('requested_at', { ascending: false }),
      ])
      if (membershipsRes.error) throw membershipsRes.error
      if (requestsRes.error) throw requestsRes.error

      const total = (membershipsRes.data ?? []).reduce((sum, m) => sum + (m.gym_payout_naira ?? 0), 0)
      const allRequests = requestsRes.data ?? []
      const pending = allRequests.filter((r) => r.status === 'pending').reduce((sum, r) => sum + r.amount_naira, 0)
      const completed = allRequests.filter((r) => r.status === 'completed').reduce((sum, r) => sum + r.amount_naira, 0)
      // Rejected requests never paid out, so they don't reduce available balance.
      const requestedTotal = pending + completed

      setTotalEarnings(total)
      setPendingPayouts(pending)
      setCompletedPayouts(completed)
      setAvailableBalance(Math.max(0, total - requestedTotal))
      setRequests(allRequests.map((r) => ({
        id: r.id, amount: r.amount_naira, status: r.status as PayoutRequest['status'], requestedAt: r.requested_at ?? new Date(0).toISOString(),
      })))
    } catch (err) {
      logger.error('gymDashboard', 'fetchPayouts', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  // Paystack subaccounts settle the WHOLE accrued balance when released — there is
  // no partial release. So a payout request always releases the full available balance.
  async function handleRequestPayout() {
    if (!gymId || !availableBalance) return
    if (!subaccountCode) {
      Alert.alert('Payout account missing', 'Finish setting up your payout bank account first.')
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert(
      'Request payout',
      `Release your full available balance of ${formatCurrency(availableBalance)} to your bank account? Funds arrive within 1 business day.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request payout',
          onPress: async () => {
            try {
              setSubmitting(true)
              // 1. Record the request.
              const { error: reqErr } = await supabase.from('gym_payout_requests').insert({
                gym_id: gymId,
                amount_naira: availableBalance,
                status: 'pending',
                requested_by: user?.id ?? null,
              })
              if (reqErr) throw reqErr

              // 2. Flip the subaccount to auto so Paystack settles the accrued balance (T+1).
              const { error: relErr } = await supabase.functions.invoke('paystack', {
                body: {
                  action: 'update_subaccount_schedule',
                  payload: { subaccount_code: subaccountCode, settlement_schedule: 'auto' },
                },
              })
              if (relErr) throw relErr

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              Alert.alert('Payout requested', 'Your funds are on the way and should arrive within 1 business day.')
              await load()
            } catch (err) {
              logger.error('gymDashboard', 'requestPayout', err)
              Alert.alert('Error', 'Could not submit your payout request. Please try again.')
            } finally {
              setSubmitting(false)
            }
          },
        },
      ]
    )
  }

  const badgeVariant = (status: PayoutRequest['status']) =>
    status === 'completed' ? 'green' : status === 'rejected' ? 'ember' : 'amber'

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back() }}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36, height: 36, borderRadius: 10, backgroundColor: colors.stone2,
            alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1,
          })}
        >
          <ArrowLeft size={18} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, letterSpacing: -0.4, color: colors.text }}>
          Payouts
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Available balance */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor: colors.border, marginBottom: 12,
        }}>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
            Available balance
          </Text>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 32, color: colors.text, letterSpacing: -0.8 }}>
            {availableBalance === null || availableBalance === 0 ? '—' : formatCurrency(availableBalance)}
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textFaint, marginTop: 6 }}>
            Total earned: {totalEarnings === null ? '—' : formatCurrency(totalEarnings)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>Pending</Text>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, color: colors.text, marginTop: 6, letterSpacing: -0.5 }}>
              {pendingPayouts === null || pendingPayouts === 0 ? '—' : formatCurrency(pendingPayouts)}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>Paid out</Text>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, color: colors.text, marginTop: 6, letterSpacing: -0.5 }}>
              {completedPayouts === null || completedPayouts === 0 ? '—' : formatCurrency(completedPayouts)}
            </Text>
          </View>
        </View>

        <WButton
          label={`Request payout${availableBalance ? ` (${formatCurrency(availableBalance)})` : ''}`}
          variant="green"
          onPress={handleRequestPayout}
          loading={submitting}
          disabled={!availableBalance}
          style={{ marginBottom: 24 }}
        />

        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.text, marginBottom: 12 }}>
          Payout history
        </Text>
        <WCard style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          {!loading && requests.length === 0 ? (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 }}>
              No payout requests yet.
            </Text>
          ) : (
            requests.map((r, i) => (
              <View
                key={r.id}
                style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingVertical: 12,
                  borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border,
                }}
              >
                <View>
                  <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 14, color: colors.text }}>
                    {formatCurrency(r.amount)}
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    {formatDate(r.requestedAt)}
                  </Text>
                </View>
                <WBadge label={r.status.charAt(0).toUpperCase() + r.status.slice(1)} variant={badgeVariant(r.status)} />
              </View>
            ))
          )}
        </WCard>
      </ScrollView>
    </View>
  )
}
