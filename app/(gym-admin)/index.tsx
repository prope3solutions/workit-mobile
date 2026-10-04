import { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Settings, Plus, Users, ScanLine, RefreshCw, Camera, Dumbbell, CreditCard } from 'lucide-react-native'
import { useAuthStore } from '@/lib/stores/authStore'
import { colors } from '@/lib/theme/colors'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface ActivityItem {
  id: string
  name: string
  action: string
  time: string
  type: 'checkin' | 'join' | 'renew'
}

function initials(name: string) {
  return name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function ActivityDot({ type }: { type: ActivityItem['type'] }) {
  const bg = type === 'checkin' ? '#00E87A22' : type === 'renew' ? '#F59E0B22' : colors.stone2
  const icon = type === 'checkin'
    ? <ScanLine size={14} color={colors.green} strokeWidth={2} />
    : type === 'renew'
    ? <RefreshCw size={14} color={colors.amber} strokeWidth={2} />
    : <Plus size={14} color={colors.textMuted} strokeWidth={2} />
  return (
    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </View>
  )
}

// Renders ₦ in Syne bold + number in DMMono so both look weighty
function NairaAmount({ amount, size = 26 }: { amount: number; size?: number }) {
  const formatted = amount.toLocaleString('en-NG')
  return (
    <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: size, color: colors.text, letterSpacing: -0.5 }}>
      <Text style={{ fontFamily: 'Syne_700Bold', fontSize: size - 2 }}>₦</Text>
      {formatted}
    </Text>
  )
}

export default function GymAdminDashboard() {
  const user = useAuthStore((s) => s.user)
  const [gymId, setGymId] = useState<string | null>(null)
  const [gymName, setGymName] = useState<string>('')
  const [gymIsActive, setGymIsActive] = useState<boolean | null>(null)
  const [activeCount, setActiveCount] = useState<number | null>(null)
  const [checkinsToday, setCheckinsToday] = useState<number | null>(null)
  const [revenue, setRevenue] = useState<number | null>(null)
  const [expiringMembers, setExpiringMembers] = useState<string[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const { data: adminRow, error: adminError } = await supabase
        .from('gym_admins')
        .select('gym_id, gyms(name, is_active)')
        .eq('user_id', user.id)
        .maybeSingle()
      if (adminError) throw adminError
      const gym = adminRow?.gyms as unknown as { name: string; is_active: boolean } | null
      const gid = adminRow?.gym_id ?? null
      setGymId(gid)
      setGymName(gym?.name ?? '')
      setGymIsActive(gym?.is_active ?? null)
      if (!gid) return

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const [activeRes, checkinsRes, revenueRes, expiringRes, recentCheckinsRes, recentMembershipsRes] = await Promise.all([
        supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('gym_id', gid).eq('status', 'active'),
        supabase.from('gym_check_ins').select('id', { count: 'exact', head: true }).eq('gym_id', gid).gte('checked_in_at', startOfToday),
        supabase.from('memberships').select('gym_payout_naira').eq('gym_id', gid).gte('created_at', startOfMonth),
        supabase.from('memberships').select('users!memberships_member_id_fkey(full_name)').eq('gym_id', gid).eq('status', 'active').lte('end_date', in7days).gte('end_date', startOfToday).limit(5),
        supabase.from('gym_check_ins').select('checked_in_at, users!gym_check_ins_member_id_fkey(full_name)').eq('gym_id', gid).order('checked_in_at', { ascending: false }).limit(6),
        supabase.from('memberships').select('created_at, users!memberships_member_id_fkey(full_name)').eq('gym_id', gid).order('created_at', { ascending: false }).limit(6),
      ])

      if (activeRes.error) throw activeRes.error
      if (checkinsRes.error) throw checkinsRes.error
      if (revenueRes.error) throw revenueRes.error

      setActiveCount(activeRes.count ?? 0)
      setCheckinsToday(checkinsRes.count ?? 0)
      setRevenue((revenueRes.data ?? []).reduce((sum, m) => sum + (m.gym_payout_naira ?? 0), 0))

      if (!expiringRes.error) {
        setExpiringMembers(
          (expiringRes.data ?? []).map((m) =>
            (m.users as unknown as { full_name: string } | null)?.full_name?.split(' ')[0] ?? 'Member'
          )
        )
      }

      const checkinItems = (!recentCheckinsRes.error ? recentCheckinsRes.data ?? [] : []).map((c, i) => ({
        id: `ci-${i}`, name: (c.users as unknown as { full_name: string } | null)?.full_name ?? 'Member',
        action: 'checked in', time: c.checked_in_at ?? new Date(0).toISOString(), type: 'checkin' as const, sortAt: c.checked_in_at ?? new Date(0).toISOString(),
      }))
      const memberItems = (!recentMembershipsRes.error ? recentMembershipsRes.data ?? [] : []).map((m, i) => ({
        id: `mb-${i}`, name: (m.users as unknown as { full_name: string } | null)?.full_name ?? 'Member',
        action: 'joined', time: m.created_at ?? new Date(0).toISOString(), type: 'join' as const, sortAt: m.created_at ?? new Date(0).toISOString(),
      }))
      const combined = [...checkinItems, ...memberItems]
        .sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime())
        .slice(0, 6)
        .map(({ sortAt, ...rest }) => ({ ...rest, time: formatRelativeTime(rest.time) }))
      setActivity(combined)
    } catch (err) {
      logger.error('gymAdmin', 'fetchDashboard', err)
    } finally {
      setLoaded(true)
    }
  }, [user])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    if (h < 21) return 'Good evening'
    return 'Hey'
  })()

  const isEmpty = loaded && (activeCount === 0 || activeCount === null)

  // ── EMPTY STATE ────────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', paddingTop: 100, paddingHorizontal: 32, marginBottom: 40 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: '#00E87A18',
              alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <Users size={28} color={colors.green} strokeWidth={1.6} />
            </View>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, color: colors.text, textAlign: 'center', letterSpacing: -0.4, marginBottom: 8 }}>
              Your gym is live.
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
              Add your first member to get started.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(gym-admin)/add-member')}
              style={{
                backgroundColor: colors.green, borderRadius: 14,
                paddingHorizontal: 28, paddingVertical: 14,
                flexDirection: 'row', alignItems: 'center', gap: 8,
              }}
            >
              <Plus size={18} color={colors.obsidian} strokeWidth={2.5} />
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.obsidian }}>Add a member</Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 24 }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
              Get set up
            </Text>
            {[
              { Icon: Camera, label: 'Upload gym photos', sub: 'Show off your space.', route: '/(gym-admin)/settings' as const },
              { Icon: Dumbbell, label: 'List your equipment', sub: 'Help members find you.', route: '/(gym-admin)/settings' as const },
              { Icon: CreditCard, label: 'Add a plan', sub: 'Start accepting members.', route: '/(gym-admin)/settings' as const },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => router.push(item.route)}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: colors.surface, borderRadius: 14,
                  borderWidth: 1, borderColor: colors.border,
                  padding: 16, marginBottom: 10, gap: 14,
                }}
              >
                <View style={{
                  width: 38, height: 38, borderRadius: 10,
                  backgroundColor: colors.stone2,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <item.Icon size={18} color={colors.textMuted} strokeWidth={1.7} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>{item.label}</Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 1 }}>{item.sub}</Text>
                </View>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 18, color: colors.textMuted }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    )
  }

  // ── FULL DASHBOARD ─────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, color: colors.text, letterSpacing: -0.5 }}>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 18, letterSpacing: -0.3 }}>{greeting}, </Text>
                {gymName || user?.full_name?.split(' ')[0] || 'Admin'}.
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, marginTop: 2 }}>
                {gymName || 'Your gym overview'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(gym-admin)/settings')}
              hitSlop={12}
              style={{
                width: 38, height: 38, borderRadius: 19,
                backgroundColor: colors.surface2,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Settings size={18} color={colors.textMuted} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </View>

        {gymIsActive === false && (
          <View style={{
            marginHorizontal: 24, marginBottom: 16, padding: 14, borderRadius: 14,
            backgroundColor: '#FFF9EB', borderWidth: 1, borderColor: '#F6D860',
          }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#92680A', marginBottom: 2 }}>Pending review</Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#92680A', lineHeight: 19 }}>
              Your gym isn't visible to members yet. We review new gyms within 24 hours.
            </Text>
          </View>
        )}

        {/* Stat cards — top row */}
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 12 }}>
          {[
            { label: 'Active Members', value: activeCount, sub: 'total active' },
            { label: 'Check-ins Today', value: checkinsToday, sub: 'since midnight' },
          ].map((stat) => (
            <View key={stat.label} style={{
              flex: 1, backgroundColor: colors.surface,
              borderRadius: 16, padding: 16,
              borderWidth: 1, borderColor: colors.border,
            }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>
                {stat.label}
              </Text>
              <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 32, color: colors.text, marginTop: 6, letterSpacing: -1 }}>
                {stat.value === null ? '—' : stat.value}
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {stat.sub}
              </Text>
            </View>
          ))}
        </View>

        {/* Revenue — full width, taps through to payouts */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(gym-admin)/payouts') }}
          style={{
            marginHorizontal: 24, marginBottom: 20,
            backgroundColor: colors.surface, borderRadius: 16,
            padding: 16, borderWidth: 1, borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>
              Revenue this month
            </Text>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.green }}>
              View payouts →
            </Text>
          </View>
          {revenue === null
            ? <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 32, color: colors.text, letterSpacing: -1 }}>—</Text>
            : <NairaAmount amount={revenue} size={30} />
          }
        </TouchableOpacity>

        {/* Quick actions */}
        <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
            Quick actions
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'Add\nmember', Icon: Plus, route: '/(gym-admin)/add-member' as const, accent: false },
              { label: 'View\nmembers', Icon: Users, route: '/(gym-admin)/members' as const, accent: false },
              { label: 'Check in', Icon: ScanLine, route: '/(gym-admin)/checkins' as const, accent: true },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                onPress={() => router.push(action.route)}
                style={{
                  flex: 1, backgroundColor: action.accent ? colors.obsidian : colors.surface,
                  borderRadius: 14, paddingVertical: 16, alignItems: 'center', gap: 8,
                  borderWidth: action.accent ? 0 : 1, borderColor: colors.border,
                }}
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: action.accent ? colors.green : colors.stone2,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <action.Icon size={18} color={action.accent ? colors.obsidian : colors.textMuted} strokeWidth={2} />
                </View>
                <Text style={{
                  fontFamily: 'DMSans_500Medium', fontSize: 12,
                  color: action.accent ? colors.white : colors.text, textAlign: 'center',
                }}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pending renewals */}
        {expiringMembers.length > 0 && (
          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
              Pending renewals
            </Text>
            <View style={{
              backgroundColor: '#FFF9EB', borderRadius: 14,
              borderWidth: 1, borderColor: '#F6D860', padding: 16,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <RefreshCw size={16} color={colors.amber} strokeWidth={1.8} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#92680A' }}>
                    {expiringMembers.length} membership{expiringMembers.length !== 1 ? 's' : ''} expiring this week
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#B8860B', marginTop: 3 }}>
                    {expiringMembers.join(' · ')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(gym-admin)/members')}
                style={{
                  backgroundColor: colors.obsidian, borderRadius: 10,
                  paddingVertical: 9, paddingHorizontal: 16, alignSelf: 'flex-start',
                }}
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.white }}>
                  Send renewal nudges
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Recent activity */}
        <View style={{ paddingHorizontal: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>Recent activity</Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>Last 24 hours</Text>
          </View>

          {activity.length === 0 ? (
            <View style={{
              backgroundColor: colors.surface, borderRadius: 14,
              borderWidth: 1, borderColor: colors.border,
              padding: 24, alignItems: 'center',
            }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted }}>
                No activity yet today.
              </Text>
            </View>
          ) : (
            <View>
              {activity.map((item, i) => (
                <View key={item.id} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingVertical: 11,
                  borderBottomWidth: i < activity.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}>
                  <ActivityDot type={item.type} />
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.text, flex: 1 }}>
                    <Text style={{ fontFamily: 'DMSans_500Medium' }}>{item.name}</Text>{' '}{item.action}
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>
                    {item.time}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
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
