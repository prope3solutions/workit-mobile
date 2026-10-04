import { useCallback, useMemo, useState } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { CalendarDays, Search } from 'lucide-react-native'
import { colors } from '@/lib/theme/colors'
import { WBadge } from '@/components/ui/WBadge'
import { useAuthStore } from '@/lib/stores/authStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatDate } from '@/lib/utils/formatDate'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { BookingStatus } from '@/types/database'

type FilterTab = 'upcoming' | 'past' | 'cancelled' | 'completed'

interface BookingRow {
  id: string
  memberName: string
  serviceType: string
  sessionDate: string
  payout: number
  status: BookingStatus
}

function initials(name: string) {
  return name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

const AVATAR_COLORS = ['#00E87A14', '#F59E0B14', '#FF444414', '#6366F114']

export default function TrainerBookingsScreen() {
  const user = useAuthStore((s) => s.user)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<FilterTab>('upcoming')
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const { data: profile, error: profileError } = await supabase
        .from('trainer_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (profileError) throw profileError
      const trainerId = profile?.id
      if (!trainerId) return

      const { data, error } = await supabase
        .from('bookings')
        .select('id, service_type, session_date, trainer_payout_naira, status, users!bookings_member_id_fkey(full_name)')
        .eq('trainer_id', trainerId)
        .order('session_date', { ascending: false })
      if (error) throw error

      const rows: BookingRow[] = (data ?? []).map((b) => ({
        id: b.id,
        memberName: (b.users as unknown as { full_name: string } | null)?.full_name ?? 'Member',
        serviceType: b.service_type,
        sessionDate: b.session_date,
        payout: b.trainer_payout_naira,
        status: b.status as BookingStatus,
      }))
      setBookings(rows)
    } catch (err) {
      logger.error('trainerDashboard', 'fetchBookings', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const todayStr = new Date().toISOString().slice(0, 10)

  function matchesTab(b: BookingRow, t: FilterTab) {
    if (t === 'cancelled') return b.status === 'cancelled'
    if (t === 'completed') return b.status === 'completed'
    if (t === 'upcoming') return b.status === 'upcoming' && b.sessionDate >= todayStr
    if (t === 'past') return (b.status === 'upcoming' && b.sessionDate < todayStr) || b.status === 'pending_payment'
    return false
  }

  const counts = useMemo(() => ({
    upcoming: bookings.filter((b) => matchesTab(b, 'upcoming')).length,
    past: bookings.filter((b) => matchesTab(b, 'past')).length,
    cancelled: bookings.filter((b) => matchesTab(b, 'cancelled')).length,
    completed: bookings.filter((b) => matchesTab(b, 'completed')).length,
  }), [bookings])

  const filtered = useMemo(() => {
    const byTab = bookings.filter((b) => matchesTab(b, tab))
    if (!query.trim()) return byTab
    const q = query.trim().toLowerCase()
    return byTab.filter((b) => b.memberName.toLowerCase().includes(q))
  }, [bookings, tab, query])

  const noBookings = !loading && bookings.length === 0

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'completed', label: 'Completed' },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: colors.bg }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, color: colors.text, letterSpacing: -0.5, marginBottom: 20 }}>
          Bookings
        </Text>

        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: colors.surface, borderRadius: 12,
          borderWidth: 1, borderColor: colors.border,
          paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
        }}>
          <Search size={16} color={colors.textMuted} strokeWidth={1.8} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search bookings..."
            placeholderTextColor={colors.textFaint}
            style={{
              flex: 1, fontFamily: 'DMSans_400Regular',
              fontSize: 15, color: colors.text, padding: 0,
            }}
          />
        </View>

        {/* Filter tabs */}
        {!noBookings && (
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTab(t.key)}
                style={{
                  flex: 1, minWidth: '22%', paddingVertical: 9, borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: tab === t.key ? colors.obsidian : colors.surface,
                  borderWidth: 1,
                  borderColor: tab === t.key ? colors.obsidian : colors.border,
                }}
              >
                <Text style={{
                  fontFamily: 'DMSans_500Medium', fontSize: 12,
                  color: tab === t.key ? colors.white : colors.textMuted,
                }}>
                  {t.label} ({counts[t.key]})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Empty — no bookings at all */}
      {noBookings ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: colors.stone2,
            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <CalendarDays size={28} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.text, marginBottom: 6, textAlign: 'center' }}>
            No bookings yet
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
            Sessions members book with you will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 48 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text, marginBottom: 4 }}>
                No {tab} bookings
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>
                {query ? `No results for "${query}"` : `You have no ${tab} bookings right now.`}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const avatarBg = AVATAR_COLORS[index % AVATAR_COLORS.length]
            return (
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/(trainer)/booking/[id]', params: { id: item.id } })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  gap: 12,
                }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: avatarBg,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 14, color: colors.text }}>
                    {initials(item.memberName)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text }}>
                    {item.memberName}
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                    {formatDate(item.sessionDate)} · {formatCurrency(item.payout)}
                  </Text>
                </View>
                <WBadge
                  label={item.status === 'upcoming' ? 'Upcoming' : item.status === 'completed' ? 'Completed' : item.status === 'cancelled' ? 'Cancelled' : 'Pending'}
                  variant={item.status === 'completed' ? 'green' : item.status === 'cancelled' ? 'ember' : item.status === 'upcoming' ? 'amber' : 'slate'}
                />
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}
