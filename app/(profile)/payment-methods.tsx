import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, Alert, Modal, Platform, KeyboardAvoidingView, ActivityIndicator, StyleSheet } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { ArrowLeft, CreditCard, Banknote, Smartphone, ChevronRight, AlertTriangle, PauseCircle, X, Check } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { useMembership } from '@/lib/hooks/useMembership'
import { cancelMembership } from '@/lib/services/cancelMembership'
import { CancelMembershipSheet } from '@/components/shared/CancelMembershipSheet'
import { useAuthStore } from '@/lib/stores/authStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatDate, formatDateLong } from '@/lib/utils/formatDate'

const PAUSE_OPTIONS = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '3 weeks', days: 21 },
  { label: '1 month', days: 30 },
]

const styles = StyleSheet.create({
  membershipActionButton: {
    width: '100%',
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalActionButton: {
    width: '100%',
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
})

interface PaymentRow {
  id: string
  method: 'paystack' | 'cash' | 'pos' | 'transfer'
  label: string
  date: string
  amount: number
  plan: string
}

function formatPrice(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

function methodIcon(method: 'paystack' | 'cash' | 'pos' | 'transfer') {
  if (method === 'cash') return Banknote
  if (method === 'pos') return CreditCard
  if (method === 'transfer') return Smartphone
  return CreditCard
}

function methodLabel(method: PaymentRow['method'], ref: string | null) {
  if (method === 'cash') return 'Cash payment'
  if (method === 'pos') return 'POS payment'
  if (method === 'transfer') return 'Bank transfer'
  return ref ? `Paystack · ${ref.slice(-8)}` : 'Paystack'
}

export default function PaymentMethodsScreen() {
  const colors = useColors()
  const memberId = useAuthStore((s) => s.user?.id)
  const { membership, loading, refetch } = useMembership()

  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const [showCancelSheet, setShowCancelSheet] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const [showPauseModal, setShowPauseModal] = useState(false)
  const [selectedPause, setSelectedPause] = useState(0)
  const [pausing, setPausing] = useState(false)

  // Payment history = the member's membership purchase records.
  const loadHistory = useCallback(async () => {
    if (!memberId) { setHistoryLoading(false); return }
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('id, amount_paid_naira, payment_method, paystack_reference, created_at, membership_plans(name), gyms(name)')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setPayments((data ?? []).map((r: any) => ({
        id: r.id,
        method: r.payment_method,
        label: methodLabel(r.payment_method, r.paystack_reference),
        date: formatDate(r.created_at),
        amount: r.amount_paid_naira ?? 0,
        plan: `${r.membership_plans?.name ?? 'Membership'} — ${r.gyms?.name ?? ''}`.trim(),
      })))
    } catch (err) {
      logger.error('payment', 'loadHistory', err)
    } finally {
      setHistoryLoading(false)
    }
  }, [memberId])

  useFocusEffect(useCallback(() => { loadHistory() }, [loadHistory]))

  async function handleConfirmCancel() {
    if (!membership || !memberId) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    setCancelling(true)
    const result = await cancelMembership(membership.id, memberId)
    setCancelling(false)
    if ('error' in result) {
      Alert.alert('Could not cancel', result.error)
      return
    }
    setShowCancelSheet(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    await refetch()
    Alert.alert(
      'Membership cancelled',
      `Your membership won't renew. You keep access until ${formatDateLong(membership.endDate)}.`
    )
  }

  function handlePauseMembership() {
    const opt = PAUSE_OPTIONS[selectedPause]
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setPausing(true)
    // TODO: pause requires a gym-approval backend (pause_requests table) — mocked for now.
    setTimeout(() => {
      setPausing(false)
      setShowPauseModal(false)
      Alert.alert(
        'Pause requested',
        `Your request to pause for ${opt.label} has been sent${membership ? ` to ${membership.gymName}` : ''}. You'll be notified once it's approved.`
      )
    }, 1000)
  }

  const canCancel = membership?.status === 'active'
  const isCancelled = membership?.status === 'cancelled' && membership.inGrace

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        paddingTop: 60, paddingBottom: 16,
        paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.bg,
      }}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back() }}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: colors.stone2,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <ArrowLeft size={18} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, letterSpacing: -0.4, color: colors.text }}>
          Payments
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Payment history */}
        <Text style={{
          fontFamily: 'DMSans_500Medium', fontSize: 11,
          letterSpacing: 0.7, color: colors.textMuted,
          textTransform: 'uppercase', marginBottom: 10,
        }}>
          Payment history
        </Text>

        {historyLoading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator color={colors.green} />
          </View>
        ) : payments.length === 0 ? (
          <View style={{
            backgroundColor: colors.surface, borderRadius: 18,
            borderWidth: 1, borderColor: colors.border,
            padding: 20, marginBottom: 28,
          }}>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
              No payments yet.
            </Text>
          </View>
        ) : (
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: 18,
            borderWidth: 1, borderColor: colors.border,
            overflow: 'hidden',
            marginBottom: 28,
          }}>
            {payments.map((p, i) => {
              const Icon = methodIcon(p.method)
              return (
                <View key={p.id}>
                  {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, width: '100%', backgroundColor: colors.border }} />}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    paddingHorizontal: 16, paddingVertical: 14,
                  }}>
                    <View style={{
                      width: 34, height: 34, borderRadius: 10,
                      backgroundColor: colors.stone2,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={16} color={colors.textMuted} strokeWidth={1.75} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text, marginBottom: 2 }}>
                        {p.plan}
                      </Text>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>
                        {p.label} · {p.date}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 14, color: colors.text }}>
                      {formatPrice(p.amount)}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Membership management */}
        <Text style={{
          fontFamily: 'DMSans_500Medium', fontSize: 11,
          letterSpacing: 0.7, color: colors.textMuted,
          textTransform: 'uppercase', marginBottom: 10,
        }}>
          Membership
        </Text>

        {loading ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator color={colors.green} />
          </View>
        ) : !membership || !membership.hasAccess ? (
          // No active/cancelled-in-grace membership.
          <View style={{
            backgroundColor: colors.surface, borderRadius: 18,
            borderWidth: 1, borderColor: colors.border,
            padding: 20, marginBottom: 28, alignItems: 'center', gap: 12,
          }}>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
              You don't have an active membership.
            </Text>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(member)/discover') }}
              style={({ pressed }) => ({
                height: 44, borderRadius: 12, paddingHorizontal: 20,
                backgroundColor: colors.green,
                alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 14, color: colors.obsidian }}>Find a gym</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: 18,
              borderWidth: 1, borderColor: colors.border,
              overflow: 'hidden',
              marginBottom: 28,
            }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                paddingHorizontal: 16, paddingVertical: 15,
              }}>
                <View style={{
                  width: 34, height: 34, borderRadius: 10,
                  backgroundColor: isCancelled ? `${colors.amber}18` : `${colors.green}18`,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isCancelled ? colors.amber : colors.green }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text }}>
                    {membership.gymName} — {membership.planName}
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                    {isCancelled
                      ? `Cancelled · Access until ${formatDateLong(membership.endDate)}`
                      : `Active · Renews ${formatDateLong(membership.endDate)}`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Pause — only for active memberships */}
            {canCancel && (
              <View style={{
                backgroundColor: `${colors.amber}08`,
                borderRadius: 18,
                borderWidth: 1, borderColor: `${colors.amber}25`,
                padding: 16,
                marginBottom: 12,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                  <PauseCircle size={16} color={colors.amber} strokeWidth={2} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text, marginBottom: 3 }}>
                      Pause membership
                    </Text>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, lineHeight: 20 }}>
                      Take a break without losing your spot. Your billing is frozen and your expiry date extends by the paused time. Requires gym approval.
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPauseModal(true) }}
                  style={({ pressed }) => ({ width: '100%', opacity: pressed ? 0.6 : 1 })}
                >
                  <View style={[styles.membershipActionButton, { borderColor: `${colors.amber}40`, backgroundColor: `${colors.amber}10` }]}>
                    <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.amber }}>
                      Request a pause
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}

            {/* Cancel — only for active memberships */}
            {canCancel && (
              <View style={{
                backgroundColor: `${colors.ember}08`,
                borderRadius: 18,
                borderWidth: 1, borderColor: `${colors.ember}20`,
                padding: 16,
                marginBottom: 12,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                  <AlertTriangle size={16} color={colors.ember} strokeWidth={2} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text, marginBottom: 3 }}>
                      Cancel membership
                    </Text>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, lineHeight: 20 }}>
                      You'll keep access until {formatDateLong(membership.endDate)}. After that your membership will not renew.
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowCancelSheet(true) }}
                  style={({ pressed }) => ({ width: '100%', opacity: pressed ? 0.6 : 1 })}
                >
                  <View style={[styles.membershipActionButton, { borderColor: `${colors.ember}40`, backgroundColor: `${colors.ember}08` }]}>
                    <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.ember }}>
                      Cancel membership
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}

            {/* Cancelled-in-grace note */}
            {isCancelled && (
              <View style={{
                backgroundColor: `${colors.amber}08`,
                borderRadius: 18,
                borderWidth: 1, borderColor: `${colors.amber}25`,
                padding: 16, marginBottom: 12,
                flexDirection: 'row', alignItems: 'flex-start', gap: 12,
              }}>
                <AlertTriangle size={16} color={colors.amber} strokeWidth={2} style={{ marginTop: 1 }} />
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, lineHeight: 20, flex: 1 }}>
                  This membership is cancelled. You have access for {membership.daysLeft} more {membership.daysLeft === 1 ? 'day' : 'days'}, until {formatDateLong(membership.endDate)}.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Branded cancel confirmation */}
      {membership && (
        <CancelMembershipSheet
          visible={showCancelSheet}
          gymName={membership.gymName}
          accessUntil={formatDateLong(membership.endDate)}
          cancelling={cancelling}
          onDismiss={() => setShowCancelSheet(false)}
          onConfirm={handleConfirmCancel}
        />
      )}

      {/* Pause duration modal */}
      <Modal visible={showPauseModal} animationType="slide" transparent onRequestClose={() => setShowPauseModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={{
            backgroundColor: colors.bg,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: 24, paddingBottom: 40,
          }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, letterSpacing: -0.4, color: colors.text }}>
                Pause duration
              </Text>
              <Pressable
                onPress={() => setShowPauseModal(false)}
                hitSlop={12}
                style={({ pressed }) => ({
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: colors.stone2,
                  alignItems: 'center', justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <X size={15} color={colors.text} strokeWidth={2.2} />
              </Pressable>
            </View>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, marginBottom: 20, lineHeight: 20 }}>
              How long do you want to pause? Your card will not be charged during this time and your expiry date will extend accordingly.
            </Text>

            <View style={{ gap: 8, marginBottom: 20 }}>
              {PAUSE_OPTIONS.map((opt, i) => {
                const active = selectedPause === i
                return (
                  <Pressable
                    key={opt.label}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPause(i) }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingHorizontal: 16, paddingVertical: 14,
                      backgroundColor: active ? `${colors.amber}10` : colors.surface,
                      borderRadius: 14, borderWidth: 1,
                      borderColor: active ? `${colors.amber}40` : colors.border,
                    }}
                  >
                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: active ? colors.amber : 'transparent',
                      borderWidth: active ? 0 : 1.5, borderColor: colors.border,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {active && <Check size={12} color={colors.obsidian} strokeWidth={3} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text }}>{opt.label}</Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>

            <Pressable
              onPress={handlePauseMembership}
              disabled={pausing}
              style={({ pressed }) => ({ width: '100%', opacity: pressed || pausing ? 0.7 : 1 })}
            >
              <View style={[styles.modalActionButton, { backgroundColor: colors.amber }]}>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.obsidian, letterSpacing: -0.3 }}>
                {pausing ? 'Sending request…' : `Pause for ${PAUSE_OPTIONS[selectedPause].label}`}
              </Text>
              </View>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
