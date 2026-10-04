import { useCallback, useState } from 'react'
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native'
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
import { formatDate } from '@/lib/utils/formatDate'
import { BookingStatus } from '@/types/database'

interface BookingDetail {
  id: string
  memberName: string
  memberEmail: string
  memberPhone: string | null
  gymName: string | null
  serviceType: string
  sessionDate: string
  sessionTimeBlock: string | null
  payout: number
  status: BookingStatus
  cancellationReason: string | null
}

function initials(name: string) {
  return name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

const SERVICE_LABELS: Record<string, string> = {
  gym_training: 'Gym Training',
  home_training: 'Home Training',
  online_coaching: 'Online Coaching',
}

export default function TrainerBookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const [detail, setDetail] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!user || !id) return
    try {
      const { data: profile, error: profileError } = await supabase
        .from('trainer_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (profileError) throw profileError
      const trainerId = profile?.id
      if (!trainerId) return

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, service_type, session_date, session_time_block, trainer_payout_naira, status, cancellation_reason, users!bookings_member_id_fkey(full_name, email, phone), gyms(name)')
        .eq('trainer_id', trainerId)
        .eq('id', id)
        .maybeSingle()
      if (bookingError) throw bookingError

      if (booking) {
        const u = booking.users as unknown as { full_name: string; email: string; phone: string | null } | null
        const gym = booking.gyms as unknown as { name: string } | null
        setDetail({
          id: booking.id,
          memberName: u?.full_name ?? 'Member',
          memberEmail: u?.email ?? '',
          memberPhone: u?.phone ?? null,
          gymName: gym?.name ?? null,
          serviceType: booking.service_type,
          sessionDate: booking.session_date,
          sessionTimeBlock: booking.session_time_block,
          payout: booking.trainer_payout_naira,
          status: booking.status as BookingStatus,
          cancellationReason: booking.cancellation_reason,
        })
      }
    } catch (err) {
      logger.error('trainerDashboard', 'fetchBookingDetail', err)
    } finally {
      setLoading(false)
    }
  }, [user, id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleMarkComplete() {
    if (!detail) return
    Alert.alert('Mark as completed', `Mark this session with ${detail.memberName} as completed?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark complete',
        onPress: async () => {
          try {
            setBusy(true)
            const { error } = await supabase
              .from('bookings')
              .update({ status: 'completed' })
              .eq('id', detail.id)
            if (error) throw error
            await load()
          } catch (err) {
            logger.error('trainerDashboard', 'markBookingComplete', err)
            Alert.alert('Error', 'Could not mark this session as completed.')
          } finally {
            setBusy(false)
          }
        },
      },
    ])
  }

  function handleCancel() {
    if (!detail) return
    Alert.alert('Cancel booking', `Cancel this session with ${detail.memberName}?`, [
      { text: 'Keep booking', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true)
            const { error } = await supabase
              .from('bookings')
              .update({ status: 'cancelled', cancelled_by: 'trainer', cancellation_reason: 'Cancelled by trainer' })
              .eq('id', detail.id)
            if (error) throw error
            await load()
          } catch (err) {
            logger.error('trainerDashboard', 'cancelBooking', err)
            Alert.alert('Error', 'Could not cancel this booking.')
          } finally {
            setBusy(false)
          }
        },
      },
    ])
  }

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.obsidian }} />
  }

  if (!detail) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.obsidian, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', color: colors.slate, textAlign: 'center' }}>
          Booking not found.
        </Text>
      </View>
    )
  }

  const badgeVariant = detail.status === 'completed' ? 'green' : detail.status === 'cancelled' ? 'ember' : detail.status === 'upcoming' ? 'amber' : 'slate'
  const canAct = detail.status === 'upcoming'

  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={colors.white} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.white }}>Booking</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: colors.deep,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, color: colors.green }}>
              {initials(detail.memberName)}
            </Text>
          </View>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.white }}>{detail.memberName}</Text>
          {detail.memberEmail && (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.slate, marginTop: 4 }}>
              {detail.memberEmail}
            </Text>
          )}
          {detail.memberPhone && (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.slate, marginTop: 2 }}>
              {detail.memberPhone}
            </Text>
          )}
          <View style={{ marginTop: 10 }}>
            <WBadge label={detail.status.charAt(0).toUpperCase() + detail.status.slice(1)} variant={badgeVariant} />
          </View>
        </View>

        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.white, marginBottom: 10 }}>
          Session details
        </Text>
        <WCard style={{ marginBottom: 20, gap: 12 }}>
          {[
            { label: 'Date', value: formatDate(detail.sessionDate) },
            { label: 'Time', value: detail.sessionTimeBlock ? detail.sessionTimeBlock.charAt(0).toUpperCase() + detail.sessionTimeBlock.slice(1) : '—' },
            { label: 'Gym', value: detail.gymName ?? 'Independent (no gym)' },
            { label: 'Service type', value: SERVICE_LABELS[detail.serviceType] ?? detail.serviceType },
            { label: 'Your payout', value: formatCurrency(detail.payout) },
          ].map((row) => (
            <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.slate }}>{row.label}</Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.white }}>{row.value}</Text>
            </View>
          ))}
          {detail.cancellationReason && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.slate }}>Cancellation reason</Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.white, flex: 1, textAlign: 'right' }}>{detail.cancellationReason}</Text>
            </View>
          )}
        </WCard>

        {canAct && (
          <View style={{ gap: 12 }}>
            <WButton label="Mark as completed" variant="green" onPress={handleMarkComplete} loading={busy} />
            <WButton label="Cancel booking" variant="danger" onPress={handleCancel} loading={busy} />
          </View>
        )}
      </ScrollView>
    </View>
  )
}
