import { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { colors } from '@/lib/theme/colors'
import { WCard } from '@/components/ui/WCard'
import { WInput } from '@/components/ui/WInput'
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

export default function TrainerEarningsScreen() {
  const user = useAuthStore((s) => s.user)
  const [trainerId, setTrainerId] = useState<string | null>(null)
  const [totalEarnings, setTotalEarnings] = useState<number | null>(null)
  const [pendingPayouts, setPendingPayouts] = useState<number | null>(null)
  const [completedPayouts, setCompletedPayouts] = useState<number | null>(null)
  const [availableBalance, setAvailableBalance] = useState<number | null>(null)
  const [requests, setRequests] = useState<PayoutRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [requestAmount, setRequestAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const { data: profile, error: profileError } = await supabase
        .from('trainer_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (profileError) throw profileError
      const tid = profile?.id ?? null
      setTrainerId(tid)
      if (!tid) return

      const [completedBookingsRes, requestsRes] = await Promise.all([
        supabase.from('bookings').select('trainer_payout_naira').eq('trainer_id', tid).eq('status', 'completed'),
        supabase.from('trainer_payout_requests').select('id, amount_naira, status, requested_at').eq('trainer_id', tid).order('requested_at', { ascending: false }),
      ])
      if (completedBookingsRes.error) throw completedBookingsRes.error
      if (requestsRes.error) throw requestsRes.error

      const total = (completedBookingsRes.data ?? []).reduce((sum, b) => sum + (b.trainer_payout_naira ?? 0), 0)
      const allRequests = requestsRes.data ?? []
      const pending = allRequests.filter((r) => r.status === 'pending').reduce((sum, r) => sum + r.amount_naira, 0)
      const completed = allRequests.filter((r) => r.status === 'completed').reduce((sum, r) => sum + r.amount_naira, 0)
      // Rejected requests never actually paid out, so they shouldn't reduce the available balance.
      const requestedTotal = pending + completed

      setTotalEarnings(total)
      setPendingPayouts(pending)
      setCompletedPayouts(completed)
      setAvailableBalance(Math.max(0, total - requestedTotal))
      setRequests(allRequests.map((r) => ({
        id: r.id,
        amount: r.amount_naira,
        status: r.status as PayoutRequest['status'],
        requestedAt: r.requested_at ?? new Date(0).toISOString(),
      })))
    } catch (err) {
      logger.error('trainerDashboard', 'fetchEarnings', err)
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

  async function handleRequestPayout() {
    if (!trainerId) return
    const amount = parseInt(requestAmount, 10)
    if (!amount || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid payout amount.')
      return
    }
    if (availableBalance !== null && amount > availableBalance) {
      Alert.alert('Amount too high', `You can request up to ${formatCurrency(availableBalance)}.`)
      return
    }
    try {
      setSubmitting(true)
      const { error } = await supabase.from('trainer_payout_requests').insert({
        trainer_id: trainerId,
        amount_naira: amount,
        status: 'pending',
      })
      if (error) throw error
      setRequestAmount('')
      setRequestModalOpen(false)
      await load()
    } catch (err) {
      logger.error('trainerDashboard', 'requestPayout', err)
      Alert.alert('Error', 'Could not submit your payout request.')
    } finally {
      setSubmitting(false)
    }
  }

  const badgeVariant = (status: PayoutRequest['status']) =>
    status === 'completed' ? 'green' : status === 'rejected' ? 'ember' : 'amber'

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 }}>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, color: colors.text, letterSpacing: -0.5 }}>Earnings</Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          {/* Total earnings */}
          <View style={{
            backgroundColor: colors.surface, borderRadius: 16,
            padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12,
          }}>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
              Total earnings
            </Text>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 32, color: colors.text, letterSpacing: -0.8 }}>
              {totalEarnings === null || totalEarnings === 0 ? '—' : formatCurrency(totalEarnings)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>Pending payouts</Text>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, color: colors.text, marginTop: 6, letterSpacing: -0.5 }}>
                {pendingPayouts === null || pendingPayouts === 0 ? '—' : formatCurrency(pendingPayouts)}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>Completed payouts</Text>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, color: colors.text, marginTop: 6, letterSpacing: -0.5 }}>
                {completedPayouts === null || completedPayouts === 0 ? '—' : formatCurrency(completedPayouts)}
              </Text>
            </View>
          </View>

          <WButton
            label={`Request payout${availableBalance !== null ? ` (${formatCurrency(availableBalance)} available)` : ''}`}
            variant="green"
            onPress={() => setRequestModalOpen(true)}
            disabled={!availableBalance}
            style={{ marginBottom: 24 }}
          />

          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.text, marginBottom: 12 }}>
            Withdrawal history
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
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.border,
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
        </View>
      </ScrollView>

      <Modal visible={requestModalOpen} animationType="slide" onRequestClose={() => setRequestModalOpen(false)} transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.text, marginBottom: 16 }}>
              Request payout
            </Text>
            <View style={{ gap: 14 }}>
              <WInput label="Amount (₦)" value={requestAmount} onChangeText={setRequestAmount} keyboardType="number-pad" placeholder="50000" />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <WButton
                  label="Cancel"
                  variant="dark"
                  onPress={() => setRequestModalOpen(false)}
                  style={{ flex: 1, backgroundColor: colors.surface }}
                />
                <WButton label="Submit" variant="green" onPress={handleRequestPayout} loading={submitting} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
