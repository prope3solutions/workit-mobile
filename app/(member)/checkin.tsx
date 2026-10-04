import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, ScrollView, Pressable,
  Animated, Dimensions, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import * as Location from 'expo-location'
import { Check, ChevronLeft, Clock } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { native } from '@/lib/anim'
import Svg, { Line, Circle } from 'react-native-svg'
import { useSessionStore } from '@/lib/stores/sessionStore'
import { useMembership } from '@/lib/hooks/useMembership'
import { JoinGymSheet } from '@/components/shared/JoinGymSheet'
import { useWeightStore } from '@/lib/stores/weightStore'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCheckIns, type MemberCheckIn } from '@/lib/hooks/useCheckIns'
import { getDistanceMetres } from '@/lib/utils/distance'
import { logger } from '@/lib/logger'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W - 40

const CHECK_IN_RADIUS_METRES = 150

function formatCheckIn(row: MemberCheckIn) {
  const date = new Date(row.checkedInAt)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (left: Date, right: Date) => left.toDateString() === right.toDateString()

  return {
    id: row.id,
    date: sameDay(date, today)
      ? 'Today'
      : sameDay(date, yesterday)
        ? 'Yesterday'
        : date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
    time: date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }),
  }
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 1)  return `${s}s`
  if (m < 60) return `${m}m ${s.toString().padStart(2, '0')}s`
  const h   = Math.floor(m / 60)
  const rem = m % 60
  return `${h}h ${rem.toString().padStart(2, '0')}m`
}

// ── Grid overlay ──────────────────────────────────────────────────────────────
function CardGrid({ width, height }: { width: number; height: number }) {
  const step = 26
  const lines: React.ReactElement[] = []
  for (let x = step; x < width; x += step)
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />)
  for (let y = step; y < height; y += step)
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />)
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, borderRadius: 22 }}>
      {lines}
      <Circle cx={width * 0.82} cy={-20} r={100} fill="rgba(0,232,122,0.09)" />
      <Circle cx={-20} cy={height + 10} r={70} fill="rgba(255,255,255,0.025)" />
    </Svg>
  )
}

// ── Flippable card (front = member code / back = history or live timer) ───────
function FlipCard({
  status,
  elapsed,
  checkInTime,
  memberCode,
  gymName,
  planName,
  checkIns,
}: {
  status: 'idle' | 'in' | 'out'
  elapsed: number
  checkInTime: Date | null
  memberCode: string
  gymName: string
  planName: string
  checkIns: MemberCheckIn[]
}) {
  const colors = useColors()
  const flipAnim = useRef(new Animated.Value(0)).current
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    if (status === 'in' && !flipped) flip()
  }, [status])

  function flip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const toValue = flipped ? 0 : 1
    Animated.spring(flipAnim, {
      toValue,
      useNativeDriver: native,
      speed: 12,
      bounciness: 4,
    }).start()
    setFlipped(f => !f)
  }

  const frontRotateY = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
  const backRotateY  = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] })
  const frontOp      = flipAnim.interpolate({ inputRange: [0, 0.5, 0.5, 1], outputRange: [1, 1, 0, 0] })
  const backOp       = flipAnim.interpolate({ inputRange: [0, 0.5, 0.5, 1], outputRange: [0, 0, 1, 1] })

  const cardHeight = 220

  return (
    <Pressable onPress={flip} style={{ width: CARD_W, height: cardHeight, marginBottom: 28 }}>
      {/* Front — member code */}
      <Animated.View style={{
        position: 'absolute', width: '100%', height: '100%',
        transform: [{ perspective: 1200 }, { rotateY: frontRotateY }],
        opacity: frontOp,
        backfaceVisibility: 'hidden',
      }}>
        <View style={{
          flex: 1, backgroundColor: colors.obsidian,
          borderRadius: 22, overflow: 'hidden',
        }}>
          <CardGrid width={CARD_W} height={cardHeight} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 }}>
              <View style={{
                borderWidth: 1, borderColor: 'rgba(0,232,122,0.28)', borderRadius: 999,
                paddingHorizontal: 8, paddingVertical: 3,
                backgroundColor: 'rgba(0,232,122,0.08)',
              }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: colors.green }}>
                  {status === 'in' ? 'In session' : 'Active'}
                </Text>
              </View>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: 'rgba(245,245,240,0.35)' }}>
                {gymName} · {planName}
              </Text>
            </View>
            <Text style={{
              fontFamily: 'DMMono_400Regular', fontSize: 26,
              color: colors.chalk, letterSpacing: 4, textAlign: 'center',
            }}>
              {memberCode}
            </Text>
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', width: '100%', marginTop: 24, marginBottom: 14 }} />
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: 'rgba(245,245,240,0.28)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
              Active Member · Tap to flip
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Back — live timer (if in) or history */}
      <Animated.View style={{
        position: 'absolute', width: '100%', height: '100%',
        transform: [{ perspective: 1200 }, { rotateY: backRotateY }],
        opacity: backOp,
        backfaceVisibility: 'hidden',
      }}>
        <View style={{
          flex: 1, backgroundColor: colors.obsidian,
          borderRadius: 22, overflow: 'hidden', padding: 22,
        }}>
          {status === 'in' && checkInTime ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: 'rgba(0,232,122,0.12)',
                alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                <Clock size={20} color={colors.green} strokeWidth={2} />
              </View>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: 'rgba(245,245,240,0.38)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                Time at gym
              </Text>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 38, letterSpacing: -0.76, color: colors.chalk }}>
                {formatElapsed(elapsed)}
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: 'rgba(245,245,240,0.35)', marginTop: 8 }}>
                Checked in at {checkInTime.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: 'rgba(245,245,240,0.2)', marginTop: 14, letterSpacing: 0.6 }}>
                Tap to flip back
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: 'rgba(245,245,240,0.38)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                Recent check-ins
              </Text>
              {checkIns.slice(0, 4).map(formatCheckIn).map((ci, i) => (
                <View key={ci.id} style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingVertical: 8,
                  borderTopWidth: i > 0 ? 1 : 0, borderTopColor: 'rgba(255,255,255,0.06)',
                }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: i === 0 ? colors.chalk : 'rgba(245,245,240,0.5)' }}>
                    {ci.date}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 11, color: 'rgba(245,245,240,0.4)' }}>{ci.time}</Text>
                  </View>
                </View>
              ))}
              {checkIns.length === 0 && (
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: 'rgba(245,245,240,0.4)', textAlign: 'center', marginTop: 28 }}>
                  Your first check-in will appear here.
                </Text>
              )}
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: 'rgba(245,245,240,0.2)', textAlign: 'center', marginTop: 8, letterSpacing: 0.6 }}>
                Tap to flip back
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function CheckInScreen() {
  const colors = useColors()
  const { membership } = useMembership()
  const user = useAuthStore((state) => state.user)
  const { checkIns, loading: historyLoading, error: historyError, createCheckIn } = useCheckIns(
    membership?.gymId,
    membership?.id,
  )
  const canCheckIn = membership?.hasAccess ?? false
  const isExpired = membership?.displayStatus === 'expired'
  const [showJoinSheet, setShowJoinSheet] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkInError, setCheckInError] = useState<string | null>(null)
  const { status, checkInTime, elapsed, sessionDuration,
    setStatus, setCheckInTime, setElapsed, setSessionDuration, reset } = useSessionStore()
  const memberCode = user ? `WKT-${user.id.slice(0, 8).toUpperCase()}` : 'WKT-MEMBER'
  const gymName = membership?.gymName ?? 'Your gym'
  const planName = membership?.planName ?? 'Membership'

  const overlayOp  = useRef(new Animated.Value(0)).current
  const ringScale  = useRef(new Animated.Value(0)).current
  const ringOp     = useRef(new Animated.Value(0)).current
  const contentOp  = useRef(new Animated.Value(0)).current
  const contentY   = useRef(new Animated.Value(20)).current
  const btnScale   = useRef(new Animated.Value(1)).current

  // On mount: restore anim values if session already active (no slide-in — avoids blank flash)
  useEffect(() => {
    if (status === 'in' || status === 'out') {
      overlayOp.setValue(0)
      ringScale.setValue(1)
      ringOp.setValue(1)
      contentOp.setValue(1)
      contentY.setValue(0)
    }
  }, [])

  useEffect(() => {
    if (status !== 'in') return
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [status])

  function animateIn() {
    overlayOp.setValue(1)
    ringScale.setValue(0)
    ringOp.setValue(0)
    contentOp.setValue(0)
    contentY.setValue(20)

    Animated.sequence([
      Animated.timing(overlayOp, { toValue: 0, duration: 320, useNativeDriver: native }),
      Animated.parallel([
        Animated.spring(ringScale, { toValue: 1, useNativeDriver: native, speed: 14, bounciness: 12 }),
        Animated.timing(ringOp, { toValue: 1, duration: 220, useNativeDriver: native }),
      ]),
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(contentOp, { toValue: 1, duration: 280, useNativeDriver: native }),
        Animated.spring(contentY, { toValue: 0, useNativeDriver: native, speed: 20, bounciness: 4 }),
      ]),
    ]).start(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    })
  }

  async function handleCheckIn() {
    if (!membership || checkingIn) return

    setCheckingIn(true)
    setCheckInError(null)

    try {
      if (membership.gymLatitude == null || membership.gymLongitude == null) {
        throw new Error('GYM_LOCATION_MISSING')
      }

      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        throw new Error('LOCATION_PERMISSION_DENIED')
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })
      const distance = getDistanceMetres(
        current.coords.latitude,
        current.coords.longitude,
        membership.gymLatitude,
        membership.gymLongitude,
      )

      if (distance > CHECK_IN_RADIUS_METRES) {
        logger.info('check-in', 'outside-radius', {
          gymId: membership.gymId,
          distanceMetres: Math.round(distance),
        })
        throw new Error('OUTSIDE_GYM_RADIUS')
      }

      const created = await createCheckIn()
      const checkedInAt = new Date(created.checkedInAt)
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setCheckInTime(checkedInAt)
      setElapsed(0)
      setStatus('in')
      animateIn()
    } catch (cause) {
      logger.error('check-in', 'create', cause)
      const code = cause instanceof Error ? cause.message : ''
      setCheckInError(
        code === 'LOCATION_PERMISSION_DENIED'
          ? 'Location access is required to verify that you are at the gym.'
          : code === 'OUTSIDE_GYM_RADIUS'
            ? `You need to be within ${CHECK_IN_RADIUS_METRES} metres of the gym to check in.`
            : code === 'GYM_LOCATION_MISSING'
              ? 'This gym has not finished setting up its check-in location. Please ask the front desk for help.'
              : 'We could not complete your check-in. Check your connection and try again.',
      )
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setCheckingIn(false)
    }
  }

  function handleCheckOut() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 100)
    setSessionDuration(formatElapsed(elapsed))
    setStatus('out')
    useWeightStore.getState().completeSession()

    contentOp.setValue(0)
    contentY.setValue(20)
    ringScale.setValue(0)
    ringOp.setValue(0)

    Animated.sequence([
      Animated.parallel([
        Animated.spring(ringScale, { toValue: 1, useNativeDriver: native, speed: 14, bounciness: 10 }),
        Animated.timing(ringOp, { toValue: 1, duration: 200, useNativeDriver: native }),
      ]),
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(contentOp, { toValue: 1, duration: 260, useNativeDriver: native }),
        Animated.spring(contentY, { toValue: 0, useNativeDriver: native, speed: 20, bounciness: 4 }),
      ]),
    ]).start()
  }

  // No access (expired or never a member) — can't start a check-in.
  // An in-progress session (status 'in'/'out') is still allowed to finish.
  if (!canCheckIn && status === 'idle') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, letterSpacing: -0.44, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
          {isExpired ? 'Membership expired' : 'No active membership'}
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: 32 }}>
          {isExpired
            ? 'Renew your membership to check in again.'
            : 'Join a gym first to check in.'}
        </Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            if (isExpired && membership) {
              setShowJoinSheet(true)
            } else {
              router.push('/(member)/discover')
            }
          }}
          style={({ pressed }) => ({
            height: 52, paddingHorizontal: 32, borderRadius: 14,
            backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.obsidian }}>
            {isExpired ? 'Renew membership' : 'Find a gym'}
          </Text>
        </Pressable>
        {membership && (
          <JoinGymSheet
            visible={showJoinSheet}
            gymId={membership.gymId}
            gymName={membership.gymName}
            onClose={() => setShowJoinSheet(false)}
          />
        )}
      </View>
    )
  }

  // ── Checked-out summary ───────────────────────────────────────────────────────
  if (status === 'out') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Animated.View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: colors.white, opacity: overlayOp, zIndex: 10,
          pointerEvents: 'none',
        }} />

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 48, alignItems: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{
            width: 72, height: 72, borderRadius: 22,
            backgroundColor: colors.obsidian,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
            transform: [{ scale: ringScale }], opacity: ringOp,
            shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.18, shadowRadius: 20, elevation: 10,
          }}>
            <Check size={32} color={colors.chalk} strokeWidth={2.5} />
          </Animated.View>

          <Animated.View style={{ width: '100%', opacity: contentOp, transform: [{ translateY: contentY }], alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 32, letterSpacing: -0.64, color: colors.text, marginBottom: 6, textAlign: 'center' }}>
              Session done.
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.textMuted, marginBottom: 36, textAlign: 'center' }}>
              {checkInTime?.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })} · {gymName}
            </Text>

            <View style={{
              width: '100%', backgroundColor: colors.obsidian, borderRadius: 20,
              padding: 24, marginBottom: 20,
              flexDirection: 'row', alignItems: 'center', gap: 16,
            }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={22} color={colors.green} strokeWidth={2} />
              </View>
              <View>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: 'rgba(245,245,240,0.4)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>Session duration</Text>
                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, letterSpacing: -0.52, color: colors.chalk }}>{sessionDuration}</Text>
              </View>
            </View>

            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 17, letterSpacing: -0.34, color: colors.text, marginBottom: 12, alignSelf: 'flex-start' }}>
              Recent check-ins
            </Text>
            <View style={{ width: '100%', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 28 }}>
              {checkIns.map(formatCheckIn).map((ci, i) => (
                <View key={ci.id} style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border,
                }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: i === 0 ? colors.text : colors.textMuted }}>{ci.date}</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: colors.textMuted }}>{ci.time}</Text>
                  </View>
                </View>
              ))}
              {!historyLoading && checkIns.length === 0 && (
                <Text style={{ padding: 18, fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
                  No earlier check-ins yet.
                </Text>
              )}
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                reset()
                overlayOp.setValue(0)
                ringScale.setValue(0)
                ringOp.setValue(0)
                contentOp.setValue(0)
                contentY.setValue(20)
              }}
              style={({ pressed }) => ({
                width: '100%', height: 54, borderRadius: 16,
                backgroundColor: colors.green,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 10,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.obsidian }}>Check in again</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                reset()
                router.replace('/(member)')
              }}
              style={({ pressed }) => ({
                width: '100%', height: 54, borderRadius: 16,
                backgroundColor: colors.stone2,
                alignItems: 'center', justifyContent: 'center',
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: colors.text }}>Done</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>
    )
  }

  // ── Checked-in state ──────────────────────────────────────────────────────────
  if (status === 'in') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Animated.View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: colors.white, opacity: overlayOp, zIndex: 10,
          pointerEvents: 'none',
        }} />

        {/* Back — dismiss without ending session */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back() }}
          style={({ pressed }) => ({
            position: 'absolute', top: 56, left: 20, zIndex: 20,
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: colors.surface,
            borderWidth: 1, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: pressed ? 0.9 : 1 }],
          })}
        >
          <ChevronLeft size={18} color={colors.text} strokeWidth={2.2} />
        </Pressable>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 40, paddingBottom: 48, alignItems: 'center', justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{
            width: 72, height: 72, borderRadius: 22,
            backgroundColor: colors.green,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
            transform: [{ scale: ringScale }], opacity: ringOp,
            shadowColor: colors.green, shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35, shadowRadius: 20, elevation: 12,
          }}>
            <Check size={34} color={colors.obsidian} strokeWidth={2.8} />
          </Animated.View>

          <Animated.View style={{ width: '100%', opacity: contentOp, transform: [{ translateY: contentY }], alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 32, letterSpacing: -0.64, color: colors.text, marginBottom: 6, textAlign: 'center' }}>
              Checked in.
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.textMuted, marginBottom: 32, textAlign: 'center' }}>
              {checkInTime?.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })} · {gymName}
            </Text>

            <FlipCard
              status={status}
              elapsed={elapsed}
              checkInTime={checkInTime}
              memberCode={memberCode}
              gymName={gymName}
              planName={planName}
              checkIns={checkIns}
            />

            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textFaint, textAlign: 'center', marginBottom: 24 }}>
              Tap the card to see your live session timer
            </Text>

            <Animated.View style={{ width: '100%', transform: [{ scale: btnScale }] }}>
              <Pressable
                onPress={handleCheckOut}
                onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: native, speed: 50, bounciness: 0 }).start()}
                onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: native, speed: 30, bounciness: 4 }).start()}
                style={{
                  height: 56, borderRadius: 16,
                  backgroundColor: colors.green,
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.obsidian }}>
                  Check out
                </Text>
              </Pressable>
            </Animated.View>

            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back() }}
              style={({ pressed }) => ({
                width: '100%', height: 52, borderRadius: 16,
                borderWidth: 1, borderColor: colors.border,
                backgroundColor: colors.surface,
                alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.textMuted }}>
                Back to dashboard
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>
    )
  }

  // ── Idle: pre-check-in ────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 40, paddingBottom: 48, alignItems: 'center', justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back() }}
          style={({ pressed }) => ({
            position: 'absolute', top: 40, left: 20,
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: colors.surface,
            borderWidth: 1, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: pressed ? 0.9 : 1 }],
          })}
        >
          <ChevronLeft size={18} color={colors.text} strokeWidth={2.2} />
        </Pressable>

        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 28, letterSpacing: -0.56, color: colors.text, marginBottom: 6, textAlign: 'center' }}>
          Check In
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, marginBottom: 36, textAlign: 'center' }}>
          Show this at the front desk
        </Text>

        <FlipCard
          status={status}
          elapsed={elapsed}
          checkInTime={checkInTime}
          memberCode={memberCode}
          gymName={gymName}
          planName={planName}
          checkIns={checkIns}
        />

        {(checkInError || historyError) && (
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 19, color: colors.ember, textAlign: 'center', marginBottom: 14 }}>
            {checkInError ?? historyError}
          </Text>
        )}

        <Animated.View style={{ width: '100%', transform: [{ scale: btnScale }] }}>
          <Pressable
            onPress={handleCheckIn}
            disabled={checkingIn}
            onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: native, speed: 50, bounciness: 0 }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: native, speed: 30, bounciness: 4 }).start()}
            style={{
              height: 58, borderRadius: 18,
              backgroundColor: colors.green,
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 10,
              shadowColor: colors.green, shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
              opacity: checkingIn ? 0.7 : 1,
            }}
          >
            {checkingIn
              ? <ActivityIndicator size="small" color={colors.obsidian} />
              : <Check size={18} color={colors.obsidian} strokeWidth={2.8} />}
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 17, color: colors.obsidian, letterSpacing: -0.34 }}>
              {checkingIn ? 'Verifying location...' : 'Check in now'}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  )
}
