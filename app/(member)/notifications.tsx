import { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Pressable } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import {
  ArrowLeft, Bell, CalendarClock, XCircle, Wallet, BadgeCheck,
  CalendarCheck, RefreshCw, Megaphone, Mail,
} from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { useAuthStore } from '@/lib/stores/authStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { NotificationType } from '@/types/database'

// Member-relevant notification types (membership, payments, check-ins, invites, bookings)
const MEMBER_TYPES: NotificationType[] = [
  'renewal_reminder', 'membership_activated', 'check_in', 'invite',
  'announcement', 'payment_received', 'booking_reminder', 'booking_cancelled', 'trainer_booking',
]

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
    case 'renewal_reminder': return RefreshCw
    case 'membership_activated': return BadgeCheck
    case 'check_in': return CalendarCheck
    case 'payment_received': return Wallet
    case 'booking_reminder': return CalendarClock
    case 'booking_cancelled': return XCircle
    case 'trainer_booking': return CalendarClock
    case 'announcement': return Megaphone
    case 'invite': return Mail
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

export default function MemberNotificationsScreen() {
  const colors = useColors()
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
        .in('type', MEMBER_TYPES)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      setNotifications((data ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        type: n.type as NotificationType | null,
        isRead: n.is_read ?? false,
        createdAt: n.created_at ?? new Date(0).toISOString(),
      })))
    } catch (err) {
      logger.error('memberDashboard', 'fetchNotifications', err)
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

  const unreadCount = notifications.filter((n) => !n.isRead).length

  async function handleTap(item: NotificationRow) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (item.isRead) return
    // Optimistic — flip locally first, then persist
    setNotifications((prev) => prev.map((n) => n.id === item.id ? { ...n, isRead: true } : n))
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', item.id)
      if (error) throw error
    } catch (err) {
      logger.error('memberDashboard', 'markNotificationRead', err)
    }
  }

  async function markAllRead() {
    if (unreadCount === 0) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
      if (error) throw error
    } catch (err) {
      logger.error('memberDashboard', 'markAllRead', err)
    }
  }

  const noNotifications = !loading && notifications.length === 0

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
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
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, letterSpacing: -0.4, color: colors.text, flex: 1 }}>
          Notifications
        </Text>
        {unreadCount > 0 && (
          <Pressable
            onPress={markAllRead}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingHorizontal: 4, paddingVertical: 2 })}
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.green }}>
              Mark all read
            </Text>
          </Pressable>
        )}
      </View>

      {noNotifications ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 20,
            backgroundColor: colors.stone2,
            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Bell size={28} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.text, marginBottom: 6, textAlign: 'center' }}>
            No notifications yet
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
            Membership, payment and check-in updates will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
          renderItem={({ item }) => {
            const Icon = iconFor(item.type)
            return (
              <TouchableOpacity
                activeOpacity={0.7}
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
                  backgroundColor: item.isRead ? colors.stone2 : `${colors.green}18`,
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
