import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import {
  Bell,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Megaphone,
  Trophy,
  UserPlus,
  UserRound,
  UsersRound,
} from 'lucide-react-native'
import { useMembership } from '@/lib/hooks/useMembership'
import { useActivityStore } from '@/lib/stores/activityStore'
import { useGymCommunity } from '@/lib/hooks/useGymCommunity'
import { useGymActivity } from '@/lib/hooks/useGymActivity'
import { useConnections } from '@/lib/hooks/useConnections'
import { Avatar } from '@/components/shared/Avatar'
import { useColors, type Colors } from '@/lib/theme/colors'
import { formatDateLong } from '@/lib/utils/formatDate'

type GymSection = 'overview' | 'activities' | 'members' | 'leaderboard'

const SECTIONS: { key: GymSection; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'activities', label: 'Activities' },
  { key: 'members', label: 'Members' },
  { key: 'leaderboard', label: 'Leaderboard' },
]

const styles = StyleSheet.create({
  menuPressable: {
    width: '100%',
    minHeight: 76,
  },
  menuRow: {
    width: '100%',
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  insetDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  activityRow: {
    width: '100%',
    minHeight: 78,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberRow: {
    width: '100%',
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
})

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const colors = useColors()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 17, color: colors.text, letterSpacing: -0.3 }}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.greenDeep }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

function MenuRow({
  Icon,
  title,
  subtitle,
  onPress,
}: {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>
  title: string
  subtitle: string
  onPress?: () => void
}) {
  const colors = useColors()
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.menuPressable, { opacity: pressed ? 0.65 : 1 }]}
    >
      <View style={styles.menuRow}>
        <View style={{ width: 40, height: 40, flexGrow: 0, flexShrink: 0, marginRight: 14, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={colors.text} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text, marginBottom: 3 }}>{title}</Text>
          <Text numberOfLines={2} maxFontSizeMultiplier={1.15} style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 17, color: colors.textMuted }}>{subtitle}</Text>
        </View>
        {onPress ? <ChevronRight size={18} color={colors.textFaint} strokeWidth={1.8} style={{ flexGrow: 0, flexShrink: 0, marginLeft: 10 }} /> : null}
      </View>
    </Pressable>
  )
}

function EmptySection({ Icon, title, body }: {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>
  title: string
  body: string
}) {
  const colors = useColors()
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 28, paddingVertical: 54 }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <Icon size={28} color={colors.textMuted} strokeWidth={1.5} />
      </View>
      <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.text, textAlign: 'center', marginBottom: 8 }}>{title}</Text>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21, color: colors.textMuted, textAlign: 'center' }}>{body}</Text>
    </View>
  )
}

function MembershipSummary({ colors, plan, endDate, daysLeft }: { colors: Colors; plan: string; endDate: string; daysLeft: number }) {
  return (
    <View style={{ borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <View>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>MEMBERSHIP</Text>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.text }}>{plan}</Text>
        </View>
        <View style={{ backgroundColor: `${colors.green}1A`, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: colors.greenDeep }}>Active</Text>
        </View>
      </View>
      <View style={{ height: 5, borderRadius: 999, backgroundColor: colors.surface2, overflow: 'hidden', marginBottom: 10 }}>
        <View style={{ width: `${Math.max(4, Math.min(100, daysLeft / 30 * 100))}%`, height: '100%', backgroundColor: colors.green, borderRadius: 999 }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>Expires {formatDateLong(endDate)}</Text>
        <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: colors.greenDeep }}>{daysLeft} days left</Text>
      </View>
    </View>
  )
}

export default function MyGymScreen() {
  const colors = useColors()
  const insets = useSafeAreaInsets()
  const { membership, loading } = useMembership()
  const { members, leaderboard, loading: communityLoading, error: communityError } = useGymCommunity()
  const { events, loading: activityLoading, error: activityError } = useGymActivity(6)
  const { requestConnection } = useConnections()
  const [connectionTarget, setConnectionTarget] = useState<string | null>(null)
  const activityFade = useRef(new Animated.Value(0)).current
  const [section, setSection] = useState<GymSection>('overview')

  useEffect(() => {
    if (section === 'overview' && !activityLoading) {
      Animated.timing(activityFade, { toValue: 1, duration: 280, useNativeDriver: true }).start()
    }
  }, [activityFade, activityLoading, section])
  const activities = useActivityStore((state) => state.activities)

  const activitySummary = useMemo(() => {
    const entries = Object.values(activities).flat()
    return {
      count: entries.length,
      minutes: entries.reduce((total, item) => total + item.durationMins, 0),
    }
  }, [activities])

  function selectSection(next: GymSection) {
    Haptics.selectionAsync()
    setSection(next)
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    )
  }

  if (!membership) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <EmptySection Icon={Dumbbell} title="You're not in a gym yet" body="Join a gym to unlock its activities, members, announcements and training information." />
        <Pressable
          onPress={() => router.push('/(member)/discover')}
          style={{ height: 54, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginHorizontal: 24 }}
        >
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 15, color: colors.obsidian }}>Find a gym</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
        <View style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <View style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
            <Text numberOfLines={1} maxFontSizeMultiplier={1.12} style={{ fontFamily: 'Syne_700Bold', fontSize: 25, color: colors.text, letterSpacing: -0.5 }}>{membership.gymName}</Text>
          </View>
          <Pressable onPress={() => router.push('/(member)/notifications')} hitSlop={10}>
            <Bell size={21} color={colors.text} strokeWidth={1.8} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 4 }}>
          {SECTIONS.map((item) => {
            const active = section === item.key
            return (
              <Pressable
                key={item.key}
                onPress={() => selectSection(item.key)}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: active ? colors.green : 'transparent' }}
              >
                <Text numberOfLines={1} maxFontSizeMultiplier={1.05} style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: active ? colors.text : colors.textMuted }}>{item.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {section === 'overview' ? (
          <View style={{ gap: 24 }}>
            <View>
              <SectionTitle title="Your membership" />
              <MembershipSummary colors={colors} plan={membership.planName} endDate={membership.endDate} daysLeft={membership.daysLeft} />
            </View>

            <View>
              <SectionTitle title="Training" action="View full plan" onAction={() => router.push('/(member)/activity')} />
              <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                <View style={{ flex: 1, minWidth: 0, minHeight: 104, justifyContent: 'center', padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                  <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: 'Syne_700Bold', fontSize: 24, color: colors.text }}>{activitySummary.count}</Text>
                  <Text numberOfLines={2} maxFontSizeMultiplier={1.15} style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 4 }}>Activities logged</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, minHeight: 104, justifyContent: 'center', padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                  <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: 'Syne_700Bold', fontSize: 24, color: colors.text }}>{activitySummary.minutes}</Text>
                  <Text numberOfLines={2} maxFontSizeMultiplier={1.15} style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 4 }}>Minutes trained</Text>
                </View>
              </View>
            </View>

            <Animated.View style={{ opacity: activityFade }}>
              <SectionTitle title="Recent activity" action="View all" onAction={() => router.push('/(member)/notifications')} />
              <View style={{ borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                {activityLoading ? <ActivityIndicator color={colors.green} style={{ padding: 28 }} /> : null}
                {!activityLoading && events.length === 0 ? <EmptySection Icon={Dumbbell} title="No gym activity yet" body={activityError ?? 'Check-ins and completed workouts will appear here.'} /> : null}
                {!activityLoading && events.map((event, index) => {
                  const completedWorkout = event.eventType === 'workout_completed'
                  return (
                    <View key={event.id} style={[styles.activityRow, { borderBottomWidth: index === events.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                      <Avatar uri={event.actorAvatarUrl} name={event.actorName} size={38} />
                      <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                        <Text numberOfLines={2} maxFontSizeMultiplier={1.15} style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, lineHeight: 18, color: colors.text }}>{event.actorName} {completedWorkout ? 'completed a workout' : 'checked in'}</Text>
                        <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textMuted, marginTop: 3 }}>{new Date(event.createdAt).toLocaleString()}</Text>
                      </View>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: completedWorkout ? colors.amber : colors.green }} />
                    </View>
                  )
                })}
              </View>
            </Animated.View>

            <View>
              <SectionTitle title="Inside your gym" />
              <View style={{ borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                <MenuRow Icon={UsersRound} title="Members" subtitle="Find people who train at your gym" onPress={() => selectSection('members')} />
                <View style={[styles.insetDivider, { backgroundColor: colors.border }]} />
                <MenuRow Icon={Megaphone} title="Updates and announcements" subtitle="Gym news, events and notices" onPress={() => router.push('/(member)/notifications')} />
              </View>
            </View>
          </View>
        ) : null}

        {section === 'activities' ? (
          <View>
            <SectionTitle title="Activities and plan" />
            <View style={{ borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              <MenuRow Icon={ClipboardList} title="Full training plan" subtitle="View your week and update each activity" onPress={() => router.push('/(member)/activity')} />
              <View style={[styles.insetDivider, { backgroundColor: colors.border }]} />
              <MenuRow Icon={Dumbbell} title={`${activitySummary.count} activities logged`} subtitle={`${activitySummary.minutes} total training minutes on this device`} onPress={() => router.push('/(member)/activity')} />
            </View>
          </View>
        ) : null}

        {section === 'members' ? (
          <View>
            <SectionTitle title="Members" />
            <View style={{ borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              {communityLoading ? <ActivityIndicator color={colors.green} style={{ padding: 24 }} /> : null}
              {!communityLoading && members.length === 0 ? <EmptySection Icon={UsersRound} title="No members to show" body={communityError ?? 'Your gym member directory is empty.'} /> : null}
              {!communityLoading && members.map((member, index) => (
                <View key={member.memberId} style={[styles.memberRow, { borderBottomWidth: index === members.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                  <Avatar uri={member.avatarUrl} name={member.fullName} size={40} />
                  <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                    <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>{member.fullName}</Text>
                    <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>{member.nickname ? `@${member.nickname}` : 'WorkIt member'}</Text>
                  </View>
                  <Pressable
                    disabled={connectionTarget === member.memberId}
                    onPress={async () => {
                      setConnectionTarget(member.memberId)
                      try { await requestConnection(member.memberId); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error) } finally { setConnectionTarget(null) }
                    }}
                    hitSlop={8}
                    accessibilityLabel={`Connect with ${member.fullName}`}
                  >
                    {connectionTarget === member.memberId ? <ActivityIndicator size="small" color={colors.green} /> : <UserPlus size={18} color={colors.greenDeep} />}
                  </Pressable>
                </View>
              ))}
            </View>
            <Pressable onPress={() => router.push('/(member)/trainers')} style={{ marginTop: 14, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <UserRound size={20} color={colors.greenDeep} strokeWidth={1.8} />
              <Text style={{ flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>Browse trainers</Text>
              <ChevronRight size={18} color={colors.textFaint} />
            </Pressable>
          </View>
        ) : null}

        {section === 'leaderboard' ? (
          <View>
            <SectionTitle title="Leaderboard" />
            {communityLoading ? <ActivityIndicator color={colors.green} style={{ padding: 48 }} /> : null}
            {!communityLoading && leaderboard.length === 0 ? <EmptySection Icon={Trophy} title="Leaderboard is empty" body={communityError ?? 'Complete a check-in or workout to start building your gym ranking.'} /> : null}
            {!communityLoading && leaderboard.map((entry, index) => (
              <View key={entry.memberId} style={{ minHeight: 76, paddingHorizontal: 16, marginBottom: 8, borderRadius: 16, backgroundColor: index === 0 ? `${colors.green}14` : colors.surface, borderWidth: 1, borderColor: index === 0 ? `${colors.green}55` : colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ width: 24, fontFamily: 'Syne_700Bold', fontSize: 16, color: index < 3 ? colors.greenDeep : colors.textMuted }}>{index + 1}</Text>
                <Avatar uri={entry.avatarUrl} name={entry.fullName} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>{entry.fullName}</Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>{entry.checkinCount} check-ins · {entry.workoutCount} workouts</Text>
                </View>
                {index === 0 ? <Trophy size={18} color={colors.amber} strokeWidth={1.8} /> : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}
