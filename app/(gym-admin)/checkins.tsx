import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  Alert, Modal, Animated, Pressable,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { ScanLine, Search, CheckCircle, UserCheck } from 'lucide-react-native'
import { colors } from '@/lib/theme/colors'
import { useAuthStore } from '@/lib/stores/authStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatTime } from '@/lib/utils/formatDate'
import { native } from '@/lib/anim'

interface TodayCheckIn {
  id: string
  fullName: string
  checkedInAt: string
}

interface ActiveMember {
  memberId: string
  fullName: string
  planName: string
}

function initials(name: string) {
  return name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

// ── Check-in overlay ───────────────────────────────────────────────────────────
function CheckInOverlay({
  visible,
  members,
  onClose,
  onCheckIn,
  checkingInId,
}: {
  visible: boolean
  members: ActiveMember[]
  onClose: () => void
  onCheckIn: (memberId: string) => void
  checkingInId: string | null
}) {
  const [query, setQuery] = useState('')
  const sheetY = useRef(new Animated.Value(600)).current
  const backdropOp = useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    if (visible) {
      setQuery('')
      Animated.parallel([
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: native, speed: 22, bounciness: 4 }),
        Animated.timing(backdropOp, { toValue: 1, duration: 200, useNativeDriver: native }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(sheetY, { toValue: 600, duration: 220, useNativeDriver: native }),
        Animated.timing(backdropOp, { toValue: 0, duration: 180, useNativeDriver: native }),
      ]).start()
    }
  }, [visible])

  const filtered = useMemo(() => {
    if (!query.trim()) return members
    const q = query.trim().toLowerCase()
    return members.filter((m) => m.fullName.toLowerCase().includes(q))
  }, [members, query])

  if (!visible) return null

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: backdropOp }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.surface,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingTop: 12, paddingBottom: 40,
        maxHeight: '75%',
        transform: [{ translateY: sheetY }],
      }}>
        {/* Pull handle */}
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />

        {/* Header */}
        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.text, letterSpacing: -0.4, marginBottom: 4 }}>
            Check in a member
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted }}>
            Search by name to check in
          </Text>
        </View>

        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: colors.bg, borderRadius: 12,
          borderWidth: 1, borderColor: colors.border,
          paddingHorizontal: 14, paddingVertical: 11,
          marginHorizontal: 24, marginBottom: 4,
        }}>
          <Search size={16} color={colors.textMuted} strokeWidth={1.8} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search member..."
            placeholderTextColor={colors.textFaint}
            autoFocus
            style={{
              flex: 1, fontFamily: 'DMSans_400Regular',
              fontSize: 15, color: colors.text, padding: 0,
            }}
          />
        </View>

        {/* Member list */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.memberId}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted }}>
                {query ? `No members match "${query}"` : 'No active members'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isChecking = checkingInId === item.memberId
            return (
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 11, borderBottomWidth: 1,
                borderBottomColor: colors.border, gap: 12,
              }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: colors.stone2,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 13, color: colors.text }}>
                    {initials(item.fullName)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>{item.fullName}</Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                    {item.planName}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onCheckIn(item.memberId)}
                  disabled={isChecking}
                  style={({ pressed }) => ({
                    backgroundColor: colors.green,
                    borderRadius: 10,
                    paddingHorizontal: 14, paddingVertical: 8,
                    opacity: isChecking || pressed ? 0.6 : 1,
                  })}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.onAccent }}>
                    {isChecking ? '...' : 'Check in'}
                  </Text>
                </Pressable>
              </View>
            )
          }}
        />
      </Animated.View>
    </Modal>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function AdminCheckInsScreen() {
  const user = useAuthStore((s) => s.user)
  const [gymId, setGymId] = useState<string | null>(null)
  const [todayCheckIns, setTodayCheckIns] = useState<TodayCheckIn[]>([])
  const [activeMembers, setActiveMembers] = useState<ActiveMember[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingInId, setCheckingInId] = useState<string | null>(null)
  const [overlayOpen, setOverlayOpen] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const { data: adminRow, error: adminError } = await supabase
        .from('gym_admins').select('gym_id').eq('user_id', user.id).maybeSingle()
      if (adminError) throw adminError
      const gid = adminRow?.gym_id ?? null
      setGymId(gid)
      if (!gid) return

      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

      const [checkinsRes, membersRes] = await Promise.all([
        supabase
          .from('gym_check_ins')
          .select('id, checked_in_at, users!gym_check_ins_member_id_fkey(full_name)')
          .eq('gym_id', gid)
          .gte('checked_in_at', startOfToday)
          .order('checked_in_at', { ascending: false }),
        supabase
          .from('memberships')
          .select('member_id, users!memberships_member_id_fkey(full_name), membership_plans(name)')
          .eq('gym_id', gid)
          .eq('status', 'active'),
      ])
      if (checkinsRes.error) throw checkinsRes.error
      if (membersRes.error) throw membersRes.error

      setTodayCheckIns((checkinsRes.data ?? []).map((c) => ({
        id: c.id,
        fullName: (c.users as unknown as { full_name: string } | null)?.full_name ?? 'Member',
        checkedInAt: c.checked_in_at,
      })))
      setActiveMembers((membersRes.data ?? []).map((m) => ({
        memberId: m.member_id,
        fullName: (m.users as unknown as { full_name: string } | null)?.full_name ?? 'Member',
        planName: (m.membership_plans as unknown as { name: string } | null)?.name ?? 'No plan',
      })))
    } catch (err) {
      logger.error('gymAdmin', 'fetchCheckins', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleCheckIn(memberId: string) {
    if (!gymId) return
    try {
      setCheckingInId(memberId)
      const { error } = await supabase.from('gym_check_ins').insert({ member_id: memberId, gym_id: gymId })
      if (error) throw error
      setOverlayOpen(false)
      await load()
    } catch (err) {
      logger.error('gymAdmin', 'manualCheckIn', err)
      Alert.alert('Error', 'Could not check in this member.')
    } finally {
      setCheckingInId(null)
    }
  }

  const noCheckInsToday = !loading && todayCheckIns.length === 0

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: colors.bg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, color: colors.text, letterSpacing: -0.5 }}>
            Check-ins
          </Text>
          {/* Check-in button */}
          <TouchableOpacity
            onPress={() => setOverlayOpen(true)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: colors.obsidian,
              paddingHorizontal: 14, paddingVertical: 9,
              borderRadius: 12,
            }}
          >
            <UserCheck size={15} color={colors.white} strokeWidth={2} />
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.white }}>
              Check in
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's check-ins or empty state */}
      {noCheckInsToday ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: colors.stone2,
            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <ScanLine size={28} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.text, marginBottom: 6, textAlign: 'center' }}>
            No check-ins today
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            Tap "Check in" above to manually check in a member.
          </Text>
        </View>
      ) : (
        <FlatList
          data={todayCheckIns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>
              Today · {todayCheckIns.length} check-in{todayCheckIns.length !== 1 ? 's' : ''}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingVertical: 13, borderBottomWidth: 1,
              borderBottomColor: colors.border, gap: 12,
            }}>
              <View style={{
                width: 42, height: 42, borderRadius: 13,
                backgroundColor: '#00E87A14',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={18} color={colors.green} strokeWidth={1.8} />
              </View>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text, flex: 1 }}>
                {item.fullName}
              </Text>
              <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 13, color: colors.textMuted }}>
                {formatTime(item.checkedInAt)}
              </Text>
            </View>
          )}
        />
      )}

      {/* Check-in overlay */}
      <CheckInOverlay
        visible={overlayOpen}
        members={activeMembers}
        onClose={() => setOverlayOpen(false)}
        onCheckIn={handleCheckIn}
        checkingInId={checkingInId}
      />
    </View>
  )
}
