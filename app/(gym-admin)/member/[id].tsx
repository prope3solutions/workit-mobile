import { useCallback, useState } from 'react'
import { View, Text, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { colors } from '@/lib/theme/colors'
import { WCard } from '@/components/ui/WCard'
import { WBadge } from '@/components/ui/WBadge'
import { WButton } from '@/components/ui/WButton'
import { useAuthStore } from '@/lib/stores/authStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { formatDate, formatTime } from '@/lib/utils/formatDate'

interface MemberDetail {
  membershipId: string
  fullName: string
  email: string
  phone: string | null
  status: string
  planName: string
  startDate: string
  endDate: string
  amountPaid: number
  paymentMethod: string
}

interface CheckIn {
  id: string
  checkedInAt: string
}

function initials(name: string) {
  return name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const [gymId, setGymId] = useState<string | null>(null)
  const [detail, setDetail] = useState<MemberDetail | null>(null)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!user || !id) return
    try {
      const { data: adminRow, error: adminError } = await supabase
        .from('gym_admins')
        .select('gym_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (adminError) throw adminError
      const gid = adminRow?.gym_id
      setGymId(gid ?? null)
      if (!gid) return

      const { data: membership, error: membershipError } = await supabase
        .from('memberships')
        .select('id, status, start_date, end_date, amount_paid_naira, payment_method, users!memberships_member_id_fkey(full_name, email, phone), membership_plans(name)')
        .eq('gym_id', gid)
        .eq('member_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (membershipError) throw membershipError

      if (membership) {
        const u = membership.users as unknown as { full_name: string; email: string; phone: string | null } | null
        const plan = membership.membership_plans as unknown as { name: string } | null
        setDetail({
          membershipId: membership.id,
          fullName: u?.full_name ?? 'Member',
          email: u?.email ?? '',
          phone: u?.phone ?? null,
          status: membership.status,
          planName: plan?.name ?? 'No plan',
          startDate: membership.start_date,
          endDate: membership.end_date,
          amountPaid: membership.amount_paid_naira,
          paymentMethod: membership.payment_method,
        })
      }

      const { data: checkinRows, error: checkinError } = await supabase
        .from('gym_check_ins')
        .select('id, checked_in_at')
        .eq('gym_id', gid)
        .eq('member_id', id)
        .order('checked_in_at', { ascending: false })
        .limit(10)
      if (checkinError) throw checkinError
      setCheckIns((checkinRows ?? []).map((c) => ({ id: c.id, checkedInAt: c.checked_in_at })))
    } catch (err) {
      logger.error('gymAdmin', 'fetchMemberDetail', err)
    } finally {
      setLoading(false)
    }
  }, [user, id])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  async function handleCheckIn() {
    if (!gymId || !id) return
    try {
      setBusy(true)
      const { error } = await supabase.from('gym_check_ins').insert({ member_id: id, gym_id: gymId })
      if (error) throw error
      await load()
    } catch (err) {
      logger.error('gymAdmin', 'manualCheckInFromDetail', err)
      Alert.alert('Error', 'Could not check in this member.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!detail) return
    Alert.alert('Remove member', `Remove ${detail.fullName} from this gym? This cancels their membership.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true)
            const { error } = await supabase
              .from('memberships')
              .update({ status: 'cancelled' })
              .eq('id', detail.membershipId)
            if (error) throw error
            router.back()
          } catch (err) {
            logger.error('gymAdmin', 'removeMember', err)
            Alert.alert('Error', 'Could not remove this member.')
          } finally {
            setBusy(false)
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} />
      </View>
    )
  }

  if (!detail) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', color: colors.textMuted, textAlign: 'center' }}>
          No membership found for this member.
        </Text>
      </View>
    )
  }

  const badgeVariant = detail.status === 'active' ? 'green' : detail.status === 'expired' ? 'ember' : 'slate'

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.text }}>Member</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: '#00E87A14',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, color: colors.green }}>
              {initials(detail.fullName)}
            </Text>
          </View>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.text }}>{detail.fullName}</Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
            {detail.email}
          </Text>
          {detail.phone && (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              {detail.phone}
            </Text>
          )}
          <View style={{ marginTop: 10 }}>
            <WBadge label={detail.status.charAt(0).toUpperCase() + detail.status.slice(1)} variant={badgeVariant} />
          </View>
        </View>

        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.text, marginBottom: 10 }}>
          Current membership
        </Text>
        <WCard style={{ marginBottom: 20, gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          {[
            { label: 'Plan', value: detail.planName },
            { label: 'Started', value: formatDate(detail.startDate) },
            { label: 'Expires', value: formatDate(detail.endDate) },
            { label: 'Amount paid', value: formatCurrency(detail.amountPaid) },
            { label: 'Payment method', value: detail.paymentMethod.toUpperCase() },
          ].map((row) => (
            <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted }}>{row.label}</Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>{row.value}</Text>
            </View>
          ))}
        </WCard>

        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.text, marginBottom: 10 }}>
          Check-in history
        </Text>
        <WCard style={{ marginBottom: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          {checkIns.length === 0 ? (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 }}>
              No check-ins yet.
            </Text>
          ) : (
            checkIns.map((c, i) => (
              <View
                key={c.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.text }}>
                  {formatDate(c.checkedInAt)}
                </Text>
                <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 13, color: colors.textMuted }}>
                  {formatTime(c.checkedInAt)}
                </Text>
              </View>
            ))
          )}
        </WCard>

        <View style={{ gap: 12 }}>
          <WButton label="Check in now" variant="green" onPress={handleCheckIn} loading={busy} />
          <WButton
            label="Renew / change plan"
            variant="dark"
            onPress={() => router.push('/(gym-admin)/add-member')}
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          />
          <WButton label="Remove member" variant="danger" onPress={handleRemove} loading={busy} />
        </View>
      </ScrollView>
    </View>
  )
}
