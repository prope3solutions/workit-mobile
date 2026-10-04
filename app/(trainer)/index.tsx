import { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Image, Pressable, StyleSheet } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { CalendarDays, Clock3, TrendingUp, Star, CheckCircle2, ChevronRight, Bell, CalendarClock, ArrowUp, Banknote } from 'lucide-react-native'
import { useAuthStore } from '@/lib/stores/authStore'
import { colors } from '@/lib/theme/colors'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatCurrency } from '@/lib/utils/formatCurrency'

const DUMBBELL_BG = require('../../screens/dumbell.jpg')

interface ActivityItem {
  id: string
  name: string
  action: string
  time: string
  type: 'booked' | 'completed' | 'cancelled'
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

function initials(name: string) {
  return name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export default function TrainerDashboard() {
  const user = useAuthStore((s) => s.user)
  const [status, setStatus] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string>('')
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null)
  const [todayCount, setTodayCount] = useState<number | null>(null)
  const [monthlyEarnings, setMonthlyEarnings] = useState<number | null>(null)
  const [earningsChange, setEarningsChange] = useState<number | null>(null)
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [completedCount, setCompletedCount] = useState<number | null>(null)
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [ratingChange, setRatingChange] = useState<number | null>(null)
  const [completedChange, setCompletedChange] = useState<number | null>(null)
  const [pendingChange, setPendingChange] = useState<number | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [currentMonth, setCurrentMonth] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    try {
      const { data: profile, error: profileError } = await supabase
        .from('trainer_profiles')
        .select('id, display_name, status, avg_rating, review_count')
        .eq('user_id', user.id)
        .maybeSingle()
      if (profileError) throw profileError
      const tid = profile?.id ?? null
      setDisplayName(profile?.display_name ?? '')
      setStatus(profile?.status ?? null)
      setAvgRating(profile?.avg_rating ?? 0)
      if (!tid) return

      const now = new Date()
      const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      setCurrentMonth(monthLabel)

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10)

      const [upcomingRes, todayRes, monthEarningsRes, lastMonthEarningsRes, completedRes, pendingRes, recentRes] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('trainer_id', tid).eq('status', 'upcoming'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('trainer_id', tid).eq('status', 'upcoming').eq('session_date', todayStr),
        supabase.from('bookings').select('trainer_payout_naira').eq('trainer_id', tid).eq('status', 'completed').gte('created_at', startOfMonth),
        supabase.from('bookings').select('trainer_payout_naira').eq('trainer_id', tid).eq('status', 'completed').gte('created_at', startOfLastMonth).lt('created_at', endOfLastMonth),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('trainer_id', tid).eq('status', 'completed'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('trainer_id', tid).eq('status', 'pending_payment'),
        supabase
          .from('bookings')
          .select('id, status, created_at, updated_at, users!bookings_member_id_fkey(full_name)')
          .eq('trainer_id', tid)
          .order('updated_at', { ascending: false })
          .limit(5),
      ])

      setUpcomingCount(upcomingRes.count ?? 0)
      setTodayCount(todayRes.count ?? 0)

      const thisMonthTotal = (monthEarningsRes.data ?? []).reduce((sum, b) => sum + (b.trainer_payout_naira ?? 0), 0)
      const lastMonthTotal = (lastMonthEarningsRes.data ?? []).reduce((sum, b) => sum + (b.trainer_payout_naira ?? 0), 0)
      setMonthlyEarnings(thisMonthTotal)
      if (lastMonthTotal > 0) {
        setEarningsChange(Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100))
      } else {
        setEarningsChange(null)
      }

      setCompletedCount(completedRes.count ?? 0)
      setPendingCount(pendingRes.count ?? 0)

      // Placeholder deltas — replace with real period comparisons if available
      setRatingChange(0.2)
      setCompletedChange(3)
      setPendingChange(1)

      if (!recentRes.error) {
        const items: ActivityItem[] = (recentRes.data ?? []).map((b) => {
          const name = (b.users as unknown as { full_name: string } | null)?.full_name ?? 'Member'
          const type: ActivityItem['type'] = b.status === 'completed' ? 'completed' : b.status === 'cancelled' ? 'cancelled' : 'booked'
          const action = b.status === 'completed' ? 'session completed' : b.status === 'cancelled' ? 'booking cancelled' : 'booked a session'
          return { id: b.id, name, action, type, time: formatRelativeTime(b.updated_at ?? b.created_at ?? new Date(0).toISOString()) }
        })
        setActivity(items)
      }
    } catch (err) {
      logger.error('trainerDashboard', 'fetchDashboard', err)
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
    if (h < 12) return 'Good morning,'
    if (h < 17) return 'Good afternoon,'
    if (h < 21) return 'Good evening,'
    return 'Hey,'
  })()

  const firstName = (displayName || user?.full_name || 'Trainer').split(' ')[0]

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={{
          paddingHorizontal: 24, paddingTop: 60, paddingBottom: 4,
          flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted }}>
              {greeting}{' '}
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, color: colors.text }}>{firstName}</Text>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, color: colors.green }}>.</Text>
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 8 }}>
              Here's your training overview
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(trainer)/notifications' as any)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1, marginTop: 4,
            })}
          >
            <Bell size={22} color={colors.text} strokeWidth={1.6} />
          </Pressable>
        </View>

        {/* ── Status banners ── */}
        {status === 'pending' && (
          <View style={{
            marginHorizontal: 24, marginTop: 16, padding: 16, borderRadius: 14,
            backgroundColor: '#0D1F17', borderWidth: 1, borderColor: '#00E87A33',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green }} />
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.green }}>Application under review</Text>
            </View>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, lineHeight: 20 }}>
              Your profile has been submitted. Our team will review and approve you shortly — usually within 24–48 hours.
            </Text>
          </View>
        )}

        {status === 'paused' && (
          <View style={{
            marginHorizontal: 24, marginTop: 16, padding: 14, borderRadius: 14,
            backgroundColor: '#FFF9EB', borderWidth: 1, borderColor: '#F6D860',
          }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#92680A', marginBottom: 2 }}>Availability paused</Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#92680A', lineHeight: 19 }}>
              Members can't book you right now. Resume from the Availability tab.
            </Text>
          </View>
        )}

        {/* ── Session mini-cards ── */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 24, marginTop: 22, marginBottom: 12 }}>
          {[
            { label: 'Upcoming Sessions', count: loaded ? upcomingCount : null, sub: 'This week', Icon: CalendarDays },
            { label: "Today's Sessions", count: loaded ? todayCount : null, sub: 'Scheduled', Icon: CalendarClock },
          ].map((card) => (
            <TouchableOpacity
              key={card.label}
              onPress={() => router.push('/(trainer)/bookings' as any)}
              activeOpacity={0.82}
              style={{
                flex: 1, backgroundColor: colors.surface,
                borderRadius: 14, padding: 14,
                borderWidth: 1, borderColor: colors.border,
              }}
            >
              {/* Label */}
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
                {card.label}
              </Text>
              {/* Icon + number + sublabel all on one row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 9,
                  backgroundColor: colors.stone2,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <card.Icon size={16} color={colors.green} strokeWidth={1.8} />
                </View>
                <View>
                  <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, color: colors.text, letterSpacing: -0.5 }}>
                    {card.count === null ? '—' : card.count}
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: colors.textMuted, marginTop: 1 }}>
                    {card.sub}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Monthly Earnings card ── */}
        <TouchableOpacity
          onPress={() => router.push('/(trainer)/earnings' as any)}
          activeOpacity={0.9}
          style={{
            marginHorizontal: 24, marginBottom: 14,
            borderRadius: 18, overflow: 'hidden',
            height: 130,
          }}
        >
          {/* Background image */}
          <Image
            source={DUMBBELL_BG}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          {/* Dark overlay */}
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(5, 10, 7, 0.72)',
          }} />

          {/* Content */}
          <View style={{ flex: 1, padding: 20, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.2 }}>
                Monthly earnings
              </Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12 }}>
                <Text style={{ color: '#FFFFFF' }}>{new Date().toLocaleDateString('en-US', { month: 'long' })} </Text>
                <Text style={{ color: colors.green }}>{new Date().getFullYear()}</Text>
              </Text>
            </View>

            <View>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 32, color: '#FFFFFF', letterSpacing: -0.8 }}>
                {!loaded || monthlyEarnings === null || monthlyEarnings === 0 ? '—' : formatCurrency(monthlyEarnings)}
              </Text>
              {earningsChange !== null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <TrendingUp size={12} color={earningsChange >= 0 ? colors.green : '#FF4444'} strokeWidth={2} />
                  <Text style={{
                    fontFamily: 'DMSans_400Regular', fontSize: 12,
                    color: earningsChange >= 0 ? colors.green : '#FF4444',
                  }}>
                    {earningsChange >= 0 ? '+' : ''}{earningsChange}% from last month
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* ── 3 stats in one card ── */}
        <View style={{
          marginHorizontal: 24, marginBottom: 16,
          backgroundColor: colors.surface,
          borderRadius: 14, borderWidth: 1, borderColor: colors.border,
          flexDirection: 'row',
        }}>
          {[
            { label: 'Average\nRating', value: !loaded ? '—' : avgRating !== null ? avgRating.toFixed(1) : '—', Icon: Star, deltaStr: loaded && ratingChange !== null ? `+${ratingChange}` : null },
            { label: 'Completed\nSessions', value: !loaded ? '—' : completedCount !== null ? String(completedCount) : '—', Icon: CheckCircle2, deltaStr: loaded && completedChange !== null ? `+${completedChange}` : null },
            { label: 'Pending\nRequests', value: !loaded ? '—' : pendingCount !== null ? String(pendingCount) : '—', Icon: Clock3, deltaStr: loaded && pendingChange !== null ? `+${pendingChange}` : null },
          ].map((s, i) => (
            <View key={s.label} style={{ flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 }}>
              {i > 0 && (
                <View style={{
                  position: 'absolute', left: 0, top: '15%', bottom: '15%',
                  width: StyleSheet.hairlineWidth, backgroundColor: colors.border,
                }} />
              )}
              <View style={{
                width: 28, height: 28, borderRadius: 999,
                backgroundColor: colors.stone2,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 6,
              }}>
                <s.Icon size={13} color={colors.green} strokeWidth={1.8} />
              </View>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.text, letterSpacing: -0.3 }}>
                {s.value}
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: colors.textMuted, textAlign: 'center', lineHeight: 13, marginTop: 3 }}>
                {s.label}
              </Text>
              {s.deltaStr ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 5 }}>
                  <ArrowUp size={9} color={colors.green} strokeWidth={2.5} />
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: colors.green }}>
                    {s.deltaStr}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {/* ── Quick actions ── */}
        <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text, marginBottom: 14 }}>
            Quick actions
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { top: 'View', bottom: 'bookings', Icon: CalendarDays, route: '/(trainer)/bookings' as const, accent: false },
              { top: 'Set', bottom: 'availability', Icon: Clock3, route: '/(trainer)/settings' as const, accent: false },
              { top: 'View', bottom: 'earnings', Icon: Banknote, route: '/(trainer)/earnings' as const, accent: true },
            ].map((action) => (
              <TouchableOpacity
                key={action.bottom}
                onPress={() => router.push(action.route)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  backgroundColor: action.accent ? colors.obsidian : colors.surface,
                  borderRadius: 14, paddingVertical: 16, alignItems: 'center', gap: 8,
                  borderWidth: action.accent ? 0 : 1, borderColor: colors.border,
                }}
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 999,
                  backgroundColor: action.accent ? colors.green : colors.stone2,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <action.Icon size={16} color={action.accent ? colors.obsidian : colors.green} strokeWidth={1.8} />
                </View>
                <View style={{ alignItems: 'center', gap: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: action.accent ? 'rgba(255,255,255,0.55)' : colors.textMuted }}>
                    {action.top}
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: action.accent ? colors.chalk : colors.text }}>
                    {action.bottom}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Recent activity ── */}
        <View style={{ paddingHorizontal: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>Recent activity</Text>
            <TouchableOpacity onPress={() => router.push('/(trainer)/bookings' as any)}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.green }}>See all</Text>
            </TouchableOpacity>
          </View>

          {loaded && activity.length === 0 ? (
            <View style={{
              backgroundColor: colors.surface, borderRadius: 16,
              borderWidth: 1, borderColor: colors.border,
              padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16,
            }}>
              <View style={{
                width: 52, height: 52, borderRadius: 14,
                backgroundColor: colors.stone2,
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <CalendarDays size={24} color={colors.green} strokeWidth={1.6} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>No activity yet</Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, lineHeight: 18 }}>
                  Your recent bookings and updates will appear here.
                </Text>
              </View>
            </View>
          ) : (
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: 16, borderWidth: 1, borderColor: colors.border,
              overflow: 'hidden',
            }}>
              {activity.map((item, i) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push({ pathname: '/(trainer)/booking/[id]', params: { id: item.id } })}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    paddingVertical: 13, paddingHorizontal: 16,
                    borderBottomWidth: i < activity.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: colors.stone2,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 12, color: colors.textMuted }}>
                      {initials(item.name)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.text }}>{item.name}</Text>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 1 }}>{item.action}</Text>
                  </View>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textFaint }}>{item.time}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
