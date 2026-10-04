import { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Bell, CalendarClock, XCircle, Wallet, BadgeCheck } from 'lucide-react-native'
import { colors } from '@/lib/theme/colors'
import { useAuthStore } from '@/lib/stores/authStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { NotificationType } from '@/types/database'

const TRAINER_TYPES: NotificationType[] = ['trainer_booking', 'booking_cancelled', 'booking_reminder', 'payment_received', 'trainer_approved']

interface NotificationRow {
  id: string
  title: string
  body: string
  type: NotificationType | null
  isRead: boolean
  createdAt: string
}

function iconFor(type: NotificationType | null) {
  switch (type) {
    case 'trainer_booking': return CalendarClock
    case 'booking_cancelled': return XCircle
    case 'payment_received': return Wallet
    case 'trainer_approved': return BadgeCheck
    default: return Bell
  }
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function TrainerNotificationsScreen() {
  const user = useAuthStore((s) => s.user)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, body, type, is_read, created_at')
        .eq('user_id', user.id)
        .in('type', TRAINER_TYPES)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      setNotifications((data ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        type: n.type,
        isRead: Boolean(n.is_read),
        createdAt: n.created_at ?? new Date(0).toISOString(),
      })))
    } catch (err) {
      logger.error('trainerDashboard', 'fetchNotifications', err)
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

  async function handleTap(item: NotificationRow) {
    if (item.isRead) return
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', item.id)
      if (error) throw error
      setNotifications((prev) => prev.map((n) => n.id === item.id ? { ...n, isRead: true } : n))
    } catch (err) {
      logger.error('trainerDashboard', 'markNotificationRead', err)
    }
  }

  const noNotifications = !loading && notifications.length === 0

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, color: colors.text, letterSpacing: -0.5 }}>Notifications</Text>
      </View>

      {noNotifications ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: colors.stone2,
            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Bell size={28} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.text, marginBottom: 6, textAlign: 'center' }}>
            No notifications yet
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
            Booking and payment updates will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
          renderItem={({ item }) => {
            const Icon = iconFor(item.type)
            return (
              <TouchableOpacity
                onPress={() => handleTap(item)}
                style={{
                  flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View style={{
                  width: 38, height: 38, borderRadius: 12,
                  backgroundColor: item.isRead ? colors.stone2 : '#00E87A18',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={17} color={item.isRead ? colors.textMuted : colors.green} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: item.isRead ? 'DMSans_400Regular' : 'DMSans_500Medium', fontSize: 14, color: colors.text }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                    {item.body}
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textFaint, marginTop: 4 }}>
                    {formatRelativeTime(item.createdAt)}
                  </Text>
                </View>
                {!item.isRead && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green, marginTop: 6 }} />
                )}
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}
